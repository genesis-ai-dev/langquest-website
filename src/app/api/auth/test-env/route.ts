import { env } from '@/lib/env';
import { getSupabaseEnvironment, getSupabaseCredentials } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const project_ref = searchParams.get('project_ref');

  console.log('[TEST ENV] Testing environment detection');
  console.log('[TEST ENV] Project ref:', project_ref);

  const environments = {
    production: getSupabaseCredentials('production'),
    preview: getSupabaseCredentials('preview'),
    development: getSupabaseCredentials('development')
  };

  const detectedEnv = project_ref ? getSupabaseEnvironment(project_ref) : null;

  return NextResponse.json({
    project_ref,
    detected_environment: detectedEnv,
    environments: {
      production: {
        url: environments.production.url,
        key_exists: !!environments.production.key,
        key_length: environments.production.key?.length
      },
      preview: {
        url: environments.preview.url,
        key_exists: !!environments.preview.key,
        key_length: environments.preview.key?.length
      },
      development: {
        url: environments.development.url,
        key_exists: !!environments.development.key,
        key_length: environments.development.key?.length
      }
    },
    env_vars: {
      NEXT_PUBLIC_SITE_URL: env.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PREVIEW_URL: env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY_exists: !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY_exists:
        !!env.NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY
    }
  });
}
