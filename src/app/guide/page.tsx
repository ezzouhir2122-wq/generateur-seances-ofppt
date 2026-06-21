import { auth } from "@/auth";
import { redirect } from "next/navigation";

const steps = [
  { num: 1, color: "#E8651A", bg: "rgba(232,101,26,0.15)", border: "rgba(232,101,26,0.3)", label: "Connexion NextAuth", desc: "Authentifiez-vous avec votre email et mot de passe formateur." },
  { num: 2, color: "#4B8EE8", bg: "rgba(75,142,232,0.12)", border: "rgba(75,142,232,0.25)", label: "Tableau de Bord", desc: "Consultez vos statistiques, activités récentes et accès rapides." },
  { num: 3, color: "#4ADE80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.25)", label: "Import Modules Excel", desc: "Importez vos modules OFPPT via ⚙ Modules & Paramètres (sidebar)." },
  { num: 4, color: "#E8651A", bg: "rgba(232,101,26,0.15)", border: "rgba(232,101,26,0.3)", label: "Génération IA", desc: "Remplissez le formulaire et laissez l'IA générer votre contenu." },
  { num: 5, color: "#A78BFA", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.25)", label: "Révision & Édition", desc: "Consultez et ajustez le résultat généré selon vos besoins." },
  { num: 6, color: "#FBBF24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)", label: "Export PDF / Word", desc: "Téléchargez votre document au format PDF ou Word (.docx)." },
  { num: 7, color: "#4ADE80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.25)", label: "Suivi Stagiaires", desc: "Gérez vos groupes et suivez la progression des compétences." },
];

const aiModels = [
  { label: "Claude (Anthropic)", sub: "Modèle primaire", color: "#E8651A", bg: "rgba(232,101,26,0.12)", border: "rgba(232,101,26,0.3)" },
  { label: "GPT (OpenAI)", sub: "Fallback automatique", color: "#4ADE80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.25)" },
  { label: "OpenRouter", sub: "Alternatif", color: "#A78BFA", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.25)" },
  { label: "Grok", sub: "Alternatif", color: "#4B8EE8", bg: "rgba(75,142,232,0.10)", border: "rgba(75,142,232,0.25)" },
];

