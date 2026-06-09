import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const stagiaire = await prisma.stagiaire.findFirst({
    where: { id },
    include: { groupe: { select: { userId: true } } },
  });
  if (!stagiaire || stagiaire.groupe.userId !== session.user.id)
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  await prisma.stagiaire.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
