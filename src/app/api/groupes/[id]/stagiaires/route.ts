import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id: groupeId } = await params;
  const groupe = await prisma.groupe.findFirst({ where: { id: groupeId, userId: session.user.id } });
  if (!groupe) return NextResponse.json({ error: "Groupe introuvable" }, { status: 404 });

  const { nom, prenom, cne } = await req.json();
  if (!nom || !prenom)
    return NextResponse.json({ error: "Nom et prénom requis" }, { status: 400 });

  const stagiaire = await prisma.stagiaire.create({
    data: { nom, prenom, cne: cne || null, groupeId },
  });

  return NextResponse.json(stagiaire, { status: 201 });
}
