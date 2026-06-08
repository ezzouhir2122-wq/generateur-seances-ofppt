import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let seancesCount = 0;
  let fichesCount = 0;
  let modulesCount = 0;
  let filieresCount = 0;
  let recentSeances: { id: string; title: string; module: string; filiere: string; createdAt: Date }[] = [];
  let recentFiches: { id: string; titre: string; module: string; createdAt: Date }[] = [];

  try {
    [seancesCount, fichesCount, modulesCount] = await Promise.all([
      prisma.seance.count({ where: { userId: session.user.id } }),
      prisma.fiche.count({ where: { userId: session.user.id } }),
      prisma.userModule.count({ where: { userId: session.user.id } }),
    ]);

    const groupes = await prisma.userModule.findMany({
      where: { userId: session.user.id },
      select: { groupe: true },
      distinct: ["groupe"],
    });
    filieresCount = groupes.length;

    [recentSeances, recentFiches] = await Promise.all([
      prisma.seance.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, title: true, module: true, filiere: true, createdAt: true },
      }),
      prisma.fiche.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, titre: true, module: true, createdAt: true },
      }),
    ]);
  } catch {}

  const statCards = [
    {
      label: "Modules",
      value: modulesCount,
      icon: (
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      style: "bg-[#1B3A6E] text-white",
    },
    {
      label: "Générations IA",
      value: seancesCount + fichesCount,
      icon: (
        <svg width="28" height="28" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      style: "bg-[#0B6B72] text-white",
    },
    {
      label: "Séances générées",
      value: seancesCount,
      icon: (
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      ),
      style: "bg-gray-100 text-gray-500",
      valueStyle: "text-gray-800",
    },
    {
      label: "Fiches générées",
      value: fichesCount,
      icon: (
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1"/>
        </svg>
      ),
      style: "bg-gray-100 text-gray-500",
      valueStyle: "text-gray-800",
    },
  ];

  const quickActions = [
    { href: "/seances", label: "Nouvelle séance", desc: "Générer une séance pédagogique", color: "bg-[#0B6B72]/8 hover:bg-[#0B6B72]/15 text-[#0B6B72]", icon: "⚡" },
    { href: "/fiches", label: "Nouvelle fiche", desc: "Générer une fiche pédagogique", color: "bg-[#1B3A6E]/8 hover:bg-[#1B3A6E]/15 text-[#1B3A6E]", icon: "📋" },
    { href: "/assistant", label: "Assistant IA", desc: "Poser une question pédagogique", color: "bg-[#C8A84B]/10 hover:bg-[#C8A84B]/20 text-[#9A7A2B]", icon: "🤖" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-gray-100">
        <h1 className="text-3xl font-bold text-[#1B3A6E]">SIGC-AI</h1>
        <p className="text-gray-400 mt-1 text-lg font-medium">Tableau de bord</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-10">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl p-5 shadow-sm ${card.style}`}>
            <div className="opacity-80 mb-3">{card.icon}</div>
            <p className={`text-4xl font-bold mb-1 ${card.valueStyle ?? ""}`}>{card.value}</p>
            <p className="text-sm font-medium opacity-75">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activités récentes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-bold text-gray-800 text-lg mb-5">Activités récentes</h2>
          {recentSeances.length === 0 && recentFiches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-2">📄</p>
              <p className="text-gray-400 text-sm">Aucune activité pour l&apos;instant</p>
              <Link href="/seances" className="text-[#0B6B72] text-xs font-medium mt-2 inline-block hover:underline">
                Générer ma première séance →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentSeances.map((s) => (
                <li key={s.id}>
                  <Link href={`/historique/${s.id}`} className="flex items-start gap-2.5 text-sm text-gray-600 hover:text-[#0B6B72] transition-colors group">
                    <span className="text-[#0B6B72] mt-1 shrink-0 text-xs">⚡</span>
                    <span className="group-hover:text-[#0B6B72] line-clamp-1">{s.title || `${s.filiere} — ${s.module}`}</span>
                  </Link>
                </li>
              ))}
              {recentFiches.map((f) => (
                <li key={f.id}>
                  <Link href={`/fiches/${f.id}`} className="flex items-start gap-2.5 text-sm text-gray-600 hover:text-[#1B3A6E] transition-colors group">
                    <span className="text-[#1B3A6E] mt-1 shrink-0 text-xs">📋</span>
                    <span className="group-hover:text-[#1B3A6E] line-clamp-1">{f.titre || f.module}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(recentSeances.length > 0 || recentFiches.length > 0) && (
            <div className="flex gap-4 mt-5 pt-4 border-t border-gray-50">
              <Link href="/historique" className="text-[#0B6B72] text-xs font-medium hover:underline">Toutes les séances →</Link>
              <Link href="/fiches/historique" className="text-[#1B3A6E] text-xs font-medium hover:underline">Toutes les fiches →</Link>
            </div>
          )}
        </div>

        {/* Statistiques + Accès rapide */}
        <div className="space-y-6">
          {/* Stats filières */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-lg mb-4">Statistiques</h2>
            <div className="flex items-end justify-between h-20 gap-2 px-2">
              {[seancesCount, Math.max(fichesCount, 1), modulesCount, filieresCount].map((val, i) => {
                const max = Math.max(seancesCount, fichesCount, modulesCount, filieresCount, 1);
                const height = Math.max((val / max) * 100, 8);
                const colors = ["#0B6B72", "#1B3A6E", "#C8A84B", "#9CA3AF"];
                return (
                  <div key={i} className="flex flex-col items-center gap-1 flex-1">
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{ height: `${height}%`, backgroundColor: colors[i] }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 px-2 text-[10px] text-gray-400">
              <span>Séances</span><span>Fiches</span><span>Modules</span><span>Groupes</span>
            </div>
          </div>

          {/* Accès rapide */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-bold text-gray-800 text-base mb-4">Accès rapide</h2>
            <div className="space-y-2">
              {quickActions.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${item.color}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{item.label}</p>
                    <p className="text-[11px] opacity-70">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
