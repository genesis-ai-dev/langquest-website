import {
  getSupabaseCredentials,
  SupabaseEnvironment,
  supabaseInstances
} from '.';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';

interface ClientOptions {
  persistSession?: boolean;
}

export function createBrowserClient(
  environment?: SupabaseEnvironment | null,
  options?: ClientOptions
) {
  console.log(
    '[SUPABASE CLIENT] Creating browser client for environment:',
    environment
  );

  // Default to production if environment is undefined or null
  const env = environment ?? 'production';
  console.log('[SUPABASE CLIENT] Using environment:', env);

  // Create a unique key for this environment and options combination
  const instanceKey = `${env}-${JSON.stringify(options || {})}`;

  // Return existing instance for this environment and options if already created
  const existingInstance = supabaseInstances.get(instanceKey);
  if (existingInstance) {
    console.log(
      '[SUPABASE CLIENT] Returning existing instance for:',
      instanceKey
    );
    return existingInstance;
  }

  const { url, key } = getSupabaseCredentials(env);
  console.log('[SUPABASE CLIENT] Creating new instance with URL:', url);
  console.log('[SUPABASE CLIENT] Key exists:', !!key);
  console.log('[SUPABASE CLIENT] Key length:', key?.length);

  let newInstance;

  // If custom options are provided, use the standard client with auth options
  if (options && options.persistSession !== undefined) {
    console.log(
      '[SUPABASE CLIENT] Creating instance with custom auth options:',
      options
    );
    newInstance = createSupabaseBrowserClient(url, key, {
      auth: {
        persistSession: options.persistSession,
        storage: {
          getItem: (key: string) => sessionStorage.getItem(key),
          setItem: (key: string, value: string) =>
            sessionStorage.setItem(key, value),
          removeItem: (key: string) => sessionStorage.removeItem(key)
        }
      }
    });
  } else {
    // Use the default SSR client for standard behavior
    newInstance = createSupabaseBrowserClient(url, key);
  }

  console.log('[SUPABASE CLIENT] Created new instance for:', instanceKey);

  supabaseInstances.set(instanceKey, newInstance);
  return newInstance;
}
