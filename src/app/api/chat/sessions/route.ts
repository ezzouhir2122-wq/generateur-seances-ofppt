import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const sessions = await prisma.chatSession.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      messages: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const { domaine } = await req.json();
  const chatSession = await prisma.chatSession.create({
    data: { domaine: domaine ?? "Général", userId: session.user.id },
  });

  return NextResponse.json(chatSession);
}