const genModules = [
  {
    icon: "⚡",
    accent: "#E8651A",
    bg: "rgba(232,101,26,0.12)",
    tag: "SÉANCE PÉDAGOGIQUE",
    tagBg: "rgba(232,101,26,0.12)",
    title: "Générateur de Séances",
    desc: "Génère une séance complète (jusqu'à 6h) à partir d'un formulaire structuré par filière, module, compétence et méthode pédagogique.",
    features: [
      "Sélection cascade : Filière → Module → Compétence",
      "Méthodes : Magistrale, Active, Projet, Cas pratique…",
      "Niveaux : Acquisition, Maîtrise, Perfectionnement",
      "Génération streaming en temps réel",
      "Activités, ressources et évaluation finale incluses",
    ],
    exports: ["PDF", "Word .docx"],
    exportColors: [{ bg: "rgba(239,68,68,0.12)", color: "#F87171", border: "rgba(239,68,68,0.2)" }, { bg: "rgba(75,142,232,0.12)", color: "#4B8EE8", border: "rgba(75,142,232,0.2)" }],
  },
  {
    icon: "📋",
    accent: "#4B8EE8",
    bg: "rgba(75,142,232,0.12)",
    tag: "FICHE PÉDAGOGIQUE",
    tagBg: "rgba(75,142,232,0.12)",
    title: "Générateur de Fiches",
    desc: "Crée des fiches pédagogiques standardisées format OFPPT : objectifs, contenus, méthodes et critères d'évaluation.",
    features: [
      "Formulaire : Filière, Module, Compétence, Durée",
      "Structure : Objectifs → Contenus → Activités → Évaluation",
      "Conformité au référentiel OFPPT intégré",
      "Pré-remplissage depuis le Référentiel (/referentiel/generer)",
      "Historique dédié des fiches générées",
    ],
    exports: ["PDF", "Word .docx"],
    exportColors: [{ bg: "rgba(239,68,68,0.12)", color: "#F87171", border: "rgba(239,68,68,0.2)" }, { bg: "rgba(75,142,232,0.12)", color: "#4B8EE8", border: "rgba(75,142,232,0.2)" }],
  },
  {
    icon: "📝",
    accent: "#4ADE80",
    bg: "rgba(74,222,128,0.10)",
    tag: "ÉVALUATION",
    tagBg: "rgba(74,222,128,0.10)",
    title: "Générateur d'Évaluations",
    desc: "Crée des épreuves (QCM, questions ouvertes, cas pratiques) adaptées au niveau et à la compétence ciblée.",
    features: [
      "Types : QCM, Vrai/Faux, Questions ouvertes, Cas pratique",
      "Paramètres : nombre de questions, difficulté, durée",
      "Barème et critères de notation inclus",
      "Corrigé type généré avec l'évaluation",
    ],
    exports: ["PDF", "Word .docx"],
    exportColors: [{ bg: "rgba(239,68,68,0.12)", color: "#F87171", border: "rgba(239,68,68,0.2)" }, { bg: "rgba(75,142,232,0.12)", color: "#4B8EE8", border: "rgba(75,142,232,0.2)" }],
  },
  {
    icon: "✏️",
    accent: "#FBBF24",
    bg: "rgba(251,191,36,0.10)",
    tag: "CORRECTION IA",
    tagBg: "rgba(251,191,36,0.10)",
    title: "Correction Automatique",
    desc: "Analyse et note automatiquement des copies de stagiaires selon un barème défini, avec commentaires détaillés.",
    features: [
      "Saisie ou upload du texte de la copie",
      "Notation automatique avec justification",
      "Commentaires personnalisés par question",
      "Points forts / axes d'amélioration identifiés",
    ],
    exports: [],
    exportColors: [],
  },
];

const pedagogieModules = [
  {
    icon: "📚",
    accent: "#60A5FA",
    bg: "rgba(96,165,250,0.10)",
    tag: "RÉFÉRENTIEL",
    title: "Référentiel OFPPT",
    desc: "Accès et extraction structurée des référentiels de filières via IA (PDF → compétences structurées).",
    features: [
      "Arborescence : Filière → Modules → Séquences → Compétences",
      "Extraction IA depuis PDF du référentiel officiel",
      "Page /generer : pré-remplit séance / fiche / évaluation",
      "Stockage base de données (compétences, modules)",
    ],
  },
  {
    icon: "📈",
    accent: "#4B8EE8",
    bg: "rgba(75,142,232,0.12)",
    tag: "SUIVI",
    title: "Suivi des Compétences",
    desc: "Gestion des groupes de stagiaires et suivi individuel des progressions par compétence.",
    features: [
      "Création de groupes (filière, année, niveau)",
      "Import stagiaires Excel (.xlsx) en masse",
      "Saisie des notes et pourcentages par compétence",
      "Graphiques de progression (barres, courbes)",
      "Vue globale par groupe + vue individuelle",
    ],
  },
  {
    icon: "📖",
    accent: "#A78BFA",
    bg: "rgba(167,139,250,0.10)",
    tag: "BIBLIOTHÈQUE",
    title: "Bibliothèque Collaborative",
    desc: "Espace de partage de ressources pédagogiques entre formateurs OFPPT.",
    features: [
      "Upload de ressources (PDF, images, documents)",
      "Recherche par filière, module, type",
      "Système de likes et commentaires",
      "Mes ressources : gestion de ses propres publications",
    ],
  },
];

