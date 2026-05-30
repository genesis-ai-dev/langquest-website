import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import '@/lib/env';

const nextConfig: NextConfig = {
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      /** Remove ingest routes after migration to relay endpoints in middleware.ts */
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*'
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*'
      },
      {
        source: '/supabase/:project/:path*',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*`
      }
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);

import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

// OpenNext docs call this unconditionally; we gate on development because
// next.config is also loaded during `next build`, where Miniflare fails (SQLITE_READONLY).
if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}
