import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Creates a static export
  images: {
    unoptimized: true, // Required for static export
  },
  trailingSlash: true, // Adds trailing slashes to URLs
};

export default nextConfig;
