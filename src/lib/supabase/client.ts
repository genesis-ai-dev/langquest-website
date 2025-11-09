import {
  getSupabaseCredentials,
  SupabaseEnvironment,
  supabaseInstances
} from '.';
import { createClient } from '@supabase/supabase-js';

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
    // Verify the cached instance has the correct URL
    const cachedUrl = (existingInstance as any).supabaseUrl || 'unknown';
    const { url: expectedUrl } = getSupabaseCredentials(env);

    console.log('[SUPABASE CLIENT] Returning existing instance for:', env);
    console.log('[SUPABASE CLIENT] Cached instance URL:', cachedUrl);
    console.log('[SUPABASE CLIENT] Expected URL:', expectedUrl);

    // If the cached instance has the wrong URL, clear it and create a new one
    if (cachedUrl !== expectedUrl && cachedUrl !== `${expectedUrl}/`) {
      console.error(
        '[SUPABASE CLIENT] ERROR: Cached instance has wrong URL!',
        'Expected:',
        expectedUrl,
        'Got:',
        cachedUrl,
        'Clearing cache and creating new instance'
      );
      supabaseInstances.delete(env);
      // Fall through to create a new instance
    } else {
      return existingInstance;
    }
  }

  const { url, key } = getSupabaseCredentials(env);
  console.log('[SUPABASE CLIENT] Creating new instance with URL:', url);
  console.log('[SUPABASE CLIENT] Key exists:', !!key);
  console.log('[SUPABASE CLIENT] Key length:', key?.length);

  // Use createClient directly instead of createBrowserClient to ensure
  // the URL and key we pass are actually used (not overridden by env vars)
  const newInstance = createClient(url, key, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });

  // Verify the instance was created with the correct URL
  const instanceUrl = (newInstance as any).supabaseUrl || 'unknown';
  console.log('[SUPABASE CLIENT] Created new instance for:', env);
  console.log('[SUPABASE CLIENT] Instance URL:', instanceUrl);

  if (env === 'preview' && !instanceUrl.includes('yjgdgsycxmlvaiuynlbv')) {
    console.error(
      '[SUPABASE CLIENT] ERROR: Created preview instance but URL is:',
      instanceUrl
    );
  }
  if (env === 'production' && !instanceUrl.includes('unsxkmlcyxgtgmtzfonb')) {
    console.error(
      '[SUPABASE CLIENT] ERROR: Created production instance but URL is:',
      instanceUrl
    );
  }

  supabaseInstances.set(env, newInstance);
  return newInstance;
}
