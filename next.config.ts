import type { NextConfig } from "next";

import "@/lib/env";

const nextConfig: NextConfig = {
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
