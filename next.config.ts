import { withGTConfig } from 'gt-next/config';
import type { NextConfig } from 'next';

import '@/lib/env';

const nextConfig: NextConfig = {
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  rewrites: async () => {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*'
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*'
      }
    ];
  }
};

export default withGTConfig(nextConfig, {
  defaultLocale: 'en'
});