const techFlow = [
  { num: 1, color: "#E8651A", bg: "rgba(232,101,26,0.15)", border: "rgba(232,101,26,0.3)", title: "Formateur remplit le formulaire", desc: "SeanceForm.tsx — Sélection Filière / Module / Compétence / Méthode / Durée via dropdowns auto-peuplés depuis la base de données.", code: "POST /api/generate" },
  { num: 2, color: "#4B8EE8", bg: "rgba(75,142,232,0.12)", border: "rgba(75,142,232,0.25)", title: "Enrichissement du contexte", desc: "Injection du référentiel OFPPT + modules importés + historique du formateur dans le prompt système.", code: "prompts.ts → buildSeancePrompt()" },
  { num: 3, color: "#E8651A", bg: "rgba(232,101,26,0.12)", border: "rgba(232,101,26,0.25)", title: "Appel API IA (Claude → GPT fallback)", desc: "claude.ts → streamText() avec claude-haiku / sonnet. Si erreur : bascule automatique vers OpenAI gpt-4o-mini. Réponse en streaming.", code: "src/lib/claude.ts · src/lib/openai.ts" },
  { num: 4, color: "#4ADE80", bg: "rgba(74,222,128,0.10)", border: "rgba(74,222,128,0.25)", title: "Affichage streaming + sauvegarde", desc: "SeanceResult.tsx affiche le contenu en temps réel. À la fin du stream : prisma.seance.create() sauvegarde en DB avec userId.", code: "SeanceResult.tsx · Prisma.seance" },
  { num: 5, color: "#A78BFA", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.25)", title: "Export PDF ou Word", desc: "export.ts → jsPDF pour PDF avec mise en page OFPPT + bibliothèque docx pour Word structuré. Téléchargement direct navigateur.", code: "src/lib/export.ts · jsPDF · docx" },
];

