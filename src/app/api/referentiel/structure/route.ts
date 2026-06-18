import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/referentiel/structure
 * Retourne l'arbre complet : Secteur (Filière) → Filière (Niveau) → RefModule
 * Utilisé par SeanceForm et FicheForm pour les dropdowns cascadés.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const secteurs = await prisma.secteur.findMany({
    orderBy: { nom: "asc" },
    include: {
      filieres: {
        orderBy: { nom: "asc" },
        include: {
          modules: {
            select: { id: true, nom: true, code: true, mhg: true },
            orderBy: { code: "asc" },
          },
        },
      },
    },
  });

  return NextResponse.json({ secteurs });
}
