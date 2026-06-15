import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/referentiel/competences?code=M102
 * GET /api/referentiel/competences?nom=Droit+fondamental
 *
 * Retourne les compétences (toutes — directes + via séquences) pour un RefModule.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const code = req.nextUrl.searchParams.get("code")?.trim();
  const nom = req.nextUrl.searchParams.get("nom")?.trim();

  if (!code && !nom) return NextResponse.json([]);

  const refModule = await prisma.refModule.findFirst({
    where: code
      ? { code: { equals: code, mode: "insensitive" } }
      : { nom: { contains: nom!, mode: "insensitive" } },
    include: {
      competences: {
        select: {
          id: true,
          titre: true,
          objectifs: { select: { titre: true } },
        },
        orderBy: { titre: "asc" },
      },
    },
  });

  if (!refModule) return NextResponse.json([]);

  const competences = refModule.competences.map((c) => ({
    id: c.id,
    titre: c.titre,
    objectifs: c.objectifs.map((o) => o.titre),
  }));

  return NextResponse.json(competences);
}
