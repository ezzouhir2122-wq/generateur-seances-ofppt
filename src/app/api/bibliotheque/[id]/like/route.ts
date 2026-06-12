import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// POST /api/bibliotheque/[id]/like — bascule le like de l'utilisateur courant
export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const resource = await prisma.sharedResource.findUnique({ where: { id }, select: { id: true } });
  if (!resource) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const existing = await prisma.resourceLike.findUnique({
    where: { resourceId_userId: { resourceId: id, userId } },
  });

  if (existing) {
    await prisma.resourceLike.delete({ where: { id: existing.id } });
  } else {
    await prisma.resourceLike.create({ data: { resourceId: id, userId } });
  }

  const likeCount = await prisma.resourceLike.count({ where: { resourceId: id } });
  return NextResponse.json({ liked: !existing, likeCount });
}
