import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import QuickActionLink from "@/components/ui/QuickActionLink";
import DashboardSuiviWidget from "@/components/suivi/DashboardSuiviWidget";

function KpiRow({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid #17171E" }}>
      <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
      <span className="text-sm font-bold" style={{ color: accent }}>{value}</span>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let seancesCount = 0;
  let fichesCount = 0;
  let modulesCount = 0;
  let groupesCount = 0;
  let stagiairesCount = 0;
  let seancesThisMonth = 0;
  let fichesThisMonth = 0;
  let seancesParFiliere: { filiere: string; _count: { id: number } }[] = [];
  let progressionGlobale = 0;
  let recentSeances: { id: string; title: string; module: string; filiere: string; createdAt: Date }[] = [];
  let recentFiches: { id: string; titre: string; module: string; createdAt: Date }[] = [];
  let allStagiaires: { id: string; nom: string; prenom: string; cne: string | null; createdAt: string; progressions: { competenceId: string; pourcentage: number; source: string }[] }[] = [];
  let topCompetences: { id: string; titre: string; moduleNom: string }[] = [];

  try {
    [seancesCount, fichesCount, modulesCount, groupesCount, stagiairesCount, seancesThisMonth, fichesThisMonth] =
      await Promise.all([
        prisma.seance.count({ where: { userId: uid } }),
        prisma.fiche.count({ where: { userId: uid } }),
        prisma.userModule.count({ where: { userId: uid } }),
        prisma.groupe.count({ where: { userId: uid } }),
        prisma.stagiaire.count({ where: { groupe: { userId: uid } } }),
        prisma.seance.count({ where: { userId: uid, createdAt: { gte: startOfMonth } } }),
        prisma.fiche.count({ where: { userId: uid, createdAt: { gte: startOfMonth } } }),
      ]);

    const filiereGroups = await prisma.seance.groupBy({
      by: ["filiere"],
      where: { userId: uid },
      _count: { id: true },
    });
    seancesParFiliere = filiereGroups
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 5);

    const progressions = await prisma.progressionCompetence.findMany({
      where: { stagiaire: { groupe: { userId: uid } } },
      select: { pourcentage: true },
    });
    progressionGlobale = progressions.length
      ? Math.round(progressions.reduce((sum, p) => sum + p.pourcentage, 0) / progressions.length)
      : 0;

    [recentSeances, recentFiches] = await Promise.all([
      prisma.seance.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: { id: true, title: true, module: true, filiere: true, createdAt: true },
      }),
      prisma.fiche.findMany({
        where: { userId: uid },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, titre: true, module: true, createdAt: true },
      }),
    ]);

    if (groupesCount > 0) {
      const groupesData = await prisma.groupe.findMany({
        where: { userId: uid },
        include: {
          stagiaires: {
            include: { progressions: { select: { competenceId: true, pourcentage: true, source: true } } },
          },
        },
        take: 3,
      });
      allStagiaires = groupesData.flatMap((g) =>
        g.stagiaires.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }))
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

  // Derived values
  const tempsEconomiseMin = seancesCount * 45 + fichesCount * 30;
  const tempsEconomiseLabel =
    tempsEconomiseMin === 0
      ? "0 min"
      : tempsEconomiseMin >= 60
      ? `${Math.floor(tempsEconomiseMin / 60)}h${tempsEconomiseMin % 60 > 0 ? String(tempsEconomiseMin % 60).padStart(2, "0") : ""}`
      : `${tempsEconomiseMin} min`;
  const generationsTotal = seancesCount + fichesCount;
  const activiteMois = seancesThisMonth + fichesThisMonth;
  const topFiliere = seancesParFiliere[0]?.filiere;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const userName = session.user.name?.split(" ")[0] ?? "Formateur";

  const quickActions = [
    { href: "/seances", label: "Nouvelle séance", desc: "Générer une séance pédagogique", accent: "#84CC16", bg: "#84CC1610", icon: "⚡" },
    { href: "/fiches", label: "Nouvelle fiche", desc: "Générer une fiche pédagogique", accent: "#9CA3AF", bg: "#17171E", icon: "📋" },
    { href: "/evaluations", label: "Créer une évaluation", desc: "Générer une évaluation IA", accent: "#9CA3AF", bg: "#17171E", icon: "📝" },
    { href: "/corrections", label: "Correction IA", desc: "Corriger et noter une copie", accent: "#9CA3AF", bg: "#17171E", icon: "✏️" },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">

      {/* ── Header ── */}
      <div className="mb-8 pb-6" style={{ borderBottom: "1px solid #1E1E2C" }}>
        <p className="text-sm mb-1 font-medium" style={{ color: "#84CC16" }}>
          {greeting}, {userName} 👋
        </p>
        <h1 className="text-3xl font-bold text-white">Tableau de bord</h1>
        <p className="mt-1 text-sm" style={{ color: "#6B7280" }}>
          {now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── KPI Groups ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

        {/* Formateur */}
        <div className="rounded-2xl p-5" style={{ background: "#111116", border: "1px solid #84CC1628" }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#84CC1618" }}>
              <svg width="15" height="15" fill="none" stroke="#84CC16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#84CC16" }}>Formateur</p>
              <p className="text-[10px]" style={{ color: "#4B5563" }}>Productivité personnelle</p>
            </div>
          </div>
          <KpiRow label="Séances générées" value={seancesCount} accent="#84CC16" />
          <KpiRow label="Fiches générées" value={fichesCount} accent="#84CC16" />
          <KpiRow label="Modules importés" value={modulesCount} accent="#84CC16" />
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-xs" style={{ color: "#6B7280" }}>Temps économisé</span>
            <span className="text-sm font-bold" style={{ color: "#84CC16" }}>{tempsEconomiseLabel}</span>
          </div>
        </div>

        {/* Direction */}
        <div className="rounded-2xl p-5" style={{ background: "#111116", border: "1px solid #3B82F628" }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#3B82F618" }}>
              <svg width="15" height="15" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#3B82F6" }}>Direction</p>
              <p className="text-[10px]" style={{ color: "#4B5563" }}>Vue globale plateforme</p>
            </div>
          </div>
          <KpiRow
            label="Activité ce mois"
            value={`${activiteMois} génération${activiteMois !== 1 ? "s" : ""}`}
            accent="#3B82F6"
          />
          <KpiRow
            label="Filière principale"
            value={topFiliere ? topFiliere.slice(0, 22) : "—"}
            accent="#3B82F6"
          />
          <KpiRow
            label="Groupes actifs"
            value={groupesCount > 0 ? `${groupesCount} groupe${groupesCount > 1 ? "s" : ""}` : "—"}
            accent="#3B82F6"
          />
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-xs" style={{ color: "#6B7280" }}>Progression globale</span>
            {stagiairesCount > 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "#1E1E2C" }}>
                  <div className="h-1.5 rounded-full" style={{ width: `${progressionGlobale}%`, background: "#3B82F6" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>{progressionGlobale}%</span>
              </div>
            ) : (
              <span className="text-sm font-bold" style={{ color: "#3B82F6" }}>—</span>
            )}
          </div>
        </div>

        {/* IA */}
        <div className="rounded-2xl p-5" style={{ background: "#111116", border: "1px solid #A855F728" }}>
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#A855F718" }}>
              <svg width="15" height="15" fill="#A855F7" viewBox="0 0 24 24">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "#A855F7" }}>Intelligence IA</p>
              <p className="text-[10px]" style={{ color: "#4B5563" }}>Utilisation du moteur IA</p>
            </div>
          </div>
          <KpiRow label="Total générations" value={generationsTotal} accent="#A855F7" />
          <KpiRow label="dont séances" value={seancesCount} accent="#A855F7" />
          <KpiRow label="dont fiches" value={fichesCount} accent="#A855F7" />
          <KpiRow label="Taux de succès" value="100 %" accent="#A855F7" />
          <div className="flex items-center justify-between pt-1.5">
            <span className="text-xs" style={{ color: "#6B7280" }}>Temps moyen / génération</span>
            <span className="text-sm font-bold" style={{ color: "#A855F7" }}>~20 s</span>
          </div>
        </div>
      </div>

      {/* ── Filière chart + Recent activities ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Activité par filière */}
        <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
          <h2 className="font-semibold text-white text-sm mb-5">Activité par filière</h2>
          {seancesParFiliere.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <svg width="32" height="32" fill="none" stroke="#2D2D3A" strokeWidth="1.5" viewBox="0 0 24 24">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
              </svg>
              <p className="text-xs" style={{ color: "#4B5563" }}>Générez des séances pour voir la répartition</p>
            </div>
          ) : (
            <div className="space-y-4">
              {seancesParFiliere.map((f) => {
                const count = f._count.id;
                const pct = seancesCount > 0 ? Math.round((count / seancesCount) * 100) : 0;
                return (
                  <div key={f.filiere}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-medium text-white truncate max-w-[65%]">{f.filiere}</span>
                      <span style={{ color: "#6B7280" }}>{count} séance{count > 1 ? "s" : ""} · {pct}%</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "#1E1E2C" }}>
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg,#84CC16,#65A30D)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activités récentes */}
        <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
          <h2 className="font-semibold text-white text-sm mb-5">Activités récentes</h2>
          {recentSeances.length === 0 && recentFiches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <svg width="32" height="32" fill="none" stroke="#2D2D3A" strokeWidth="1.5" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
              </svg>
              <p className="text-xs" style={{ color: "#4B5563" }}>Aucune activité pour l&apos;instant</p>
              <Link href="/seances" className="text-xs font-medium hover:underline" style={{ color: "#84CC16" }}>
                Générer ma première séance →
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                {recentSeances.map((s) => (
                  <li key={s.id}>
                    <Link href={`/historique/${s.id}`} className="flex items-start gap-2.5 text-sm group" style={{ color: "#9CA3AF" }}>
                      <span className="mt-0.5 shrink-0" style={{ color: "#84CC16" }}>⚡</span>
                      <span className="line-clamp-1 group-hover:text-white transition-colors">
                        {s.title || `${s.filiere} — ${s.module}`}
                      </span>
                    </Link>
                  </li>
                ))}
                {recentFiches.map((f) => (
                  <li key={f.id}>
                    <Link href={`/fiches/${f.id}`} className="flex items-start gap-2.5 text-sm group" style={{ color: "#9CA3AF" }}>
                      <span className="mt-0.5 shrink-0">📋</span>
                      <span className="line-clamp-1 group-hover:text-white transition-colors">
                        {f.titre || f.module}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="flex gap-4 mt-5 pt-4" style={{ borderTop: "1px solid #1E1E2C" }}>
                <Link href="/historique" className="text-xs font-medium hover:underline" style={{ color: "#84CC16" }}>
                  Toutes les séances →
                </Link>
                <Link href="/fiches/historique" className="text-xs font-medium hover:underline" style={{ color: "#9CA3AF" }}>
                  Toutes les fiches →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Quick actions + Suivi widget ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ background: "#111116", border: "1px solid #1E1E2C" }}>
          <h2 className="font-semibold text-white text-sm mb-4">Accès rapide</h2>
          <div className="space-y-2">
            {quickActions.map((item) => (
              <QuickActionLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        <DashboardSuiviWidget
          competences={topCompetences}
          stagiaires={allStagiaires}
          groupesCount={groupesCount}
        />
      </div>
    </div>
  );
}
