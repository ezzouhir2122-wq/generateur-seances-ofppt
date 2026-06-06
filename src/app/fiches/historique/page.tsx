import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes fiches pédagogiques</h1>
          <p className="text-gray-500 text-sm mt-1">{fiches.length} fiche{fiches.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/fiches" className="btn-primary text-sm">+ Nouvelle fiche</Link>
      </div>

      {fiches.length === 0 ? (
        <div className="card text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p>Aucune fiche générée pour l&apos;instant.</p>
          <Link href="/fiches" className="mt-4 inline-block text-[#006633] hover:underline text-sm">Créer ma première fiche →</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {fiches.map((fiche) => (
            <Link key={fiche.id} href={`/fiches/${fiche.id}`} className="card block hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 group-hover:text-[#006633] transition-colors">{fiche.titre}</h2>
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
    </div>
  );
}
