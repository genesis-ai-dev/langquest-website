import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

import '@/lib/env';

const nextConfig: NextConfig = {
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async redirects() {
    return [
      // The LangQuest Next privacy policy now lives on its own site. The app
      // and its store listings still link to /en/next/privacy, so keep this.
      {
        source: '/:locale?/next/privacy',
        destination: 'https://next.langquest.org/privacy',
        permanent: true
      }
    ];
  },
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
