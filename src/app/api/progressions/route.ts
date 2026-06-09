import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { stagiaireId, competenceId, pourcentage } = await req.json();
  if (!stagiaireId || !competenceId || typeof pourcentage !== "number")
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  if (pourcentage < 0 || pourcentage > 100)
    return NextResponse.json({ error: "Pourcentage doit être entre 0 et 100" }, { status: 400 });

  const stagiaire = await prisma.stagiaire.findFirst({
    where: { id: stagiaireId },
    include: { groupe: { select: { userId: true } } },
  });
  if (!stagiaire || stagiaire.groupe.userId !== session.user.id)
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  const progression = await prisma.progressionCompetence.upsert({
    where: { stagiaireId_competenceId: { stagiaireId, competenceId } },
    update: { pourcentage, source: "manuel" },
    create: { stagiaireId, competenceId, pourcentage, source: "manuel" },
  });

  return NextResponse.json(progression);
}
