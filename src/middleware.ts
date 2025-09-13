import createNextIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing'; // Assuming routing exports locales, defaultLocale etc.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize next-intl middleware
// Assumes `routing` object is the configuration for createNextIntlMiddleware
const nextIntlMiddleware = createNextIntlMiddleware(routing);

// CORS configuration for relay endpoint
const allowedOrigins = [
  'http://localhost:3000',
  'https://yourdomain.com' // Replace with your production domain
];

const corsOptions = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With'
};

export default async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();

  // Handle relay endpoint with proper CORS
  if (url.pathname.startsWith('/relay-Mx9k')) {
    const origin = request.headers.get('origin') ?? '';
    const isAllowedOrigin = allowedOrigins.includes(origin) || origin === ''; // Allow same-origin requests

    const hostname = url.pathname.startsWith('/relay-Mx9k/static/')
      ? 'us-assets.i.posthog.com'
      : 'us.i.posthog.com';

    // Handle preflighted requests
    const isPreflight = request.method === 'OPTIONS';

    if (isPreflight) {
      const preflightHeaders = {
        ...(isAllowedOrigin && { 'Access-Control-Allow-Origin': origin }),
        ...corsOptions
      };
      return NextResponse.json({}, { headers: preflightHeaders });
    }

    // Handle simple requests - set up the rewrite
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('host', hostname);

    url.protocol = 'https';
    url.hostname = hostname;
    url.port = '443';
    url.pathname = url.pathname.replace(/^\/relay-Mx9k/, '');

    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders
      }
    });

    // Set CORS headers for the response
    if (isAllowedOrigin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }

    Object.entries(corsOptions).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  }

  console.log('[MIDDLEWARE] Hit. Pathname:', request.nextUrl.pathname);
  console.log('[MIDDLEWARE] Full URL:', request.url);
  console.log(
    '[MIDDLEWARE] Search params:',
    request.nextUrl.searchParams.toString()
  );

  // Special handling for auth verification routes
  if (request.nextUrl.pathname.startsWith('/api/auth/verify')) {
    console.log('[MIDDLEWARE] Auth verify route detected, passing through');
    return NextResponse.next();
  }

  const responseFromIntl = await nextIntlMiddleware(request);
  console.log(
    '[MIDDLEWARE] Response from nextIntlMiddleware for',
    request.nextUrl.pathname,
    ':',
    responseFromIntl.status,
    responseFromIntl.headers.get('location')
  );

  // If next-intl decided to redirect (e.g., for locale prefix), honor that redirect
  if (
    responseFromIntl.headers.has('location') &&
    responseFromIntl.status !== 200
  ) {
    return responseFromIntl;
  }

  // `request.nextUrl.pathname` is now the path after next-intl processing (e.g., locale stripped)
  const currentPathname = request.nextUrl.pathname;

  // Authentication & Authorization logic for /admin routes
  if (currentPathname.startsWith('/admin')) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

      if (!supabaseUrl || !supabaseKey) {
        console.error(
          'Supabase URL or Anon Key is not configured. Auth check for /admin will be skipped.'
        );
        // Potentially redirect to an error page or login, or allow through based on policy
        return responseFromIntl; // Proceeding with next-intl's response for now
      }

      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        },
        global: {
          headers: { Cookie: request.headers.get('cookie') || '' }
        }
      });

      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          'Error getting session for /admin:',
          sessionError.message
        );
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      if (!session) {
        console.log('No session found for /admin, redirecting to login');
        const referer = request.headers.get('referer') || '';
        // Prevent redirect loop if already coming from /login
        if (new URL(referer, request.url).pathname.includes('/login')) {
          console.log(
            'Already coming from login page, not redirecting to prevent loop. Allowing current request to proceed.'
          );
          return responseFromIntl;
        }

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirectTo', currentPathname);
        return NextResponse.redirect(loginUrl);
      }

      console.log(
        'Session found, allowing access to /admin route:',
        currentPathname
      );
      return responseFromIntl; // Session exists, proceed with next-intl's response
    } catch (error) {
      console.error('Error in admin auth middleware:', error);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl); // Fallback redirect to login
    }
  }

  // For non-admin paths, or if admin auth passed, return next-intl's response
  return responseFromIntl;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next (internal files)
     * - static files (e.g. /favicon.ico)
     * - ingest (PostHog ingestion)
     */
    '/((?!api|static|relay-Mx9k|.*\\..*|_next|ingest|supabase).*)',
    '/relay-Mx9k/:path*'
  ]
};
