import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import StagiairesManager from "@/components/suivi/StagiairesManager";

export default async function StagiairesPage({ params }: { params: Promise<{ groupeId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { groupeId } = await params;

  const groupe = await prisma.groupe.findFirst({
    where: { id: groupeId, userId: session.user.id },
    include: {
      stagiaires: {
        orderBy: { nom: "asc" },
        include: { progressions: { select: { competenceId: true, pourcentage: true, source: true } } },
      },
    },
  });
  if (!groupe) notFound();

  const filiere = await prisma.filiere.findUnique({ where: { id: groupe.filiere }, select: { nom: true } });

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-6 text-sm" style={{ color: "#6B7280" }}>
        <Link href="/suivi" className="hover:text-[#E8651A] transition-colors">Suivi</Link>
        <span>/</span>
        <Link href={`/suivi/${groupe.id}`} className="hover:text-[#E8651A] transition-colors">{groupe.nom}</Link>
        <span>/</span>
        <span style={{ color: "#111827" }}>Stagiaires</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>{groupe.nom}</h1>
          <p className="mt-1 text-sm" style={{ color: "#E8651A" }}>
            {filiere?.nom ?? groupe.filiere} · {groupe.annee}
          </p>
        </div>
      </div>

      <StagiairesManager
        groupeId={groupe.id}
        initialStagiaires={groupe.stagiaires.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          progressions: s.progressions,
        }))}
      />
    </div>
  );
}
