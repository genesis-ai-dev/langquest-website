import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import '@/lib/env';

const nextConfig: NextConfig = {
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*'
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*'
      },
      {
        source: '/auth/v1/verify/:project-ref/:path*',
        destination: 'https://:project-ref.supabase.co/auth/v1/verify/:path*'
      }
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
