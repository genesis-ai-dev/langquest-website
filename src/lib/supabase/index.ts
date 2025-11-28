import { env } from '@/lib/env';
import { SupabaseClient } from '@supabase/supabase-js';

export type SupabaseEnvironment = 'production' | 'preview' | 'development';

export const getSupabaseCredentials = (environment: SupabaseEnvironment) => {
  console.log(
    '[SUPABASE INDEX] Getting credentials for environment:',
    environment
  );

  switch (environment) {
    case 'development':
      console.log('[SUPABASE INDEX] Returning development credentials');
      // For development, try to use network-accessible URL if available
      // Extract host from NEXT_PUBLIC_SITE_URL (e.g., http://192.168.1.86:3000 -> 192.168.1.86)
      // This allows mobile devices/emulators to connect to local Supabase
      let devUrl = 'http://127.0.0.1:54321';
      try {
        const siteUrl = env.NEXT_PUBLIC_SITE_URL;
        if (siteUrl && !siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) {
          // Extract hostname from site URL (e.g., http://192.168.1.86:3000 -> 192.168.1.86)
          const url = new URL(siteUrl);
          devUrl = `http://${url.hostname}:54321`;
          console.log('[SUPABASE INDEX] Using network-accessible dev URL:', devUrl);
        }
      } catch (e) {
        console.log('[SUPABASE INDEX] Could not parse site URL, using default:', devUrl);
      }
      return {
        url: devUrl,
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
      };
    case 'preview':
      console.log('[SUPABASE INDEX] Returning preview credentials');
      console.log(
        '[SUPABASE INDEX] Preview URL:',
        env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL
      );
      console.log(
        '[SUPABASE INDEX] Preview key exists:',
        !!env.NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY
      );
      return {
        url: env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL!,
        key: env.NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY!
      };
    case 'production':
    default:
      console.log('[SUPABASE INDEX] Returning production credentials');
      console.log(
        '[SUPABASE INDEX] Production URL:',
        env.NEXT_PUBLIC_SUPABASE_URL
      );
      console.log(
        '[SUPABASE INDEX] Production key exists:',
        !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      return {
        url: env.NEXT_PUBLIC_SUPABASE_URL!,
        key: env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      };
  }
};

export const getSupabaseEnvironment = (project_ref?: string | null) => {
  console.log(
    '[SUPABASE INDEX] Getting environment for project_ref:',
    project_ref
  );

  const previewUrl = getSupabaseCredentials('preview').url;
  const developmentUrl = getSupabaseCredentials('development').url;
  const productionUrl = getSupabaseCredentials('production').url;

  console.log('[SUPABASE INDEX] Preview URL:', previewUrl);
  console.log('[SUPABASE INDEX] Development URL:', developmentUrl);
  console.log('[SUPABASE INDEX] Production URL:', productionUrl);

  console.log(
    '[SUPABASE INDEX] Checking if development URL includes project_ref:',
    project_ref && developmentUrl.includes(project_ref)
  );
  console.log(
    '[SUPABASE INDEX] Checking if preview URL includes project_ref:',
    project_ref && previewUrl.includes(project_ref)
  );
  console.log(
    '[SUPABASE INDEX] Checking if production URL includes project_ref:',
    project_ref && productionUrl.includes(project_ref)
  );

  if (project_ref && developmentUrl.includes(project_ref)) {
    console.log('[SUPABASE INDEX] Matched development environment');
    return 'development';
  }
  if (project_ref && previewUrl.includes(project_ref)) {
    console.log('[SUPABASE INDEX] Matched preview environment');
    return 'preview';
  }

  console.log('[SUPABASE INDEX] No match found, defaulting to production');
  return 'production';
};

// Create a map to store instances for different environments and configurations
export const supabaseInstances = new Map<
  string,
  SupabaseClient<any, 'public', any>
>();

// Function to clear all cached Supabase instances
export const clearSupabaseInstances = () => {
  console.log('[Supabase] Clearing all cached instances');
  supabaseInstances.clear();
};

// Remove the default export to prevent accidental usage of production client
