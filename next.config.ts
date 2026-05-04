import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const baseConfig: NextConfig = {
  // Silence Turbopack warning when no turbopack config is present
  turbopack: {},
};

// Only apply next-pwa wrapper in production to avoid webpack/Turbopack conflict
let nextConfig: NextConfig = baseConfig;

if (!isDev) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const withPWA = require("next-pwa")({
    dest: "public",
    register: true,
    skipWaiting: true,
  });
  nextConfig = withPWA(baseConfig);
}

export default nextConfig;
