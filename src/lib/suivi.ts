import { prisma } from "@/lib/db";

/**
 * Résout les compétences évaluées d'un groupe.
 * - Si le groupe a des compétences explicitement sélectionnées → on retourne celles-ci.
 * - Sinon (groupe legacy / aucune sélection) → repli sur TOUTES les compétences de la filière.
 *
 * Le filtre `module.filiereId` protège contre des sélections orphelines après ré-import.
 */
export async function resolveGroupeCompetences(groupeId: string, filiereId: string) {
  const selections = await prisma.groupeCompetence.findMany({
    where: { groupeId },
    select: { competenceId: true },
  });
  const selectedIds = selections.map((s) => s.competenceId);

  const where =
    selectedIds.length > 0
      ? { id: { in: selectedIds }, module: { filiereId } }
      : { module: { filiereId } };

  const competences = await prisma.competence.findMany({
    where,
    include: { module: { select: { nom: true } } },
    orderBy: { createdAt: "asc" },
  });

  return {
    selectedIds,
    hasSelection: selectedIds.length > 0,
    competences: competences.map((c) => ({ id: c.id, titre: c.titre, moduleNom: c.module.nom })),
  };
}
