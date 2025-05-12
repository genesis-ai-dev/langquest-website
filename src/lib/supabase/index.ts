import { env } from '@/lib/env';
import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseEnvironment = 'production' | 'preview' | 'development';

export const getSupabaseCredentials = (environment: SupabaseEnvironment) => {
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

export const getSupabaseEnvironment = (url: string) => {
  const previewUrl = getSupabaseCredentials('preview').url;
  const developmentUrl = getSupabaseCredentials('development').url;

  if (url.startsWith(developmentUrl)) return 'development';
  if (url.startsWith(previewUrl)) return 'preview';
  return 'production';
};

// Create a map to store instances for different environments
export const supabaseInstances = new Map<
  SupabaseEnvironment,
  SupabaseClient<any, 'public', any>
>();
