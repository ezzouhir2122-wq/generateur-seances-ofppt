import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

/* ── Stat Card ── */
function StatCard({
  value, label, trend, iconBg, iconColor, iconPath,
}: {
  value: string | number; label: string; trend?: string;
  iconBg: string; iconColor: string; iconPath: React.ReactNode;
}) {
  return (
    <div style={{
      background: "white", borderRadius: "12px", padding: "20px 22px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      display: "flex", alignItems: "center", gap: "16px",
    }}>
      <div style={{
        width: "52px", height: "52px", borderRadius: "12px",
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <svg width="24" height="24" fill="none" stroke={iconColor} strokeWidth="1.8" viewBox="0 0 24 24">
          {iconPath}
        </svg>
      </div>
      <div>
        <div style={{ fontSize: "10px", fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "2px" }}>
          {label}
        </div>
        <div style={{ fontSize: "26px", fontWeight: 700, color: "#111827", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          {value}
        </div>
        {trend && (
          <div style={{ fontSize: "11px", color: "#22C55E", fontWeight: 500, marginTop: "3px" }}>
            ↑ {trend}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Recent item row ── */
function RecentRow({
  href, icon, title, subtitle, badge, badgeColor, date,
}: {
  href: string; icon: string; title: string; subtitle?: string;
  badge?: string; badgeColor?: string; date?: string;
}) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderBottom: "1px solid #F3F4F6", textDecoration: "none" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#F9FAFB", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: "11px", color: "#6B7280", marginTop: "1px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {badge && (
          <span style={{
            fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "99px",
            background: badgeColor ? `${badgeColor}18` : "#F0FDF4",
            color: badgeColor || "#22C55E",
            border: `1px solid ${badgeColor ? `${badgeColor}35` : "#BBF7D0"}`,
          }}>
            {badge}
          </span>
        )}
        {date && <span style={{ fontSize: "11px", color: "#9CA3AF" }}>{date}</span>}
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const uid = session.user.id;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let seancesCount = 0, fichesCount = 0, modulesCount = 0, groupesCount = 0, stagiairesCount = 0;
  let seancesThisMonth = 0, fichesThisMonth = 0;
  let seancesParFiliere: { filiere: string; _count: { id: number } }[] = [];
  let recentSeances: { id: string; title: string; module: string; filiere: string; createdAt: Date }[] = [];
  let recentFiches: { id: string; titre: string; module: string; createdAt: Date }[] = [];
  let allStagiaires: { id: string; nom: string; prenom: string; cne: string | null; createdAt: string; progressions: { competenceId: string; pourcentage: number; source: string }[] }[] = [];
  let topCompetences: { id: string; titre: string; moduleNom: string }[] = [];
  let monthlyData: { name: string; seances: number; fiches: number }[] = [];

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
    seancesParFiliere = filiereGroups.sort((a, b) => b._count.id - a._count.id).slice(0, 5);

    // Last 6 months activity
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { start: d, end: new Date(d.getFullYear(), d.getMonth() + 1, 1), label: d.toLocaleDateString("fr-FR", { month: "short" }) };
    });
    monthlyData = await Promise.all(
      months.map(async (m) => ({
        name: m.label.charAt(0).toUpperCase() + m.label.slice(1).replace(".", ""),
        seances: await prisma.seance.count({ where: { userId: uid, createdAt: { gte: m.start, lt: m.end } } }),
        fiches: await prisma.fiche.count({ where: { userId: uid, createdAt: { gte: m.start, lt: m.end } } }),
      }))
    );

    [recentSeances, recentFiches] = await Promise.all([
      prisma.seance.findMany({
        where: { userId: uid }, orderBy: { createdAt: "desc" }, take: 5,
        select: { id: true, title: true, module: true, filiere: true, createdAt: true },
      }),
      prisma.fiche.findMany({
        where: { userId: uid }, orderBy: { createdAt: "desc" }, take: 5,
        select: { id: true, titre: true, module: true, createdAt: true },
      }),
    ]);

    if (groupesCount > 0) {
      const groupesData = await prisma.groupe.findMany({
        where: { userId: uid },
        include: { stagiaires: { include: { progressions: { select: { competenceId: true, pourcentage: true, source: true } } } } },
        take: 3,
      });
      allStagiaires = groupesData.flatMap((g) => g.stagiaires.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })));
      if (groupesData[0]) {
        const comps = await prisma.competence.findMany({
          where: { module: { filiereId: groupesData[0].filiere } },
          include: { module: { select: { nom: true } } },
          take: 6, orderBy: { createdAt: "asc" },
        });
        topCompetences = comps.map((c) => ({ id: c.id, titre: c.titre, moduleNom: c.module.nom }));
      }
    }
  } catch {}

  const tempsEconomiseMin = seancesCount * 45 + fichesCount * 30;
  const tempsEconomiseLabel =
    tempsEconomiseMin >= 60
      ? `${Math.floor(tempsEconomiseMin / 60)}h${tempsEconomiseMin % 60 > 0 ? String(tempsEconomiseMin % 60).padStart(2, "0") : ""}`
      : `${tempsEconomiseMin} min`;

  const userName = session.user.name?.split(" ")[0] ?? "Formateur";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";
  const fmt = (d: Date) => d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const todayLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  // suppress unused warning
  void [modulesCount, allStagiaires, topCompetences, tempsEconomiseLabel];

  return (
    <div style={{ background: "#EEF2F7", minHeight: "100%", padding: "28px 28px 60px" }}>

      {/* ── TOP HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            Tableau de bord
          </h1>
          <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "3px" }}>
            {greeting}, <strong style={{ color: "#E8651A" }}>{userName}</strong> — {todayLabel}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Bell */}
          <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "white", border: "1px solid #E5E7EB", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <svg width="18" height="18" fill="none" stroke="#374151" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            {(seancesThisMonth + fichesThisMonth) > 0 && (
              <span style={{ position: "absolute", top: "7px", right: "7px", width: "8px", height: "8px", borderRadius: "50%", background: "#EF4444", border: "2px solid white" }} />
            )}
          </div>
          {/* User */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", border: "1px solid #E5E7EB", borderRadius: "10px", padding: "6px 12px 6px 8px" }}>
            <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: "#003087", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="15" height="15" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 500, color: "#374151" }}>{userName}</span>
            <svg width="13" height="13" fill="none" stroke="#9CA3AF" strokeWidth="2" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9" /></svg>
          </div>
        </div>
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
        <StatCard
          value={stagiairesCount}
          label="Stagiaires"
          trend={stagiairesCount > 0 ? `${groupesCount} groupe${groupesCount > 1 ? "s" : ""}` : undefined}
          iconBg="#EFF6FF" iconColor="#3B82F6"
          iconPath={<><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></>}
        />
        <StatCard
          value={seancesCount}
          label="Séances générées"
          trend={seancesThisMonth > 0 ? `+${seancesThisMonth} ce mois` : undefined}
          iconBg="#F0FDF4" iconColor="#22C55E"
          iconPath={<><path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>}
        />
        <StatCard
          value={groupesCount}
          label="Groupes actifs"
          trend={fichesThisMonth > 0 ? `+${fichesThisMonth} fiches ce mois` : undefined}
          iconBg="#FAF5FF" iconColor="#A855F7"
          iconPath={<><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></>}
        />
        <StatCard
          value={fichesCount}
          label="Fiches pédagogiques"
          trend={fichesThisMonth > 0 ? `+${fichesThisMonth} ce mois` : undefined}
          iconBg="#FFF7ED" iconColor="#F97316"
          iconPath={<><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" /></>}
        />
      </div>

      {/* ── CHARTS ROW ── */}
      <div style={{ marginBottom: "20px" }}>
        <DashboardCharts monthlyData={monthlyData} filiereData={seancesParFiliere} totalSeances={seancesCount} />
      </div>

      {/* ── RECENT ROW ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>

        {/* Séances récentes */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>Séances récentes</h3>
            <Link href="/historique" style={{ fontSize: "12px", color: "#3B82F6", fontWeight: 500 }}>Voir tout</Link>
          </div>
          {recentSeances.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: "13px" }}>
              Aucune séance générée.<br />
              <Link href="/seances" style={{ color: "#E8651A", fontWeight: 600, marginTop: "8px", display: "inline-block" }}>
                Générer ma première séance →
              </Link>
            </div>
          ) : (
            recentSeances.map((s) => (
              <RecentRow
                key={s.id}
                href={`/historique/${s.id}`}
                icon="⚡"
                title={s.title || `${s.filiere} — ${s.module}`}
                subtitle={s.module}
                badge="En cours"
                badgeColor="#22C55E"
                date={fmt(s.createdAt)}
              />
            ))
          )}
        </div>

        {/* Fiches récentes */}
        <div style={{ background: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>Fiches récentes</h3>
            <Link href="/fiches/historique" style={{ fontSize: "12px", color: "#3B82F6", fontWeight: 500 }}>Voir tout</Link>
          </div>
          {recentFiches.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "#9CA3AF", fontSize: "13px" }}>
              Aucune fiche générée.<br />
              <Link href="/fiches" style={{ color: "#E8651A", fontWeight: 600, marginTop: "8px", display: "inline-block" }}>
                Créer ma première fiche →
              </Link>
            </div>
          ) : (
            recentFiches.map((f) => (
              <RecentRow
                key={f.id}
                href={`/fiches/${f.id}`}
                icon="📋"
                title={f.titre || f.module}
                subtitle={f.module}
                badge="Corrigée"
                badgeColor="#F97316"
                date={fmt(f.createdAt)}
              />
            ))
          )}
        </div>
      </div>

    </div>
  );
}
