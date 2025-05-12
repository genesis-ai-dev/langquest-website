import {
  getSupabaseCredentials,
  SupabaseEnvironment,
  supabaseInstances
} from '.';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

export function createBrowserClient(environment?: SupabaseEnvironment | null) {
  // Default to production if environment is undefined or null
  const env = environment ?? 'production';

  // Return existing instance for this environment if already created
  const existingInstance = supabaseInstances.get(env);
  if (existingInstance) {
    return existingInstance;
  }

  const { url, key } = getSupabaseCredentials(env);
  const newInstance = createSupabaseBrowserClient(url, key);
  supabaseInstances.set(env, newInstance);
  return newInstance;
}

// Export a default production instance
export const supabase = createBrowserClient();
