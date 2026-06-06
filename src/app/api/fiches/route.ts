import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const fiches = await prisma.fiche.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, titre: true, filiere: true, module: true, duree: true, type: true, niveau: true, createdAt: true },
  });

  return NextResponse.json(fiches);
}
