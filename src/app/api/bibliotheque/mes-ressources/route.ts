import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// GET /api/bibliotheque/mes-ressources
// Mes séances et fiches, pour alimenter le formulaire de publication.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const [seances, fiches] = await Promise.all([
    prisma.seance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, filiere: true, module: true, niveau: true },
    }),
    prisma.fiche.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, titre: true, filiere: true, module: true, niveau: true },
    }),
  ]);

  return NextResponse.json({
    seances: seances.map((s) => ({ id: s.id, titre: s.title, filiere: s.filiere, module: s.module, niveau: s.niveau })),
    fiches: fiches.map((f) => ({ id: f.id, titre: f.titre, filiere: f.filiere, module: f.module, niveau: f.niveau })),
  });
}
