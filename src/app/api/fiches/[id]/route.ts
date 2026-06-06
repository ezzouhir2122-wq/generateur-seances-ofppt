import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const fiche = await prisma.fiche.findFirst({ where: { id, userId: session.user.id } });
  if (!fiche) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });

  return NextResponse.json(fiche);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const fiche = await prisma.fiche.findFirst({ where: { id, userId: session.user.id } });
  if (!fiche) return NextResponse.json({ error: "Fiche introuvable" }, { status: 404 });

  await prisma.fiche.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
