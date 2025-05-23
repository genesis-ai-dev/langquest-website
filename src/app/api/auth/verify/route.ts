import { env } from '@/lib/env';
import { getSupabaseEnvironment } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { AuthError } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const redirectTo = searchParams.get('redirect_to');

  if (!token || !type) {
    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  }

  const supabase = await createClient(
    getSupabaseEnvironment(searchParams.get('project_ref')!)
  );

  try {
    const {
      error,
      data: { session }
    } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as any
    });

    if (error) {
      throw error;
    }

    // If there's a redirect URL, redirect to it
    if (redirectTo) {
      const parsedRedirectTo = new URL(redirectTo);
      if (parsedRedirectTo.host === new URL(env.NEXT_PUBLIC_SITE_URL).host)
        // verify redirect is to our site
        return NextResponse.redirect(
          `${redirectTo}#access_token=${session?.access_token}&refresh_token=${session?.refresh_token}`
        );
    }

    // Default redirect to home page if no redirect URL is provided
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error: AuthError | unknown) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof AuthError ? error.message : 'Verification failed'
      },
      { status: 400 }
    );
  }
}
