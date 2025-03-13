import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
    // Get the pathname of the request
    const path = request.nextUrl.pathname;

    // Skip middleware if the request is for a static asset or API route
    if (
        path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.startsWith('/static') ||
        path.includes('.') // Skip files with extensions (e.g., .js, .css)
    ) {
        return NextResponse.next();
    }

    // Only run this middleware for admin routes
    if (path.startsWith('/admin')) {
        try {
            // Get the auth cookie from the request
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

            // Create a Supabase client with the cookies from the request
            const supabase = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                },
                global: {
                    headers: {
                        cookie: request.headers.get('cookie') || ''
                    }
                }
            });

            // Get the session from the cookie
            const { data: { session } } = await supabase.auth.getSession();

            // If there's no session, redirect to the login page
            if (!session) {
                console.log('No session found, redirecting to login');

                // Check if we're already coming from the login page to prevent loops
                const referer = request.headers.get('referer') || '';
                if (referer.includes('/login')) {
                    console.log('Already coming from login page, not redirecting to prevent loop');
                    return NextResponse.next();
                }

                // Create a new URL for the login page
                const loginUrl = new URL('/login', request.url);
                // Add the current path as a redirect parameter
                loginUrl.searchParams.set('redirectTo', path);
                // Return a redirect response
                return NextResponse.redirect(loginUrl);
            }

            console.log('Session found, allowing access to admin route');
            return NextResponse.next();
        } catch (error) {
            console.error('Error in middleware:', error);
            // If there's an error, redirect to login as a fallback
            const loginUrl = new URL('/login', request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

// Configure the middleware to run only on admin routes
export const config = {
    matcher: ['/admin', '/admin/:path*']
};