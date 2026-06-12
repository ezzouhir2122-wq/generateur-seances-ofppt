import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProgressionTable from "@/components/suivi/ProgressionTable";
import { resolveGroupeCompetences } from "@/lib/suivi";

export default async function GroupeDetailPage({ params }: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { groupeId } = await params;

  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, userId: session.user.id },
    include: {
      stagiaires: {
        orderBy: { nom: "asc" },
        include: {
          progressions: { select: { competenceId: true, pourcentage: true, source: true } },
        },
      },
    },
  });
  if (!groupe) notFound();

  const filiere = await prisma.filiere.findUnique({ where: { id: groupe.filiere }, select: { nom: true } });

  const { competences } = await resolveGroupeCompetences(groupe.id, groupe.filiere);

  const filiereNom = filiere?.nom ?? groupe.filiere;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "#6B7280" }}>
        <Link href="/suivi" className="hover:text-[#0A4DA8] transition-colors">Suivi</Link>
        <span>/</span>
        <span style={{ color: "#111827" }}>{groupe.nom}</span>
      </div>

      {/* En-tête */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>{groupe.nom}</h1>
          <p className="mt-1 text-sm" style={{ color: "#0A4DA8" }}>
            {filiereNom} · {groupe.annee}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/suivi/${groupe.id}/competences`}
            className="px-4 py-2 text-sm rounded-xl transition-colors"
            style={{ border: "1px solid #0A4DA840", color: "#0A4DA8", background: "#0A4DA810" }}
          >
            Gérer les compétences
          </Link>
          <Link
            href={`/suivi/${groupe.id}/stagiaires`}
            className="px-4 py-2 text-sm rounded-xl transition-colors"
            style={{ border: "1px solid #E2E8F0", color: "#6B7280" }}
          >
            Gérer les stagiaires
          </Link>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Stagiaires", value: groupe.stagiaires.length },
          { label: "Compétences", value: competences.length },
          {
            label: "Progression moyenne",
            value: (() => {
              const all = groupe.stagiaires.flatMap((s) => s.progressions.map((p) => p.pourcentage));
              return all.length ? `${Math.round(all.reduce((a, b) => a + b, 0) / all.length)}%` : "—";
            })(),
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl p-4" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <p className="text-xl font-bold" style={{ color: "#0A4DA8" }}>{stat.value}</p>
            <p className="text-xs mt-1" style={{ color: "#6B7280" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      <ProgressionTable
        groupeId={groupe.id}
        groupeNom={groupe.nom}
        filiereNom={filiereNom}
        annee={groupe.annee}
        competences={competences}
        initialStagiaires={groupe.stagiaires.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          progressions: s.progressions,
        }))}
      />
    </div>
  );
}
