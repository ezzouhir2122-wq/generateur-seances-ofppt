import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import CompetenceManager from "@/components/suivi/CompetenceManager";

export default async function CompetencesPage({ params }: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { groupeId } = await params;

  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, userId: session.user.id },
  });
  if (!groupe) notFound();

  const filiere = await prisma.filiere.findUnique({ where: { id: groupe.filiere }, select: { nom: true } });

  const modules = await prisma.refModule.findMany({
    where: { filiereId: groupe.filiere },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      nom: true,
      code: true,
      competences: { orderBy: { createdAt: "asc" }, select: { id: true, titre: true } },
    },
  });

  const groups = modules
    .filter((m) => m.competences.length > 0)
    .map((m) => ({ moduleId: m.id, moduleNom: m.nom, moduleCode: m.code, competences: m.competences }));

  const selections = await prisma.groupeCompetence.findMany({
    where: { groupeId: groupe.id },
    select: { competenceId: true },
  });
  // Aucune sélection enregistrée → on pré-coche tout (comportement par défaut du suivi).
  const initialSelected =
    selections.length > 0
      ? selections.map((s) => s.competenceId)
      : groups.flatMap((g) => g.competences.map((c) => c.id));

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "#6B7280" }}>
        <Link href="/suivi" className="hover:text-[#0A4DA8] transition-colors">Suivi</Link>
        <span>/</span>
        <Link href={`/suivi/${groupe.id}`} className="hover:text-[#0A4DA8] transition-colors">{groupe.nom}</Link>
        <span>/</span>
        <span style={{ color: "#111827" }}>Compétences</span>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>Compétences à évaluer</h1>
        <p className="mt-1 text-sm" style={{ color: "#0A4DA8" }}>
          {groupe.nom} · {filiere?.nom ?? groupe.filiere}
        </p>
      </div>

      <CompetenceManager groupeId={groupe.id} groups={groups} initialSelected={initialSelected} />
    </div>
  );
}
