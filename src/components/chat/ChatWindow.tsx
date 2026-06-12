"use client";

import ReactMarkdown from "react-markdown";

export interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  messages: Message[];
  isLoading: boolean;
  onSuggestionClick?: (text: string) => void;
}

const SUGGESTIONS = [
  {
    category: "Préparation",
    icon: "⚡",
    accent: "#0A4DA8",
    bg: "#0A4DA812",
    border: "#0A4DA830",
    desc: "Planification & contenu",
    prompt: "Prépare une séance de 2 heures sur les réseaux informatiques pour des stagiaires de niveau technicien.",
  },
  {
    category: "Évaluation",
    icon: "📝",
    accent: "#3B82F6",
    bg: "#3B82F612",
    border: "#3B82F630",
    desc: "Questions & barèmes",
    prompt: "Crée un QCM de 20 questions sur les bases de données relationnelles avec correction.",
  },
  {
    category: "Animation",
    icon: "🎯",
    accent: "#F59E0B",
    bg: "#F59E0B12",
    border: "#F59E0B30",
    desc: "Dynamisme & engagement",
    prompt: "Donne-moi une activité pédagogique interactive de 30 minutes pour animer un cours de comptabilité.",
  },
  {
    category: "Remédiation",
    icon: "🔄",
    accent: "#A855F7",
    bg: "#A855F712",
    border: "#A855F730",
    desc: "Aide & accompagnement",
    prompt: "Propose un plan de soutien personnalisé pour les stagiaires en difficulté dans un module technique.",
  },
];

export default function ChatWindow({ messages, isLoading, onSuggestionClick }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: "#F5F7FA" }}>

      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-8 py-8">
          {/* Welcome */}
          <div className="text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 text-black font-bold text-lg"
              style={{ background: "#0A4DA8" }}
            >
              IA
            </div>
            <h2 className="text-lg font-bold mb-1" style={{ color: "#111827" }}>Assistant Pédagogique IA</h2>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              Posez vos questions pédagogiques ou choisissez un exemple ci-dessous
            </p>
          </div>

          {/* Suggestion cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.category}
                onClick={() => onSuggestionClick?.(s.prompt)}
                className="text-left p-4 rounded-xl transition-all group"
                style={{ background: s.bg, border: `1px solid ${s.border}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = s.accent; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = s.border; }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: s.accent }}>
                    {s.category}
                  </span>
                </div>
                <p className="text-xs leading-relaxed mb-1" style={{ color: "#E5E7EB" }}>
                  &ldquo;{s.prompt.slice(0, 75)}{s.prompt.length > 75 ? "…" : ""}&rdquo;
                </p>
                <p className="text-[10px]" style={{ color: "#6B7280" }}>{s.desc}</p>
              </button>
            ))}
          </div>

          <p className="text-[11px]" style={{ color: "#4B5563" }}>
            Cliquez sur un exemple ou écrivez votre propre question
          </p>
        </div>
      )}

      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-black text-xs font-bold mr-2 mt-1 flex-shrink-0"
              style={{ background: "#0A4DA8" }}
            >
              IA
            </div>
          )}
          <div
            className="max-w-[75%] rounded-2xl px-4 py-3 text-sm"
            style={
              msg.role === "user"
                ? { background: "#0A4DA818", color: "#FFFFFF", borderRadius: "16px 4px 16px 16px", border: "1px solid #0A4DA830" }
                : { background: "#F8FAFC", color: "#E5E7EB", borderRadius: "4px 16px 16px 16px", border: "1px solid #E2E8F0" }
            }
          >
            {msg.role === "assistant" ? (
              <div className="prose prose-sm max-w-none prose-invert prose-p:my-1 prose-headings:my-2">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && (
                  <span className="inline-block w-1.5 h-4 animate-pulse ml-0.5 align-middle" style={{ background: "#0A4DA8" }} />
                )}
              </div>
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}

      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-black text-xs font-bold mr-2 mt-1 flex-shrink-0"
            style={{ background: "#0A4DA8" }}
          >
            IA
          </div>
          <div
            className="rounded-2xl px-4 py-3"
            style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: "4px 16px 16px 16px" }}
          >
            <div className="flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#0A4DA8", animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#0A4DA8", animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#0A4DA8", animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
