import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { filiereScope } from "@/lib/referentiel-scope";

/**
 * GET /api/referentiel/competences?moduleId=<id>   ← préféré (sans ambiguïté)
 * GET /api/referentiel/competences?code=M102        ← repli (édition / texte)
 * GET /api/referentiel/competences?nom=Droit+fondamental
 *
 * Retourne les compétences (toutes — directes + via séquences) pour un RefModule.
 *
 * ⚠️ Les codes de module OFPPT (M101, M102…) ne sont PAS uniques entre filières :
 * un `findFirst` par code peut donc renvoyer le module d'une autre filière dès qu'un
 * second référentiel est importé. On résout donc le module par son id unique quand
 * le composant le connaît ; `code`/`nom` ne restent qu'en repli (édition d'une séance
 * sauvegardée où seul le libellé est connu).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const moduleId = req.nextUrl.searchParams.get("moduleId")?.trim();
  const code = req.nextUrl.searchParams.get("code")?.trim();
  const nom = req.nextUrl.searchParams.get("nom")?.trim();

  if (!moduleId && !code && !nom) return NextResponse.json([]);

  const refModule = await prisma.refModule.findFirst({
    where: {
      // On garde le scope par sécurité : un formateur ne lit que ses filières + l'officiel.
      filiere: filiereScope(session.user.id),
      ...(moduleId
        ? { id: moduleId }
        : code
          ? { code: { equals: code, mode: "insensitive" } }
          : { nom: { contains: nom!, mode: "insensitive" } }),
    },
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
