import { env } from '@/lib/env';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseEnvironment = 'production' | 'preview' | 'development';

const getSupabaseCredentials = (environment: SupabaseEnvironment) => {
  switch (environment) {
    case 'development':
      return {
        url: 'http://127.0.0.1:54321',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      };
    case 'preview':
      return {
        url: env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL!,
        key: env.NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY!
      };
    case 'production':
    default:
      return {
        url: env.NEXT_PUBLIC_SUPABASE_URL!,
        key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      };
  }
};

// Create a map to store instances for different environments
const supabaseInstances = new Map<
  SupabaseEnvironment,
  SupabaseClient<any, 'public', any>
>();

export function createBrowserClient(environment?: SupabaseEnvironment | null) {
  // Default to production if environment is undefined or null
  const env = environment ?? 'production';

  // Return existing instance for this environment if already created
  const existingInstance = supabaseInstances.get(env);
  if (existingInstance) {
    return existingInstance;
  }

  const { url, key } = getSupabaseCredentials(env);
  console.log('Initializing Supabase client for environment:', env, url);
  const newInstance = createSupabaseBrowserClient(url, key);
  supabaseInstances.set(env, newInstance);
  return newInstance;
}
