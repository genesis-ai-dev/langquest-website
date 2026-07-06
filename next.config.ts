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
        source: '/supabase/:project/:path*',
        destination: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/:path*`
      }
    ];
  }
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
