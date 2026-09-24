import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force la racine Turbopack sur le dossier de l'app (pas le dossier parent "docs").
  // process.cwd() est fiable en dev ET au build Vercel (contrairement à __dirname,
  // indéfini quand la config est chargée en ESM → plante le build).
  turbopack: { root: process.cwd() },
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma", "pdf-parse", "mammoth"],
};

export default nextConfig;
