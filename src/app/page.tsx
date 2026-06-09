import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import QuickActionLink from "@/components/ui/QuickActionLink";
import DashboardSuiviWidget from "@/components/suivi/DashboardSuiviWidget";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let seancesCount = 0;
  let fichesCount = 0;
  let modulesCount = 0;
  let filieresCount = 0;
  let groupesCount = 0;
  let recentSeances: { id: string; title: string; module: string; filiere: string; createdAt: Date }[] = [];
  let recentFiches: { id: string; titre: string; module: string; createdAt: Date }[] = [];
  let allStagiaires: { id: string; nom: string; prenom: string; cne: string | null; createdAt: string; progressions: { competenceId: string; pourcentage: number; source: string }[] }[] = [];
  let topCompetences: { id: string; titre: string; moduleNom: string }[] = [];

  try {
    [seancesCount, fichesCount, modulesCount, groupesCount] = await Promise.all([
      prisma.seance.count({ where: { userId: session.user.id } }),
      prisma.fiche.count({ where: { userId: session.user.id } }),
      prisma.userModule.count({ where: { userId: session.user.id } }),
      prisma.groupe.count({ where: { userId: session.user.id } }),
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
    if (groupesCount > 0) {
      const groupesData = await prisma.groupe.findMany({
        where: { userId: session.user.id },
        include: {
          stagiaires: {
            include: { progressions: { select: { competenceId: true, pourcentage: true, source: true } } },
          },
        },
        take: 3,
      });
      allStagiaires = groupesData.flatMap((g) =>
        g.stagiaires.map((s) => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
        }))
      );
      if (groupesData[0]) {
        const comps = await prisma.competence.findMany({
          where: { module: { filiereId: groupesData[0].filiere } },
          include: { module: { select: { nom: true } } },
          take: 6,
          orderBy: { createdAt: "asc" },
        });
        topCompetences = comps.map((c) => ({ id: c.id, titre: c.titre, moduleNom: c.module.nom }));
      }
    }
  } catch {}

  const statCards = [
    {
      label: "Modules",
      value: modulesCount,
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
          <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
      ),
      accent: "#84CC16",
      bg: "#84CC1614",
    },
    {
      label: "Générations IA",
      value: seancesCount + fichesCount,
      icon: (
        <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
      ),
      accent: "#84CC16",
      bg: "#84CC1614",
    },
    {
      label: "Séances générées",
      value: seancesCount,
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
        </svg>
      ),
      accent: "#9CA3AF",
      bg: "#17171E",
    },
    {
      label: "Fiches générées",
      value: fichesCount,
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1"/>
        </svg>
      ),
      accent: "#9CA3AF",
      bg: "#17171E",
    },
  ];

  const quickActions = [
    { href: "/seances", label: "Nouvelle séance", desc: "Générer une séance pédagogique", accent: "#84CC16", bg: "#84CC1610", icon: "⚡" },
    { href: "/fiches", label: "Nouvelle fiche", desc: "Générer une fiche pédagogique", accent: "#9CA3AF", bg: "#17171E", icon: "📋" },
    { href: "/assistant", label: "Assistant IA", desc: "Poser une question pédagogique", accent: "#9CA3AF", bg: "#17171E", icon: "🤖" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 pb-6" style={{ borderBottom: "1px solid #1E1E2C" }}>
        <h1 className="text-3xl font-bold text-white">Tableau de bord</h1>
        <p className="mt-1 text-base" style={{ color: "#9CA3AF" }}>Compétencia IA · OFPPT</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl p-5"
            style={{ background: card.bg, border: "1px solid #1E1E2C" }}
          >
            <div className="mb-3" style={{ color: card.accent }}>{card.icon}</div>
            <p className="text-3xl font-bold text-white mb-1">{card.value}</p>
            <p className="text-xs font-medium" style={{ color: "#9CA3AF" }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activités récentes */}
        <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
          <h2 className="font-bold text-white text-base mb-5">Activités récentes</h2>
          {recentSeances.length === 0 && recentFiches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-3xl mb-2">📄</p>
              <p className="text-sm mb-2" style={{ color: "#9CA3AF" }}>Aucune activité pour l&apos;instant</p>
              <Link href="/seances" className="text-xs font-medium hover:underline" style={{ color: "#84CC16" }}>
                Générer ma première séance →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentSeances.map((s) => (
                <li key={s.id}>
                  <Link href={`/historique/${s.id}`} className="flex items-start gap-2.5 text-sm transition-colors group" style={{ color: "#9CA3AF" }}>
                    <span className="mt-0.5 shrink-0 text-xs" style={{ color: "#84CC16" }}>⚡</span>
                    <span className="line-clamp-1 group-hover:text-white transition-colors">{s.title || `${s.filiere} — ${s.module}`}</span>
                  </Link>
                </li>
              ))}
              {recentFiches.map((f) => (
                <li key={f.id}>
                  <Link href={`/fiches/${f.id}`} className="flex items-start gap-2.5 text-sm transition-colors group" style={{ color: "#9CA3AF" }}>
                    <span className="mt-0.5 shrink-0 text-xs" style={{ color: "#9CA3AF" }}>📋</span>
                    <span className="line-clamp-1 group-hover:text-white transition-colors">{f.titre || f.module}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {(recentSeances.length > 0 || recentFiches.length > 0) && (
            <div className="flex gap-4 mt-5 pt-4" style={{ borderTop: "1px solid #1E1E2C" }}>
              <Link href="/historique" className="text-xs font-medium hover:underline" style={{ color: "#84CC16" }}>Toutes les séances →</Link>
              <Link href="/fiches/historique" className="text-xs font-medium hover:underline" style={{ color: "#9CA3AF" }}>Toutes les fiches →</Link>
            </div>
          )}
        </div>

        {/* Statistiques + Accès rapide */}
        <div className="space-y-5">
          {/* Stats */}
          <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
            <h2 className="font-bold text-white text-base mb-4">Statistiques</h2>
            <div className="flex items-end justify-between h-16 gap-2 px-2">
              {[seancesCount, Math.max(fichesCount, 1), modulesCount, filieresCount].map((val, i) => {
                const max = Math.max(seancesCount, fichesCount, modulesCount, filieresCount, 1);
                const height = Math.max((val / max) * 100, 8);
                const colors = ["#84CC16", "#65A30D", "#9CA3AF", "#4B5563"];
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
            <div className="flex justify-between mt-2 px-2 text-[10px]" style={{ color: "#4B5563" }}>
              <span>Séances</span><span>Fiches</span><span>Modules</span><span>Groupes</span>
            </div>
          </div>

          {/* Accès rapide */}
          <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
            <h2 className="font-bold text-white text-base mb-4">Accès rapide</h2>
            <div className="space-y-2">
              {quickActions.map((item) => (
                <QuickActionLink key={item.href} {...item} />
              ))}
            </div>
          </div>

          {/* Suivi des Compétences widget */}
          <DashboardSuiviWidget
            competences={topCompetences}
            stagiaires={allStagiaires}
            groupesCount={groupesCount}
          />
        </div>
      </div>
    </div>
  );
}
