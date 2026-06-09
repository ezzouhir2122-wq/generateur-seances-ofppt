import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

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

  const competences = await prisma.competence.findMany({
    where: { module: { filiereId: groupe.filiere } },
    include: { module: { select: { nom: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    ...groupe,
    filiereNom: filiere?.nom ?? groupe.filiere,
    competences: competences.map((c) => ({
      id: c.id,
      titre: c.titre,
      moduleNom: c.module.nom,
    })),
  });
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
