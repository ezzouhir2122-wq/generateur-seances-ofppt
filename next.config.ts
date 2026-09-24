import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Force la racine Turbopack sur CE dossier (l'app), pas le dossier parent "docs".
  // Sans ça, Next choisit le mauvais package-lock.json et le bundling casse
  // (global-error.js / @swc/helpers introuvables → pages bloquées).
  turbopack: { root: __dirname },
  serverExternalPackages: ["bcryptjs", "@prisma/client", "prisma", "pdf-parse", "mammoth"],
};

export default nextConfig;
