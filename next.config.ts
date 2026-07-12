import type { NextConfig } from "next";

// v3 — force fresh Turbopack compilation, no filesystem cache
const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma", "pdf-parse", "mammoth"],
  generateBuildId: async () => `build-${Date.now()}`,
  experimental: {
    turbopackFileSystemCacheForBuild: false,
  },
};

export default nextConfig;
