"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ChatWindow, { Message } from "@/components/chat/ChatWindow";
import ChatInput from "@/components/chat/ChatInput";
import SessionList from "@/components/chat/SessionList";
import { toast } from "sonner";

const DOMAINES = ["Comptabilité", "Finance", "Gestion", "Fiscalité", "Pédagogie générale"];

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
  const [domaine, setDomaine] = useState("Comptabilité");
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    const res = await fetch("/api/chat/sessions");
    const data = await res.json();
    setSessions(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    if (s) setDomaine(s.domaine);
  }

  async function newSession() {
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domaine }),
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
      const res = await fetch("/api/chat/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domaine }),
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
        body: JSON.stringify({ message: content, sessionId, domaine }),
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
        <div className="px-5 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid #1E1E2C", background: "#111116" }}>
          <div>
            <h1 className="font-bold text-white text-sm">Assistant pédagogique IA</h1>
            <p className="text-xs" style={{ color: "#9CA3AF" }}>Questions pédagogiques OFPPT — {domaine}</p>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {DOMAINES.map(d => (
              <button
                key={d}
                onClick={() => setDomaine(d)}
                className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                style={
                  domaine === d
                    ? { background: "#84CC1618", color: "#84CC16", borderColor: "#84CC1640" }
                    : { borderColor: "#1E1E2C", color: "#9CA3AF" }
                }
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <ChatWindow messages={messages} isLoading={isLoading} />
        <div ref={bottomRef} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>
    </div>
  );
}
