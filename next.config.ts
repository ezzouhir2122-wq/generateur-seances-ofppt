import type { NextConfig } from "next";

// v2 — AppShellV2 actif (sidebar avec Competencia Simulator)
const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma", "pdf-parse", "mammoth"],
  generateBuildId: async () => `build-${Date.now()}`,
};

export default nextConfig;
