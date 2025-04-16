import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';

const environments = ['production', 'preview', 'development'] as const;
export type SupabaseEnvironment = (typeof environments)[number];

const getSupabaseCredentials = (environment: SupabaseEnvironment) => {
  switch (environment) {
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
  ReturnType<typeof createBrowserClient>
>();

export function createClient(environment?: SupabaseEnvironment | null) {
  // Default to production if environment is undefined or null
  const env =
    environment && ['production', 'preview'].includes(environment)
      ? (environment as SupabaseEnvironment)
      : 'production';

  // Return existing instance for this environment if already created
  const existingInstance = supabaseInstances.get(env);
  if (existingInstance) {
    return existingInstance;
  }

  const { url, key } = getSupabaseCredentials(env);
  console.log('Initializing Supabase client for environment:', env);
  const newInstance = createBrowserClient(url, key);
  supabaseInstances.set(env, newInstance);
  return newInstance;
}

// Export a default production instance
export const supabase = createClient();
