import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET — liste des commentaires d'une ressource
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;

  const comments = await prisma.resourceComment.findMany({
    where: { resourceId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, authorName: true, contenu: true, createdAt: true, userId: true },
  });

  return NextResponse.json(
    comments.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      contenu: c.contenu,
      createdAt: c.createdAt,
      isMine: c.userId === userId,
    }))
  );
}

// POST — ajouter un commentaire
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;
  const authorName = session.user.name ?? "Formateur";
  const { id } = await params;

  const { contenu } = await req.json();
  if (!contenu?.trim()) return NextResponse.json({ error: "Commentaire vide" }, { status: 400 });

  const resource = await prisma.sharedResource.findUnique({ where: { id }, select: { id: true } });
  if (!resource) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const c = await prisma.resourceComment.create({
    data: { resourceId: id, userId, authorName, contenu: contenu.trim() },
    select: { id: true, authorName: true, contenu: true, createdAt: true },
  });

  return NextResponse.json({ ...c, isMine: true }, { status: 201 });
}
