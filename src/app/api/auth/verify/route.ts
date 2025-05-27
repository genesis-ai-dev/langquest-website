import { env } from '@/lib/env';
import { getSupabaseEnvironment } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { AuthError } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[VERIFY ROUTE] Starting verification process');
  console.log('[VERIFY ROUTE] Full URL:', request.url);

  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const redirectTo = searchParams.get('redirect_to');
  const project_ref = searchParams.get('project_ref');

  console.log('[VERIFY ROUTE] Params:', {
    token: token ? `${token.substring(0, 10)}...` : 'null',
    type,
    redirectTo,
    project_ref
  });

  if (!token || !type) {
    console.log('[VERIFY ROUTE] Missing required parameters');
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const environment = getSupabaseEnvironment(project_ref!);
  console.log('[VERIFY ROUTE] Detected environment:', environment);
  console.log(
    '[VERIFY ROUTE] Creating Supabase client for environment:',
    environment
  );

  const supabase = await createClient(environment);

  try {
    console.log('[VERIFY ROUTE] Calling verifyOtp with:', {
      token_hash: `${token.substring(0, 10)}...`,
      type
    });

    const {
      error,
      data: { session }
    } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any
    });

    if (error) {
      console.log('[VERIFY ROUTE] OTP verification error:', error);
      throw error;
    }

    console.log(
      '[VERIFY ROUTE] OTP verification successful, session:',
      session ? 'exists' : 'null'
    );

    // If there's a redirect URL, redirect to it
    if (redirectTo) {
      const parsedRedirectTo = new URL(redirectTo);
      console.log('[VERIFY ROUTE] Redirect URL host:', parsedRedirectTo.host);
      console.log(
        '[VERIFY ROUTE] Site URL host:',
        new URL(env.NEXT_PUBLIC_SITE_URL).host
      );

      if (parsedRedirectTo.host === new URL(env.NEXT_PUBLIC_SITE_URL).host) {
        // verify redirect is to our site
        console.log('[VERIFY ROUTE] Redirecting to:', redirectTo);
        return NextResponse.redirect(
          `${redirectTo}#access_token=${session?.access_token}&refresh_token=${session?.refresh_token}`
        );
      }
    }

    // Default redirect to home page if no redirect URL is provided
    console.log('[VERIFY ROUTE] No redirect URL, redirecting to home');
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error: AuthError | unknown) {
    console.error('[VERIFY ROUTE] Verification error:', error);
    console.error('[VERIFY ROUTE] Error type:', error?.constructor?.name);
    console.error(
      '[VERIFY ROUTE] Error details:',
      JSON.stringify(error, null, 2)
    );

    return NextResponse.json(
      {
        error:
          error instanceof AuthError ? error.message : 'Verification failed'
      },
      { status: 400 }
    );
  }
}
