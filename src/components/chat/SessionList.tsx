"use client";

interface ChatSession {
  id: string;
  domaine: string;
  createdAt: string;
  messages: { content: string }[];
}

interface Props {
  sessions: ChatSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

export default function SessionList({ sessions, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="w-56 flex-shrink-0 flex flex-col h-full" style={{ borderRight: "1px solid #E2E8F0", background: "#FFFFFF" }}>
      <div className="p-3" style={{ borderBottom: "1px solid #E2E8F0" }}>
        <button
          onClick={onNew}
          className="w-full text-black text-sm font-medium py-2 rounded-lg transition-colors"
          style={{ background: "#E8651A" }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = "#65A30D")}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = "#E8651A")}
        >
          + Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-xs p-3 text-center" style={{ color: "#4B5563" }}>Aucune conversation</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className="group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-colors"
              style={{
                borderBottom: "1px solid #E2E8F0",
                background: activeId === s.id ? "#E8651A10" : "transparent",
                borderLeft: activeId === s.id ? "2px solid #E8651A" : "2px solid transparent",
              }}
              onMouseEnter={e => { if (activeId !== s.id) (e.currentTarget as HTMLDivElement).style.background = "#F3F4F6"; }}
              onMouseLeave={e => { if (activeId !== s.id) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: activeId === s.id ? "#E8651A" : "#9CA3AF" }}>{s.domaine}</div>
                <div className="text-xs truncate mt-0.5" style={{ color: "#4B5563" }}>
                  {s.messages[0]?.content ?? "Nouvelle conversation"}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: "#4B5563" }}>
                  {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 transition-all text-xs mt-0.5"
                style={{ color: "#4B5563" }}
                onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = "#EF4444")}
                onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = "#4B5563")}
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
