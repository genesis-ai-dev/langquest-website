import { getSupabaseCredentials, SupabaseEnvironment } from '.';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

export function createBrowserClient(environment: SupabaseEnvironment) {
  const { url, key } = getSupabaseCredentials(environment);

  // Simple client creation without complex cookie manipulation
  return createSupabaseBrowserClient(url, key);
}
