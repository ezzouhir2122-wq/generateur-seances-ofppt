import { auth } from "@/auth";

/**
 * Retourne la session si l'utilisateur est un administrateur, sinon null.
 * À utiliser au début de chaque route/page admin (défense côté serveur,
 * en plus de la garde du middleware).
 */
export async function requireAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") return null;
  return session;
}
