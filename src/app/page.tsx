import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import QuickActionLink from "@/components/ui/QuickActionLink";
import DashboardSuiviWidget from "@/components/suivi/DashboardSuiviWidget";

/* ── Stat box (style grille 2×2 inspiré de l'image) ── */
function StatBox({
  value,
  label,
  sub,
  accent = "#E8651A",
  border = false,
}: {
  value: string | number;
  label: string;
  sub?: string;
  accent?: string;
  border?: boolean;
}) {
  return (
    <div
      style={{
        padding: "28px 24px",
        borderRight: border ? "1px solid rgba(255,255,255,0.07)" : undefined,
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        style={{
          fontSize: "clamp(2rem, 4vw, 2.75rem)",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          lineHeight: 1,
          color: accent,
          marginBottom: "8px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.45)",
          marginBottom: sub ? "4px" : 0,
        }}
      >
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", marginTop: "2px" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

/* ── KPI row léger ── */
function KpiRow({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div
      className="flex items-center justify-between py-2"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 700, color: accent }}>{value}</span>
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
    seancesParFiliere = filiereGroups.sort((a, b) => b._count.id - a._count.id).slice(0, 5);

    const progressions = await prisma.progressionCompetence.findMany({
      where: { stagiaire: { groupe: { userId: uid } } },
      select: { pourcentage: true },
    });
    progressionGlobale = progressions.length
      ? Math.round(progressions.reduce((s, p) => s + p.pourcentage, 0) / progressions.length)
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

  const dateLabel = now.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).toUpperCase();

  const quickActions = [
    { href: "/seances", label: "Nouvelle séance", desc: "Générer une séance pédagogique", accent: "#E8651A", bg: "rgba(232,101,26,0.10)", icon: "⚡" },
    { href: "/fiches", label: "Nouvelle fiche", desc: "Générer une fiche pédagogique", accent: "#4B8EE8", bg: "rgba(75,142,232,0.08)", icon: "📋" },
    { href: "/evaluations", label: "Créer une évaluation", desc: "Générer une évaluation IA", accent: "#4ADE80", bg: "rgba(74,222,128,0.08)", icon: "📝" },
    { href: "/corrections", label: "Correction IA", desc: "Corriger et noter une copie", accent: "#FBBF24", bg: "rgba(251,191,36,0.08)", icon: "✏️" },
  ];

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 28px" }}>

      {/* ══ Header éditorial ══ */}
      <div style={{ marginBottom: "36px" }}>

        {/* Fil d'Ariane + Date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#E8651A" }}>
              TABLEAU DE BORD
            </span>
            <span style={{ color: "rgba(255,255,255,0.20)", fontSize: "10px" }}>·</span>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.40)" }}>
              FORMATEUR OFPPT
            </span>
          </div>
          <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", color: "rgba(255,255,255,0.35)" }}>
            {dateLabel}
          </span>
        </div>

        {/* Séparateur */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "24px" }} />

        {/* Titre éditorial */}
        <div>
          <h1
            style={{
              fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1.15,
              color: "#F1F5F9",
              marginBottom: "10px",
            }}
          >
            {greeting}, {userName} —{" "}
            <span style={{ color: "#E8651A" }}>
              plateforme pédagogique
            </span>
          </h1>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.40)", letterSpacing: "0.01em" }}>
            Générez vos séances, fiches et évaluations avec l&apos;intelligence artificielle.
          </p>
        </div>
      </div>

      {/* ══ Grille stats 2×2 (style image) ══ */}
      <div
        style={{
          background: "#131922",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          overflow: "hidden",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <StatBox
            value={seancesCount}
            label="Séances générées"
            sub={`+${seancesThisMonth} ce mois`}
            accent="#E8651A"
            border
          />
          <StatBox
            value={fichesCount}
            label="Fiches pédagogiques"
            sub={`+${fichesThisMonth} ce mois`}
            accent="#F1F5F9"
          />
          <StatBox
            value={generationsTotal}
            label="Total générations IA"
            sub="Séances + Fiches"
            accent="#4B8EE8"
            border
          />
          <StatBox
            value={tempsEconomiseLabel}
            label="Temps économisé"
            sub="estimé à ~45 min/séance"
            accent="#4ADE80"
          />
        </div>

        {/* Ligne supplémentaire : modules + groupes + stagiaires */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {[
            { value: modulesCount, label: "Modules importés" },
            { value: groupesCount, label: "Groupes actifs" },
            { value: stagiairesCount, label: "Stagiaires suivis" },
          ].map((item, i) => (
            <div
              key={item.label}
              style={{
                padding: "18px 24px",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.07)" : undefined,
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: "rgba(255,255,255,0.70)", letterSpacing: "-0.03em" }}>
                {item.value}
              </span>
              <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", color: "rgba(255,255,255,0.30)" }}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ Grille principale ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

        {/* Activité par filière */}
        <div
          style={{
            background: "#131922",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E8651A" }}>
              ACTIVITÉ
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
              PAR FILIÈRE
            </span>
          </div>

          {seancesParFiliere.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "12px" }}>
              <svg width="28" height="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" viewBox="0 0 24 24">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
              </svg>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>Générez des séances pour voir la répartition</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {seancesParFiliere.map((f) => {
                const pct = seancesCount > 0 ? Math.round((f._count.id / seancesCount) * 100) : 0;
                return (
                  <div key={f.filiere}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "12px", fontWeight: 600, color: "#F1F5F9", maxWidth: "65%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {f.filiere}
                      </span>
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>
                        {f._count.id} · {pct}%
                      </span>
                    </div>
                    <div style={{ height: "3px", borderRadius: "99px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
                      <div style={{ height: "3px", borderRadius: "99px", width: `${pct}%`, background: "linear-gradient(90deg, #E8651A, #4B8EE8)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Activités récentes */}
        <div
          style={{
            background: "#131922",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E8651A" }}>
              RÉCENT
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
              ACTIVITÉS
            </span>
          </div>

          {recentSeances.length === 0 && recentFiches.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "12px" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>Aucune activité pour l&apos;instant</p>
              <Link href="/seances" style={{ fontSize: "12px", fontWeight: 600, color: "#E8651A" }}>
                Générer ma première séance →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {recentSeances.map((s) => (
                  <Link
                    key={s.id}
                    href={`/historique/${s.id}`}
                    className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-lg transition-colors hover:bg-white/5"
                  >
                    <span style={{ color: "#E8651A", fontSize: "12px", flexShrink: 0 }}>⚡</span>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title || `${s.filiere} — ${s.module}`}
                    </span>
                  </Link>
                ))}
                {recentFiches.map((f) => (
                  <Link
                    key={f.id}
                    href={`/fiches/${f.id}`}
                    className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-lg transition-colors hover:bg-white/5"
                  >
                    <span style={{ fontSize: "12px", flexShrink: 0 }}>📋</span>
                    <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.titre || f.module}
                    </span>
                  </Link>
                ))}
              </div>
              <div style={{ display: "flex", gap: "16px", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <Link href="/historique" style={{ fontSize: "11px", fontWeight: 600, color: "#E8651A" }}>
                  Toutes les séances →
                </Link>
                <Link href="/fiches/historique" style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.30)" }}>
                  Toutes les fiches →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══ À NOTER (callout style image) + Progression ══ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>

        {/* Accès rapide — style "À NOTER" */}
        <div
          style={{
            background: "#131922",
            border: "1px solid rgba(255,255,255,0.07)",
            borderLeft: "3px solid #E8651A",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <p style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#E8651A", marginBottom: "16px" }}>
            ACCÈS RAPIDE
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {quickActions.map((item) => (
              <QuickActionLink key={item.href} {...item} />
            ))}
          </div>
        </div>

        {/* Suivi + stats direction */}
        <div
          style={{
            background: "#131922",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4B8EE8" }}>
              DIRECTION
            </span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>
              VUE GLOBALE
            </span>
          </div>

          <KpiRow
            label="Activité ce mois"
            value={`${activiteMois} génération${activiteMois !== 1 ? "s" : ""}`}
            accent="#E8651A"
          />
          <KpiRow
            label="Filière principale"
            value={topFiliere ? topFiliere.slice(0, 24) : "—"}
            accent="#F1F5F9"
          />
          <KpiRow
            label="Groupes actifs"
            value={groupesCount > 0 ? `${groupesCount} groupe${groupesCount > 1 ? "s" : ""}` : "—"}
            accent="#4B8EE8"
          />

          {/* Progression globale */}
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>Progression globale stagiaires</span>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#4ADE80" }}>
                {stagiairesCount > 0 ? `${progressionGlobale}%` : "—"}
              </span>
            </div>
            {stagiairesCount > 0 && (
              <div style={{ height: "3px", borderRadius: "99px", background: "rgba(255,255,255,0.07)" }}>
                <div style={{ height: "3px", borderRadius: "99px", width: `${progressionGlobale}%`, background: "#4ADE80" }} />
              </div>
            )}
          </div>

          {groupesCount > 0 && (
            <Link
              href="/suivi"
              style={{ display: "inline-block", marginTop: "14px", fontSize: "11px", fontWeight: 600, color: "#4B8EE8" }}
            >
              Voir le suivi des compétences →
            </Link>
          )}
        </div>
      </div>

      {/* ══ Widget suivi ══ */}
      {groupesCount > 0 && (
        <DashboardSuiviWidget
          competences={topCompetences}
          stagiaires={allStagiaires}
          groupesCount={groupesCount}
        />
      )}

      {/* ══ Footer éditorial ══ */}
      <div style={{ marginTop: "36px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
          Source : OFPPT — Competencia IA · Propulsé par Claude (Anthropic) &amp; GPT (OpenAI)
        </p>
      </div>

    </div>
  );
}
