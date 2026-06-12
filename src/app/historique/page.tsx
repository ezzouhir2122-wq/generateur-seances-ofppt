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
      <div className="flex items-center justify-between mb-8 pb-6" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#111827" }}>Mes séances</h1>
          <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
            {seances.length} séance{seances.length !== 1 ? "s" : ""} générée{seances.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/seances" className="btn-primary text-sm">
          + Nouvelle séance
        </Link>
      </div>

      {seances.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 gap-3" style={{ borderStyle: "dashed", borderColor: "#E2E8F0" }}>
          <div className="text-4xl">📄</div>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>Aucune séance sauvegardée pour l&apos;instant</p>
          <Link href="/seances" className="btn-primary text-sm mt-2">
            Générer ma première séance
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {seances.map((s) => (
            <Link
              key={s.id}
              href={`/historique/${s.id}`}
              className="card flex items-center justify-between group transition-all duration-200"
              style={{ borderColor: "#E2E8F0" }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#0A4DA840")}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.borderColor = "#E2E8F0")}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: "#0A4DA814", color: "#0A4DA8" }}
                >
                  {s.filiere.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold group-hover:text-[#0A4DA8] transition-colors" style={{ color: "#111827" }}>
                    {s.title}
                  </p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>{typeLabel[s.type] ?? s.type}</span>
                    <span className="text-xs" style={{ color: "#4B5563" }}>·</span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>{s.duree}</span>
                    <span className="text-xs" style={{ color: "#4B5563" }}>·</span>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {new Date(s.createdAt).toLocaleDateString("fr-MA", {
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
    </div>
  );
}
