import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth-timing";

/**
 * Vérifie les identifiants côté serveur AVANT signIn, pour pouvoir afficher
 * un message distinct selon le statut du compte (en attente / refusé).
 * Ne révèle rien de plus qu'une tentative de connexion : mauvais mot de passe
 * et compte inexistant renvoient tous deux "INVALID".
 */
export async function POST(req: NextRequest) {
  const { email, password } = (await req.json()) as { email?: string; password?: string };
  const clean = (email || "").toLowerCase().trim();
  if (!clean || !password) return NextResponse.json({ result: "INVALID" });

  const user = await prisma.user.findUnique({ where: { email: clean } });
  const ok = await verifyPassword(password, user?.password);
  if (!ok || !user) {
    return NextResponse.json({ result: "INVALID" });
  }
  // Identifiants corrects → on peut révéler le statut au propriétaire du compte
  return NextResponse.json({ result: user.status }); // APPROVED | PENDING | REJECTED
}