export default async function GuidePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div style={{ maxWidth: "1060px", margin: "0 auto", padding: "40px 28px 80px" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "48px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "#E8651A" }}>GUIDE</span>
          <span style={{ color: "rgba(255,255,255,0.20)", fontSize: "10px" }}>·</span>
          <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.40)" }}>APPLICATION</span>
        </div>
        <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", marginBottom: "24px" }} />
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.15, color: "#F1F5F9", marginBottom: "10px" }}>
          Guide de l&apos;application <span style={{ color: "#E8651A" }}>Compétencia IA</span>
        </h1>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.40)" }}>
          Plateforme pédagogique intelligente pour formateurs OFPPT — génération de contenu assistée par IA.
        </p>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "16px" }}>
          {["Next.js 16", "Claude API", "OpenAI GPT", "PostgreSQL", "NextAuth v5", "Prisma ORM"].map(t => (
            <span key={t} style={{ fontSize: "10px", fontWeight: 600, fontFamily: "monospace", padding: "3px 10px", borderRadius: "100px", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.35)" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ── Section label helper ── */}
      {/* ── 1. PARCOURS FORMATEUR ── */}
      <SectionLabel label="Parcours Formateur — 7 étapes clés" />

      <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "24px 28px", marginBottom: "32px" }}>
        <div style={{ display: "flex", gap: "0", alignItems: "center", overflowX: "auto", paddingBottom: "4px" }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{ display: "flex", alignItems: "center", gap: "0", flexShrink: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", minWidth: "90px", maxWidth: "110px" }}>
                <div style={{
                  width: "48px", height: "48px", borderRadius: "50%",
                  background: step.bg, border: `2px solid ${step.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}>
                  <span style={{ fontSize: "11px", fontWeight: 800, color: step.color }}>{step.num}</span>
                </div>
                <span style={{ fontSize: "10px", fontWeight: 600, textAlign: "center", color: "rgba(255,255,255,0.50)", lineHeight: 1.3 }}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{ width: "24px", height: "1px", background: "linear-gradient(90deg, rgba(232,101,26,0.3), rgba(75,142,232,0.3))", flexShrink: 0, marginBottom: "20px" }} />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "10px" }}>
          {steps.map(step => (
            <div key={step.num} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, color: step.color, flexShrink: 0, marginTop: "1px" }}>{step.num}.</span>
              <div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "#F1F5F9", marginBottom: "2px" }}>{step.label}</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)" }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 2. MOTEUR IA ── */}
      <SectionLabel label="Moteur IA — Cascade Multi-Modèles" />

      <div style={{
        background: "linear-gradient(135deg, rgba(10,77,168,0.25), rgba(232,101,26,0.10))",
        border: "1px solid rgba(10,77,168,0.35)",
        borderRadius: "16px", padding: "28px 24px", marginBottom: "32px", textAlign: "center",
      }}>
        <div style={{ fontSize: "36px", marginBottom: "10px" }}>🤖</div>
        <div style={{ fontSize: "18px", fontWeight: 800, letterSpacing: "-0.03em", color: "#F1F5F9", marginBottom: "4px" }}>Moteur IA Multi-Modèles</div>
        <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", color: "#E8651A", marginBottom: "16px" }}>Cascade intelligente avec fallback automatique</div>
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {aiModels.map(m => (
            <div key={m.label} style={{ background: m.bg, border: `1px solid ${m.border}`, borderRadius: "100px", padding: "6px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: m.color }}>{m.label}</span>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em" }}>{m.sub}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)", maxWidth: "440px", margin: "0 auto" }}>
          Chaque génération utilise d&apos;abord Claude. Si l&apos;API est indisponible,
          le système bascule automatiquement vers le modèle suivant.
        </p>
      </div>

      {/* ── 3. GÉNÉRATION IA ── */}
      <SectionLabel label="Module 1 — Génération IA" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        {genModules.map(m => (
          <div key={m.title} style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${m.accent}`, borderRadius: "16px", padding: "22px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "12px" }}>{m.icon}</div>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px", background: m.tagBg, color: m.accent, display: "inline-block", marginBottom: "8px" }}>{m.tag}</span>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px" }}>{m.title}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "12px" }}>{m.desc}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {m.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "rgba(255,255,255,0.55)" }}>
                  <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: m.accent, flexShrink: 0, marginTop: "5px" }} />
                  {f}
                </div>
              ))}
            </div>
            {m.exports.length > 0 && (
              <div style={{ display: "flex", gap: "6px", marginTop: "12px" }}>
                {m.exports.map((ex, i) => (
                  <span key={ex} style={{ fontSize: "10px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", fontFamily: "monospace", background: m.exportColors[i].bg, color: m.exportColors[i].color, border: `1px solid ${m.exportColors[i].border}` }}>{ex}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── 4. PÉDAGOGIE ── */}
      <SectionLabel label="Module 2 — Pédagogie" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "32px" }}>
        {pedagogieModules.map(m => (
          <div key={m.title} style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderLeft: `3px solid ${m.accent}`, borderRadius: "16px", padding: "22px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: m.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "12px" }}>{m.icon}</div>
            <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px", background: m.bg, color: m.accent, display: "inline-block", marginBottom: "8px" }}>{m.tag}</span>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px" }}>{m.title}</div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "12px" }}>{m.desc}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              {m.features.map(f => (
                <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11px", color: "rgba(255,255,255,0.50)" }}>
                  <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: m.accent, flexShrink: 0, marginTop: "5px" }} />
                  {f}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── 5. ASSISTANT + DOCS ── */}
      <SectionLabel label="Module 3 — Assistant IA & Documents" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "32px" }}>
        <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #E8651A", borderRadius: "16px", padding: "22px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(232,101,26,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "12px" }}>💬</div>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px", background: "rgba(232,101,26,0.12)", color: "#E8651A", display: "inline-block", marginBottom: "8px" }}>ASSISTANT IA</span>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px" }}>Chat Assistant Pédagogique</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "12px" }}>Conversation libre avec un assistant IA spécialisé en pédagogie OFPPT. Sessions multiples sauvegardées.</div>
          {["Interface chat temps réel (streaming)", "Historique de sessions multiples", "Contexte OFPPT injecté dans chaque conversation", "Questions pédagogiques, didactiques, réglementaires", "Persistance en base (ChatSession + ChatMessage)"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "rgba(255,255,255,0.55)", marginBottom: "5px" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#E8651A", flexShrink: 0, marginTop: "5px" }} />{f}
            </div>
          ))}
        </div>

        <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(255,255,255,0.15)", borderRadius: "16px", padding: "22px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "12px" }}>🗂️</div>
          <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.10em", textTransform: "uppercase", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", display: "inline-block", marginBottom: "8px" }}>MES DOCUMENTS</span>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px" }}>Historique & Archives</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "12px" }}>Accès à toutes les séances et fiches générées, avec consultation détaillée et re-téléchargement.</div>
          {["Historique séances : liste paginée + filtres", "Historique fiches : liste dédiée", "Vue détaillée de chaque document", "Re-export PDF/Word depuis l'historique", "Suppression unitaire ou en masse"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "rgba(255,255,255,0.55)", marginBottom: "5px" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", flexShrink: 0, marginTop: "5px" }} />{f}
            </div>
          ))}
        </div>
      </div>

      {/* ── 6. FLOW TECHNIQUE ── */}
      <SectionLabel label="Flow Technique — Génération d'une Séance (5 étapes)" />

      <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px", padding: "8px 0", marginBottom: "32px" }}>
        {techFlow.map((step, i) => (
          <div key={step.num} style={{ display: "flex", gap: "20px", alignItems: "flex-start", padding: "18px 24px", borderBottom: i < techFlow.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: step.bg, border: `1px solid ${step.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 800, color: step.color, flexShrink: 0 }}>{step.num}</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#F1F5F9", marginBottom: "4px" }}>{step.title}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginBottom: "6px", lineHeight: 1.5 }}>{step.desc}</div>
              <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>{step.code}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 7. TABLEAU DE BORD ── */}
      <SectionLabel label="Module 4 — Tableau de Bord & Système" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "40px" }}>
        <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #4ADE80", borderRadius: "16px", padding: "22px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>📊</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px" }}>Dashboard Formateur</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "12px" }}>Vue centralisée de toute l&apos;activité pédagogique avec KPIs temps réel et accès rapides.</div>
          {["KPIs : séances, fiches, modules, groupes, stagiaires", "Temps économisé estimé (45 min/séance)", "Répartition des séances par filière", "Activités récentes (séances + fiches)", "Progression globale des stagiaires (%)", "Widget suivi par compétence intégré"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "rgba(255,255,255,0.55)", marginBottom: "5px" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#4ADE80", flexShrink: 0, marginTop: "5px" }} />{f}
            </div>
          ))}
        </div>

        <div style={{ background: "#131922", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid rgba(255,255,255,0.12)", borderRadius: "16px", padding: "22px" }}>
          <div style={{ fontSize: "24px", marginBottom: "12px" }}>⚙️</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#F1F5F9", marginBottom: "6px" }}>Modules & Paramètres</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.40)", lineHeight: 1.6, marginBottom: "12px" }}>Panneau latéral de configuration — accessible via ⚙ dans la sidebar.</div>
          {["Import modules OFPPT (fichier Excel .xlsx)", "Dropdowns auto-peuplés depuis les modules importés", "Clé API Claude personnelle (optionnel)", "Clé API OpenAI personnelle (optionnel)", "Test de validité des clés API en un clic", "Profil : nom, email, établissement"].map(f => (
            <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "11.5px", color: "rgba(255,255,255,0.55)", marginBottom: "5px" }}>
              <span style={{ width: "4px", height: "4px", borderRadius: "50%", background: "rgba(255,255,255,0.25)", flexShrink: 0, marginTop: "5px" }} />{f}
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: "36px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", letterSpacing: "0.04em" }}>
          Développé par <span style={{ color: "#E8651A" }}>EZZOUIR ELMUSTAPHA 9998</span> · OFPPT ISGI Marrakech · Mémoire 2024
        </p>
        <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.18)", fontFamily: "monospace", letterSpacing: "0.06em" }}>
          COMPÉTENCIA IA · v1.0 · Next.js · Claude API · Supabase
        </p>
      </div>

    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", marginTop: "4px" }}>
      <span style={{ fontSize: "9px", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.20)", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.07)" }} />
    </div>
  );
}
