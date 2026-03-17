import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Image optimization configuration for Cloudflare Workers
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
