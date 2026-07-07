import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";
import PageShell from "@/components/ui/PageShell";

export default async function FichesHistoriquePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const fiches = await prisma.fiche.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, titre: true, filiere: true, module: true, duree: true, type: true, niveau: true, createdAt: true },
  });

  const typeLabel: Record<string, string> = { theorique: "Théorique", tp: "TP", ta: "TA" };

  return (
    <PageShell
      title="Mes fiches pédagogiques"
      subtitle={`${fiches.length} fiche${fiches.length !== 1 ? "s" : ""} générée${fiches.length !== 1 ? "s" : ""}`}
      icon="📁"
      breadcrumb={[
        { label: "Accueil", href: "/" },
        { label: "Mes Documents" },
        { label: "Mes fiches" },
      ]}
      action={{ label: "+ Nouvelle fiche", href: "/fiches" }}
    >
      {fiches.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Aucune fiche générée pour l&apos;instant.</p>
          <Link href="/fiches" className="mt-4 inline-block text-[#16A34A] hover:underline text-sm">Créer ma première fiche →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {fiches.map((fiche) => (
            <Link key={fiche.id} href={`/fiches/${fiche.id}`} className="card block hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-[#16A34A] transition-colors">{fiche.titre}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{fiche.filiere}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{typeLabel[fiche.type] ?? fiche.type}</span>
                    <span className="text-xs text-gray-500">{fiche.duree} · {fiche.niveau === "1ere-annee" ? "1ère année" : "2ème année"}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(fiche.createdAt).toLocaleDateString("fr-FR")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
