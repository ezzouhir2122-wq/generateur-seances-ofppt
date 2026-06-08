import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function HistoriquePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let seances: {
    id: string;
    title: string;
    filiere: string;
    module: string;
    type: string;
    duree: string;
    createdAt: Date;
  }[] = [];

  try {
    seances = await prisma.seance.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        filiere: true,
        module: true,
        type: true,
        duree: true,
        createdAt: true,
      },
    });
  } catch {
    // DB non configurée
  }

  const typeLabel: Record<string, string> = {
    theorique: "Cours théorique",
    tp: "Travaux Pratiques",
    ta: "Travaux d'Application",
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes séances</h1>
          <p className="text-gray-500 text-sm mt-1">
            {seances.length} séance{seances.length !== 1 ? "s" : ""} générée{seances.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/seances" className="btn-primary text-sm">
          + Nouvelle séance
        </Link>
      </div>

      {seances.length === 0 ? (
        <div className="card border-dashed border-2 border-gray-200 bg-gray-50/50 flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-4xl">📄</div>
          <p className="text-gray-400 text-sm">Aucune séance sauvegardée pour l'instant</p>
          <Link href="/seances" className="btn-primary text-sm mt-2">
            Générer ma première séance
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {seances.map((s) => (
            <Link
              key={s.id}
              href={`/historique/${s.id}`}
              className="card hover:shadow-md hover:border-ofppt-green/20 transition-all duration-200 flex items-center justify-between group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-ofppt-green/10 flex items-center justify-center text-ofppt-green font-bold text-sm shrink-0">
                  {s.filiere.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 group-hover:text-ofppt-green transition-colors">
                    {s.title}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs text-gray-500">{typeLabel[s.type] ?? s.type}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{s.duree}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">
                      {new Date(s.createdAt).toLocaleDateString("fr-MA", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-gray-300 group-hover:text-ofppt-green transition-colors text-lg">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
