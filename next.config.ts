import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    agentUpgrade: "security",
  },
};

export default nextConfig;
