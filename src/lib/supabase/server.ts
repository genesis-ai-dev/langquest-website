import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseCredentials, SupabaseEnvironment } from '.';
import { SupabaseClient } from '@supabase/supabase-js';

// Create a map to store instances for different environments
export const serverInstances = new Map<
  SupabaseEnvironment,
  SupabaseClient<any, 'public', any>
>();

export async function createClient(environment?: SupabaseEnvironment | null) {
  console.log(
    '[SUPABASE SERVER] Creating client for environment:',
    environment
  );

  // Default to production if environment is undefined or null
  const env = environment ?? 'production';
  console.log('[SUPABASE SERVER] Using environment:', env);

  // Return existing instance for this environment if already created
  const existingInstance = serverInstances.get(env);
  if (existingInstance) {
    console.log('[SUPABASE SERVER] Returning existing instance for:', env);
    return existingInstance;
  }

  const cookieStore = await cookies();
  const { url, key } = getSupabaseCredentials(env);

  console.log('[SUPABASE SERVER] Creating new instance with URL:', url);
  console.log('[SUPABASE SERVER] Key exists:', !!key);
  console.log('[SUPABASE SERVER] Key length:', key?.length);

  const newInstance = createServerClient(url, key, {
    cookies: {
      getAll() {
        const allCookies = cookieStore.getAll();
        console.log(
          '[SUPABASE SERVER] Getting all cookies, count:',
          allCookies.length
        );
        return allCookies;
      },
      setAll(cookiesToSet) {
        try {
          console.log(
            '[SUPABASE SERVER] Setting cookies, count:',
            cookiesToSet.length
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch (error) {
          console.log('[SUPABASE SERVER] Error setting cookies:', error);
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  });

  console.log('[SUPABASE SERVER] Created new instance for:', env);
  serverInstances.set(env, newInstance);
  return newInstance;
}
