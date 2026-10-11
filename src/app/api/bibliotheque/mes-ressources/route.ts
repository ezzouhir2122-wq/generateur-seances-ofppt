import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/bibliotheque/mes-ressources
 *
 * Liste les séances, fiches et évaluations du formateur, en indiquant
 * lesquelles sont déjà publiées dans la bibliothèque.
 *
 * Le rapprochement se fait par `sourceId`, pas par titre : deux séances
 * portant le même intitulé ne se confondent plus.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const userId = session.user.id;

  const [seances, fiches, evaluations, published] = await Promise.all([
    prisma.seance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, filiere: true, module: true, niveau: true, createdAt: true },
    }),
    prisma.fiche.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, titre: true, filiere: true, module: true, niveau: true, createdAt: true },
    }),
    prisma.evaluation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, titre: true, filiere: true, module: true, niveau: true, createdAt: true },
    }),
    prisma.sharedResource.findMany({
      where: { authorId: userId, type: { in: ["SEANCE", "FICHE", "EVALUATION"] } },
      select: { id: true, titre: true, type: true, sourceId: true },
    }),
  ]);

  // sourceId → id de la ressource partagée, par type.
  function indexFor(type: string) {
    return new Map(
      published
        .filter((p) => p.type === type && p.sourceId)
        .map((p) => [p.sourceId as string, p.id]),
    );
  }
  const pubSeances = indexFor("SEANCE");
  const pubFiches = indexFor("FICHE");
  const pubEvals = indexFor("EVALUATION");

  // Rétro-compatibilité : les ressources publiées avant l'ajout de sourceId
  // n'ont que leur titre pour se reconnaître.
  function indexLegacy(type: string) {
    return new Map(
      published
        .filter((p) => p.type === type && !p.sourceId)
        .map((p) => [p.titre, p.id]),
    );
  }
  const legSeances = indexLegacy("SEANCE");
  const legFiches = indexLegacy("FICHE");
  const legEvals = indexLegacy("EVALUATION");

  function decorate(
    item: { id: string; titre: string; filiere: string; module: string; niveau: string; createdAt: Date },
    byId: Map<string, string>,
    byTitre: Map<string, string>,
  ) {
    const sharedId = byId.get(item.id) ?? byTitre.get(item.titre) ?? null;
    return { ...item, isPublished: sharedId !== null, sharedResourceId: sharedId };
  }

  return NextResponse.json({
    seances: seances.map((s) =>
      decorate(
        { id: s.id, titre: s.title, filiere: s.filiere, module: s.module, niveau: s.niveau, createdAt: s.createdAt },
        pubSeances,
        legSeances,
      ),
    ),
    fiches: fiches.map((f) => decorate(f, pubFiches, legFiches)),
    evaluations: evaluations.map((e) => decorate(e, pubEvals, legEvals)),
  });
}
