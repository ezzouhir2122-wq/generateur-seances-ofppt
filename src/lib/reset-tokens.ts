import crypto from "crypto";

/** Génère un jeton en clair (pour l'URL) et son empreinte SHA-256 (pour la base). */
export function generateToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

/** Empreinte SHA-256 d'un jeton reçu, pour comparaison avec la base. */
export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
