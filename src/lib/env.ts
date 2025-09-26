import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  extends: [vercel()],
  server: {
    AUDIENCE_ID: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_PREVIEW_SERVICE_ROLE_KEY: z.string().min(1).optional()
  },
  client: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_BUCKET: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_PREVIEW_URL: z.string().url(),
    NEXT_PUBLIC_SITE_URL: z.string().url()
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_BUCKET,
    NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_PREVIEW_URL:
      process.env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL
  },
  skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === 'lint'
});

console.log('[ENV] Environment variables loaded:');
console.log('[ENV] NEXT_PUBLIC_SITE_URL:', env.NEXT_PUBLIC_SITE_URL);
console.log('[ENV] NEXT_PUBLIC_SUPABASE_URL:', env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  '[ENV] NEXT_PUBLIC_SUPABASE_ANON_KEY exists:',
  !!env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
console.log(
  '[ENV] NEXT_PUBLIC_SUPABASE_PREVIEW_URL:',
  env.NEXT_PUBLIC_SUPABASE_PREVIEW_URL
);
console.log(
  '[ENV] NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY exists:',
  !!env.NEXT_PUBLIC_SUPABASE_PREVIEW_ANON_KEY
);
