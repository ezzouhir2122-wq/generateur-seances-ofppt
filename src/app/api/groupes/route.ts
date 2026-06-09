import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const groupes = await prisma.groupe.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { stagiaires: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const filiereIds = [...new Set(groupes.map((g) => g.filiere))];
  const filieres = await prisma.filiere.findMany({
    where: { id: { in: filiereIds } },
    select: { id: true, nom: true },
  });
  const filiereMap = Object.fromEntries(filieres.map((f) => [f.id, f.nom]));

  return NextResponse.json(
    groupes.map((g) => ({ ...g, filiereNom: filiereMap[g.filiere] ?? g.filiere }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { nom, filiereId, annee } = await req.json();
  if (!nom || !filiereId || !annee)
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  const groupe = await prisma.groupe.create({
    data: { nom, filiere: filiereId, annee, userId: session.user.id },
  });

  return NextResponse.json(groupe, { status: 201 });
}
