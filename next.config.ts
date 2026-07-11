import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma", "pdf-parse", "mammoth"],
  generateBuildId: async () => `build-${Date.now()}`,
  experimental: {
    turbo: {
      moduleIds: "deterministic",
    },
  },
};

export default nextConfig;
