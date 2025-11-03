import {
  getSupabaseCredentials,
  SupabaseEnvironment,
  supabaseInstances
} from '.';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

export function createBrowserClient(environment?: SupabaseEnvironment | null) {
  console.log(
    '[SUPABASE CLIENT] Creating browser client for environment:',
    environment
  );

  // Default to production if environment is undefined or null
  const env = environment ?? 'production';
  console.log('[SUPABASE CLIENT] Using environment:', env);

  // Return existing instance for this environment if already created
  const existingInstance = supabaseInstances.get(env);
  if (existingInstance) {
    console.log('[SUPABASE CLIENT] Returning existing instance for:', env);
    // Verify the cached instance has the correct URL
    const cachedUrl = (existingInstance as any).supabaseUrl || 'unknown';
    console.log('[SUPABASE CLIENT] Cached instance URL:', cachedUrl);
    return existingInstance;
  }

  const { url, key } = getSupabaseCredentials(env);
  console.log('[SUPABASE CLIENT] Creating new instance with URL:', url);
  console.log('[SUPABASE CLIENT] Key exists:', !!key);
  console.log('[SUPABASE CLIENT] Key length:', key?.length);

  const newInstance = createSupabaseBrowserClient(url, key);
  
  // Verify the instance was created with the correct URL
  const instanceUrl = (newInstance as any).supabaseUrl || 'unknown';
  console.log('[SUPABASE CLIENT] Created new instance for:', env);
  console.log('[SUPABASE CLIENT] Instance URL:', instanceUrl);
  
  if (env === 'preview' && !instanceUrl.includes('yjgdgsycxmlvaiuynlbv')) {
    console.error('[SUPABASE CLIENT] ERROR: Created preview instance but URL is:', instanceUrl);
  }
  if (env === 'production' && !instanceUrl.includes('unsxkmlcyxgtgmtzfonb')) {
    console.error('[SUPABASE CLIENT] ERROR: Created production instance but URL is:', instanceUrl);
  }

  supabaseInstances.set(env, newInstance);
  return newInstance;
}
