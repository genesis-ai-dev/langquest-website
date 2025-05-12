import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { env } from '@/lib/env';
import { getSupabaseCredentials, SupabaseEnvironment } from '.';
import { SupabaseClient } from '@supabase/supabase-js';

// Create a map to store instances for different environments
export const serverInstances = new Map<
  SupabaseEnvironment,
  SupabaseClient<any, 'public', any>
>();

export async function createClient(environment?: SupabaseEnvironment | null) {
  // Default to production if environment is undefined or null
  const env = environment ?? 'production';

  // Return existing instance for this environment if already created
  const existingInstance = serverInstances.get(env);
  if (existingInstance) {
    return existingInstance;
  }

  const cookieStore = await cookies();
  const { url, key } = getSupabaseCredentials(env);

  const newInstance = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      }
    }
  });

  serverInstances.set(env, newInstance);
  return newInstance;
}
