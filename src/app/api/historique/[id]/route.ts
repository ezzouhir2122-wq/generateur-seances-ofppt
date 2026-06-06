import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const seance = await prisma.seance.findFirst({ where: { id, userId: session.user.id } });
  if (!seance) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  return NextResponse.json(seance);
}
