import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

export type SupabaseEnvironment = 'production' | 'preview' | 'development';

const getSupabaseCredentials = (environment: SupabaseEnvironment) => {
  switch (environment) {
    case 'production':
      return {
        url: env.NEXT_PUBLIC_SUPABASE_URL!,
        key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      };
    default:
      return {
        url: env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL!,
        key: env.NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY!
      };
  }
};

export function createClient(environment?: SupabaseEnvironment | null) {
  console.log('creating client for environment', environment);
  const { url, key } = getSupabaseCredentials(environment ?? 'production');
  return createBrowserClient(url, key);
}

export const supabase = createClient();
