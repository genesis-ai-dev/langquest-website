import { createEnv } from '@t3-oss/env-nextjs';
import { vercel } from '@t3-oss/env-nextjs/presets-zod';
import { z } from 'zod';

export const env = createEnv({
  extends: [vercel()],
  server: {
    AUDIENCE_ID: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    AUDIO_CONCAT_WORKER_URL: z.string().url().optional(),
    AUDIO_CONCAT_WORKER_TOKEN: z.string().min(1).optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    /** Comma-separated bundle/package IDs (e.g. "com.example.app,com.example.app.preview") */
    APP_IDS: z.string().min(1),
    TEAM_ID: z.string().min(1),
    ANDROID_SHA256_FINGERPRINT: z.string().min(1)
  },
  client: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_BUCKET: z.string().min(1),
    NEXT_PUBLIC_SITE_URL: z.string().url(),
    NEXT_PUBLIC_APP_SCHEME: z.string().min(1).default('langquest')
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_BUCKET: process.env.NEXT_PUBLIC_SUPABASE_BUCKET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_APP_SCHEME: process.env.NEXT_PUBLIC_APP_SCHEME
  },
  skipValidation: !!process.env.CI || process.env.npm_lifecycle_event === 'lint'
});
