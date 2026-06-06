import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const chatSession = await prisma.chatSession.findFirst({
    where: { id, userId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chatSession) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  return NextResponse.json(chatSession);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { id } = await params;
  const chatSession = await prisma.chatSession.findFirst({ where: { id, userId: session.user.id } });
  if (!chatSession) return NextResponse.json({ error: "Session introuvable" }, { status: 404 });

  await prisma.chatSession.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
