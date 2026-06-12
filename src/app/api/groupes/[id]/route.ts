import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { resolveGroupeCompetences } from "@/lib/suivi";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const groupe = await prisma.groupe.findFirst({
    where: { id, userId: session.user.id },
    include: {
      stagiaires: {
        orderBy: { nom: "asc" },
        include: {
          progressions: {
            select: { competenceId: true, pourcentage: true, source: true },
          },
        },
      },
    },
  });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const filiere = await prisma.filiere.findUnique({
    where: { id: groupe.filiere },
    select: { nom: true },
  });

  const { competences, selectedIds } = await resolveGroupeCompetences(groupe.id, groupe.filiere);

  return NextResponse.json({
    ...groupe,
    filiereNom: filiere?.nom ?? groupe.filiere,
    selectedCompetenceIds: selectedIds,
    competences,
  });
}

// PATCH /api/groupes/[id]  — body: { competenceIds: string[] }
// Remplace l'ensemble des compétences sélectionnées du groupe.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const groupe = await prisma.groupe.findFirst({ where: { id, userId: session.user.id } });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const { competenceIds } = await req.json();
  if (!Array.isArray(competenceIds))
    return NextResponse.json({ error: "competenceIds doit être un tableau" }, { status: 400 });

  // On ne garde que les compétences appartenant à la filière du groupe.
  const valides = await prisma.competence.findMany({
    where: { id: { in: competenceIds }, module: { filiereId: groupe.filiere } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.groupeCompetence.deleteMany({ where: { groupeId: groupe.id } }),
    prisma.groupeCompetence.createMany({
      data: valides.map((c) => ({ groupeId: groupe.id, competenceId: c.id })),
      skipDuplicates: true,
    }),
  ]);

  return NextResponse.json({ success: true, count: valides.length });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const groupe = await prisma.groupe.findFirst({ where: { id, userId: session.user.id } });
  if (!groupe) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.groupe.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
