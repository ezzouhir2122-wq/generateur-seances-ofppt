"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatWindow, { Message } from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import SessionList from "@/components/chat/SessionList";
import { toast } from "sonner";

const FALLBACK_FILIERES = [
  "Développement Informatique",
  "Réseaux & Informatique",
  "Comptabilité & Gestion",
  "Finance",
  "Commerce",
  "Électronique",
  "Mécanique",
];

interface RefModule { id: string; nom: string; code: string | null }
interface FiliereSummary { id: string; nom: string; code: string | null; modules: RefModule[] }

interface ChatSession {
  id: string;
  domaine: string;
  createdAt: string;
  messages: { content: string }[];
}

export default function AssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [filieres, setFilieres] = useState<FiliereSummary[]>([]);
  const [filiere, setFiliere] = useState("");
  const [module, setModule] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  // Load referential filières from DB
  useEffect(() => {
    fetch("/api/referentiel?mode=summary")
      .then(r => r.json())
      .then((data: FiliereSummary[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setFilieres(data);
          setFiliere(data[0].nom);
        } else {
          setFiliere(FALLBACK_FILIERES[0]);
        }
      })
      .catch(() => { setFiliere(FALLBACK_FILIERES[0]); });
  }, []);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset module when filière changes
  useEffect(() => { setModule(""); }, [filiere]);

  const currentFiliereModules =
    filieres.find(f => f.nom === filiere)?.modules ?? [];

  async function selectSession(id: string) {
    setActiveSessionId(id);
    const res = await fetch(`/api/chat/sessions/${id}`);
    const data = await res.json();
    setMessages(
      (data.messages ?? []).map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    );
    const s = sessions.find(s => s.id === id);
    if (s) setFiliere(s.domaine.split(" — ")[0] ?? s.domaine);
  }

  async function newSession() {
    const label = module ? `${filiere} — ${module}` : filiere;
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domaine: label }),
    });
    const session = await res.json();
    setActiveSessionId(session.id);
    setMessages([]);
    await loadSessions();
  }

  async function deleteSession(id: string) {
    await fetch(`/api/chat/sessions/${id}`, { method: "DELETE" });
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
    await loadSessions();
    toast.success("Conversation supprimée");
  }

  async function sendMessage(content: string) {
    let sessionId = activeSessionId;

    if (!sessionId) {
      const label = module ? `${filiere} — ${module}` : filiere;
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domaine: label }),
      });
      const s = await res.json();
      sessionId = s.id;
      setActiveSessionId(sessionId);
    }

    setMessages(prev => [...prev, { role: "user", content }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          sessionId,
          domaine: filiere,
          module: module || undefined,
          modulesContext: currentFiliereModules.map(m => m.nom),
        }),
      });

      if (!res.ok || !res.body) throw new Error("Erreur serveur");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let streamedText = "";

      setMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamedText += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: streamedText, streaming: true };
          return updated;
        });
      }

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: streamedText, streaming: false };
        return updated;
      });

      await loadSessions();
    } catch {
      toast.error("Erreur lors de l'envoi du message");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  }

  const filieresList = filieres.length > 0
    ? filieres.map(f => f.nom)
    : FALLBACK_FILIERES;

  return (
    <div className="flex h-full">
      <SessionList
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={selectSession}
        onNew={newSession}
        onDelete={deleteSession}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #1E1E2C", background: "#111116" }}>
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <h1 className="font-bold text-white text-sm">Assistant Pédagogique IA</h1>
              <p className="text-xs" style={{ color: "#6B7280" }}>
                {module
                  ? <>Filière : <span style={{ color: "#39C84A" }}>{filiere}</span> &mdash; Module : <span style={{ color: "#39C84A" }}>{module}</span></>
                  : <>Filière : <span style={{ color: "#39C84A" }}>{filiere || "—"}</span></>
                }
              </p>
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-black text-xs font-bold"
              style={{ background: "#39C84A" }}
            >
              IA
            </div>
          </div>

          {/* Filière tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {filieresList.map(f => (
              <button
                key={f}
                onClick={() => setFiliere(f)}
                className="text-[11px] px-2.5 py-1 rounded-full border transition-all whitespace-nowrap flex-shrink-0"
                style={
                  filiere === f
                    ? { background: "#39C84A18", color: "#39C84A", borderColor: "#39C84A40" }
                    : { borderColor: "#1E1E2C", color: "#6B7280" }
                }
              >
                {f}
              </button>
            ))}
          </div>

          {/* Module tabs — only shown when filière has modules in DB */}
          {currentFiliereModules.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto pt-1.5 pb-0.5 scrollbar-none">
              <button
                onClick={() => setModule("")}
                className="text-[10px] px-2 py-0.5 rounded-full border transition-all whitespace-nowrap flex-shrink-0"
                style={
                  module === ""
                    ? { background: "#3B82F618", color: "#3B82F6", borderColor: "#3B82F640" }
                    : { borderColor: "#17171E", color: "#4B5563" }
                }
              >
                Tous modules
              </button>
              {currentFiliereModules.map(m => (
                <button
                  key={m.id}
                  onClick={() => setModule(m.nom)}
                  className="text-[10px] px-2 py-0.5 rounded-full border transition-all whitespace-nowrap flex-shrink-0"
                  style={
                    module === m.nom
                      ? { background: "#3B82F618", color: "#3B82F6", borderColor: "#3B82F640" }
                      : { borderColor: "#17171E", color: "#4B5563" }
                  }
                >
                  {m.code ? `${m.code} — ${m.nom}` : m.nom}
                </button>
              ))}
            </div>
          )}
        </div>

        <ChatWindow messages={messages} isLoading={isLoading} onSuggestionClick={sendMessage} />
        <div ref={bottomRef} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
