import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardSuiviWidget from "@/components/suivi/DashboardSuiviWidget";

/* ── Stat box ── */
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
      <div style={{ fontSize: "clamp(2rem, 4vw, 2.75rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1, color: accent, marginBottom: "8px" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: "rgba(255,255,255,0.45)", marginBottom: sub ? "4px" : 0 }}>
        {label}
      </div>
      {sub && <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

/* ── Section label with horizontal line ── */
function SectionLabel({ text, accent }: { text: string; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase" as const, color: accent || "rgba(255,255,255,0.28)", whiteSpace: "nowrap" as const }}>
        {text}
      </span>
      <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}

/* ── KPI row ── */
function KpiRow({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span style={{ fontSize: "13px", fontWeight: 700, color: accent }}>{value}</span>
    </div>
  );
}

/* ── Action card ── */
function ActionCard({
  href, icon, tag, tagColor, title, desc, accent,
}: {
  href: string; icon: string; tag: string; tagColor: string;
  title: string; desc: string; accent: string;
}) {
  return (
    <Link href={href} style={{ display: "block", textDecoration: "none" }}>
      <div style={{
        background: "#131922",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: "16px",
        padding: "20px",
        height: "100%",
        transition: "border-color 0.2s, transform 0.2s",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: "22px" }}>{icon}</span>
          <span style={{
            fontSize: "9px", fontWeight: 700, letterSpacing: "0.10em",
            textTransform: "uppercase" as const, padding: "3px 8px", borderRadius: "6px",
            background: `${tagColor}18`, color: tagColor, border: `1px solid ${tagColor}30`,
          }}>
            {tag}
          </span>
        </div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px", letterSpacing: "-0.01em" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "16px" }}>{desc}</div>
        <div style={{ fontSize: "11px", fontWeight: 600, color: accent }}>Accéder →</div>
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

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "48px 28px 80px", position: "relative" }}>

      {/* ══ HEADER ÉDITORIAL ══ */}
      <div style={{ marginBottom: "48px" }}>

        {/* Badge animé */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          background: "rgba(232,101,26,0.10)", border: "1px solid rgba(232,101,26,0.25)",
          borderRadius: "100px", padding: "5px 16px", marginBottom: "24px",
        }}>
          <span
            className="animate-ping"
            style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "#E8651A", animationDuration: "2s", flexShrink: 0 }}
          />
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E8651A" }}>
            Tableau de Bord · Compétencia IA
          </span>
        </div>

        {/* Titre éditorial — DM Serif Display */}
        <h1 style={{
          fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
          fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
          lineHeight: 1.15,
          color: "#F1F5F9",
          marginBottom: "12px",
          letterSpacing: "-0.02em",
          fontWeight: 400,
        }}>
          {greeting},{" "}
          <em style={{ color: "#E8651A", fontStyle: "italic" }}>{userName}</em>
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.40)", letterSpacing: "0.01em" }}>
          {dateLabel} · Plateforme pédagogique intelligente OFPPT
        </p>
      </div>

      {/* Gradient divider */}
      <div style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(232,101,26,0.35), rgba(75,142,232,0.35), transparent)",
        marginBottom: "48px",
      }} />

      {/* ══ SECTION 1 — STATISTIQUES ══ */}
      <SectionLabel text="Vue d'ensemble — Statistiques" accent="#E8651A" />

      <div style={{
        background: "#131922",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "16px",
        overflow: "hidden",
        marginBottom: "48px",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <StatBox value={seancesCount} label="Séances générées" sub={`+${seancesThisMonth} ce mois`} accent="#E8651A" border />
          <StatBox value={fichesCount} label="Fiches pédagogiques" sub={`+${fichesThisMonth} ce mois`} accent="#F1F5F9" />
          <StatBox value={generationsTotal} label="Total générations IA" sub="Séances + Fiches" accent="#4B8EE8" border />
          <StatBox value={tempsEconomiseLabel} label="Temps économisé" sub="estimé à ~45 min/séance" accent="#4ADE80" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
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
                display: "flex", alignItems: "center", gap: "14px",
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

      {/* ══ SECTION 2 — GÉNÉRATION IA ══ */}
      <SectionLabel text="Génération IA — Module 1" accent="#E8651A" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "48px" }}>
        <ActionCard
          href="/seances"
          icon="⚡"
          tag="Séance"
          tagColor="#E8651A"
          title="Nouvelle séance pédagogique"
          desc="Génère une séance complète (activités, ressources, évaluation) à partir du référentiel OFPPT."
          accent="#E8651A"
        />
        <ActionCard
          href="/fiches"
          icon="📋"
          tag="Fiche"
          tagColor="#4B8EE8"
          title="Nouvelle fiche pédagogique"
          desc="Crée une fiche standardisée format OFPPT avec objectifs, contenus et critères d'évaluation."
          accent="#4B8EE8"
        />
        <ActionCard
          href="/evaluations"
          icon="📝"
          tag="Évaluation"
          tagColor="#4ADE80"
          title="Créer une évaluation"
          desc="QCM, questions ouvertes ou cas pratiques — avec barème et corrigé type inclus automatiquement."
          accent="#4ADE80"
        />
        <ActionCard
          href="/corrections"
          icon="✏️"
          tag="Correction IA"
          tagColor="#FBBF24"
          title="Corriger une copie"
          desc="Notation automatique avec justification détaillée, commentaires et axes d'amélioration."
          accent="#FBBF24"
        />
      </div>

      {/* ══ SECTION 3 — ACTIVITÉ ══ */}
      <SectionLabel text="Activité — Suivi & Historique" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "48px" }}>

        {/* Activité par filière */}
        <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E8651A" }}>ACTIVITÉ</span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>PAR FILIÈRE</span>
          </div>

          {seancesParFiliere.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 0", gap: "12px" }}>
              <svg width="28" height="28" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" viewBox="0 0 24 24">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
              </svg>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>Générez des séances pour voir la répartition</p>
              <Link href="/seances" style={{ fontSize: "11px", fontWeight: 600, color: "#E8651A" }}>Générer ma première séance →</Link>
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
                      <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)" }}>{f._count.id} · {pct}%</span>
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
        <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#E8651A" }}>RÉCENT</span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>ACTIVITÉS</span>
          </div>

          {recentSeances.length === 0 && recentFiches.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: "12px" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)" }}>Aucune activité pour l&apos;instant</p>
              <Link href="/seances" style={{ fontSize: "12px", fontWeight: 600, color: "#E8651A" }}>Générer ma première séance →</Link>
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

      {/* ══ SECTION 4 — DIRECTION ══ */}
      <SectionLabel text="Direction — Vue Globale" accent="#4B8EE8" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "48px" }}>

        {/* KPIs */}
        <div style={{
          background: "#131922",
          border: "1px solid rgba(255,255,255,0.07)",
          borderLeft: "3px solid #4B8EE8",
          borderRadius: "16px",
          padding: "24px",
        }}>
          <div style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4B8EE8", marginBottom: "20px" }}>
            INDICATEURS CLÉS
          </div>
          <KpiRow label="Activité ce mois" value={`${activiteMois} génération${activiteMois !== 1 ? "s" : ""}`} accent="#E8651A" />
          <KpiRow label="Filière principale" value={topFiliere ? topFiliere.slice(0, 24) : "—"} accent="#F1F5F9" />
          <KpiRow label="Groupes actifs" value={groupesCount > 0 ? `${groupesCount} groupe${groupesCount > 1 ? "s" : ""}` : "—"} accent="#4B8EE8" />
          <KpiRow label="Temps économisé (total)" value={tempsEconomiseLabel} accent="#4ADE80" />
          <KpiRow label="Stagiaires suivis" value={stagiairesCount > 0 ? `${stagiairesCount} stagiaire${stagiairesCount > 1 ? "s" : ""}` : "—"} accent="#A78BFA" />

          {groupesCount > 0 && (
            <Link href="/suivi" style={{ display: "inline-block", marginTop: "16px", fontSize: "11px", fontWeight: 600, color: "#4B8EE8" }}>
              Voir le suivi des compétences →
            </Link>
          )}
        </div>

        {/* Progression globale */}
        <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#4ADE80" }}>PROGRESSION</span>
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "9px" }}>·</span>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)" }}>STAGIAIRES</span>
          </div>

          <div style={{ textAlign: "center", padding: "16px 0 24px" }}>
            <div style={{
              fontFamily: "var(--font-serif, 'DM Serif Display', serif)",
              fontSize: "clamp(3rem, 7vw, 4.5rem)",
              fontWeight: 400,
              color: "#4ADE80",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}>
              {stagiairesCount > 0 ? `${progressionGlobale}%` : "—"}
            </div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", marginTop: "10px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              progression globale
            </div>
          </div>

          {stagiairesCount > 0 && (
            <div style={{ height: "4px", borderRadius: "99px", background: "rgba(255,255,255,0.07)" }}>
              <div style={{ height: "4px", borderRadius: "99px", width: `${progressionGlobale}%`, background: "linear-gradient(90deg, #4ADE80, #4B8EE8)", transition: "width 0.6s ease" }} />
            </div>
          )}

          {stagiairesCount === 0 && (
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.30)", marginBottom: "12px" }}>
                Aucun groupe créé — commencez le suivi
              </p>
              <Link href="/suivi/nouveau" style={{ display: "inline-block", fontSize: "11px", fontWeight: 600, color: "#4B8EE8" }}>
                Créer un groupe →
              </Link>
            </div>
          )}

          {stagiairesCount > 0 && (
            <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: "16px" }}>
              <Link href="/suivi" style={{ fontSize: "11px", fontWeight: 600, color: "#4ADE80" }}>Voir le suivi →</Link>
              <Link href="/suivi/nouveau" style={{ fontSize: "11px", fontWeight: 600, color: "rgba(255,255,255,0.30)" }}>Nouveau groupe →</Link>
            </div>
          )}
        </div>
      </div>

      {/* ══ SECTION 5 — PÉDAGOGIE ══ */}
      <SectionLabel text="Pédagogie — Module 2" accent="#60A5FA" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "48px" }}>
        <ActionCard
          href="/referentiel"
          icon="📚"
          tag="Référentiel"
          tagColor="#60A5FA"
          title="Référentiel OFPPT"
          desc="Extraction IA depuis PDF. Arborescence Filière → Modules → Compétences."
          accent="#60A5FA"
        />
        <ActionCard
          href="/suivi"
          icon="📈"
          tag="Suivi"
          tagColor="#4B8EE8"
          title="Suivi des compétences"
          desc="Gestion des groupes, import Excel, progression individuelle par stagiaire."
          accent="#4B8EE8"
        />
        <ActionCard
          href="/bibliotheque"
          icon="📖"
          tag="Bibliothèque"
          tagColor="#A78BFA"
          title="Bibliothèque collaborative"
          desc="Partage de ressources entre formateurs — upload, likes et commentaires."
          accent="#A78BFA"
        />
      </div>

      {/* ══ WIDGET SUIVI ══ */}
      {groupesCount > 0 && (
        <div style={{ marginBottom: "48px" }}>
          <SectionLabel text="Suivi des Compétences — Graphique" accent="#4B8EE8" />
          <DashboardSuiviWidget
            competences={topCompetences}
            stagiaires={allStagiaires}
            groupesCount={groupesCount}
          />
        </div>
      )}

      {/* ══ FOOTER ══ */}
      <div style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)", marginBottom: "20px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
          <strong style={{ color: "#E8651A" }}>OFPPT</strong> · Compétencia IA · Propulsé par Claude (Anthropic) &amp; GPT (OpenAI)
        </p>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em", fontFamily: "monospace" }}>
          v1.0 · {dateLabel}
        </p>
      </div>

    </div>
  );
}
