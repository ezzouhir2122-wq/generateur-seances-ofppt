import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/ui/PageShell";

export default async function EvaluationsHistoriquePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let evaluations: {
    id: string;
    titre: string;
    filiere: string;
    module: string;
    type: string;
    niveau: string;
    createdAt: Date;
  }[] = [];

  try {
    evaluations = await prisma.evaluation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        titre: true,
        filiere: true,
        module: true,
        type: true,
        niveau: true,
        createdAt: true,
      },
    });
  } catch {
    // DB non configurée
  }

  const typeLabel: Record<string, string> = {
    cc: "Contrôle Continu",
    efm: "Examen Fin de Module",
    qcm: "QCM",
    exercices: "Exercices pratiques",
    controle: "Contrôle continu",
    examen: "Examen fin de module",
    rattrapage: "Rattrapage",
  };

  return (
    <PageShell
      title="Mes évaluations"
      subtitle={`${evaluations.length} évaluation${evaluations.length !== 1 ? "s" : ""} générée${evaluations.length !== 1 ? "s" : ""}`}
      icon="☑️"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Historique" },
        { label: "Mes évaluations" },
      ]}
      action={{ label: "+ Nouvelle évaluation", href: "/evaluations" }}
    >
      {evaluations.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3" style={{ borderStyle: "dashed", borderColor: "#E2E8F0" }}>
          <div className="text-4xl">📝</div>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>Aucune évaluation sauvegardée pour l&apos;instant</p>
          <Link href="/evaluations" className="btn-primary text-sm mt-2">
            Générer ma première évaluation
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {evaluations.map((e) => (
            <Link
              key={e.id}
              href={`/evaluations/historique/${e.id}`}
              className="card flex items-center justify-between group transition-all duration-200 hover:border-[#0A4DA840]"
              style={{ borderColor: "#E2E8F0" }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: "#0A4DA814", color: "#0A4DA8" }}
                >
                  {e.filiere.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold group-hover:text-[#0A4DA8] transition-colors" style={{ color: "#111827" }}>
                    {e.titre}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>{typeLabel[e.type] ?? e.type}</span>
                    <span className="text-xs" style={{ color: "#4B5563" }}>·</span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>{e.module}</span>
                    <span className="text-xs" style={{ color: "#4B5563" }}>·</span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {new Date(e.createdAt).toLocaleDateString("fr-MA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-lg transition-colors" style={{ color: "#4B5563" }}>→</span>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
