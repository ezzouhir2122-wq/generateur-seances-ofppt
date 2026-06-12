import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/competences?filiereId=xxx
// Renvoie les compétences d'une filière, groupées par module — pour le sélecteur.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const filiereId = req.nextUrl.searchParams.get("filiereId");
  if (!filiereId) return NextResponse.json({ error: "filiereId requis" }, { status: 400 });

  const modules = await prisma.refModule.findMany({
    where: { filiereId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nom: true,
      code: true,
      competences: {
        orderBy: { createdAt: "asc" },
        select: { id: true, titre: true },
      },
    },
  });

  // On ne renvoie que les modules qui ont au moins une compétence
  const groupes = modules
    .filter((m) => m.competences.length > 0)
    .map((m) => ({
      moduleId: m.id,
      moduleNom: m.nom,
      moduleCode: m.code,
      competences: m.competences,
    }));

  return NextResponse.json(groupes);
}
