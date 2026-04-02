import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env';

let browserClient: SupabaseClient | null = null;

export function createBrowserClient() {
  if (browserClient) return browserClient;

  browserClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        detectSessionInUrl: false
      }
    }
  );

  return browserClient;
}
