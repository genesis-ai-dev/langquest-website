import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '../../../../database.types';
import { getSupabaseServerSideCredentials } from '@/lib/supabase';
import { cookies } from 'next/headers';

// const supabaseAdmin = createClient<Database>(
//   // env.NEXT_PUBLIC_SUPABASE_URL,
//   // process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
// );

export async function POST(request: Request) {
  try {
    /*    
    // Removed origin and referer check for now, as it was blocking legitimate requests 
    // Verify origin
    const origin = request.headers.get('origin');
    const referer = request.headers.get('referer');

    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.NEXT_PUBLIC_SITE_URL
    ].filter(Boolean);

    if (origin && !allowedOrigins.includes(origin)) {
      return NextResponse.json(
        { error: `Unauthorized origin: ${origin}` },
        { status: 403 }
      );
    }

    // Verify referer as fallback (for requests without origin)
    if (!origin && referer) {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

      if (!allowedOrigins.includes(refererOrigin)) {
        return NextResponse.json(
          { error: 'Unauthorized referer' },
          { status: 403 }
        );
      }
    }
*/

    // Check if we have the required environment variable at runtime
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 503 }
      );
    }

    const { english_name, native_name, iso639_3, environment } =
      await request.json();

    const { url, key } = getSupabaseServerSideCredentials(environment);

    const cookieStore = await cookies();
    let accessToken: string | undefined;

    const possibleCookieNames = [
      'supabase-auth-token',
      'sb-auth-token',
      `sb-${environment}-auth-token`
    ];

    for (const cookieName of possibleCookieNames) {
      const cookie = cookieStore.get(cookieName);
      if (cookie) {
        try {
          const parsed = JSON.parse(cookie.value);
          accessToken = parsed.access_token;
          break;
        } catch {
          accessToken = cookie.value;
          break;
        }
      }
    }

    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const supabaseAuth = createClient<Database>(url, key);
    const {
      data: { user },
      error: authError
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient<Database>(url, key);

    if (!english_name) {
      return NextResponse.json(
        { error: 'Language name is required' },
        { status: 400 }
      );
    }

    // Generate ISO code if not provided
    const isoCode = iso639_3 || english_name.trim().toLowerCase().slice(0, 3);

    // Check if language already exists with same english_name and iso639_3
    const { data: existingLanguage, error: searchError } = await supabaseAdmin
      .from('language')
      .select()
      .eq('english_name', english_name.trim())
      .eq('iso639_3', isoCode)
      .single();

    // If language already exists, return it instead of creating a new one
    if (existingLanguage && !searchError) {
      return NextResponse.json({
        ...existingLanguage,
        message: 'Language already exists, returning existing record'
      });
    }

    // Insert the new language only if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from('language')
      .insert({
        english_name: english_name.trim(),
        native_name: native_name || english_name.trim(),
        iso639_3: isoCode
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating language:', error);
      return NextResponse.json(
        { error: 'Failed to create language' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...data,
      message: 'Language created successfully'
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
