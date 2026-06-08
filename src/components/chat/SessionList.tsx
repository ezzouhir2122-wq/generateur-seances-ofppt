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
    <div className="w-56 flex-shrink-0 border-r border-gray-100 bg-white flex flex-col h-full">
      <div className="p-3 border-b border-gray-100">
        <button
          onClick={onNew}
          className="w-full bg-[#0B6B72] hover:bg-[#084F57] text-white text-sm font-medium py-2 rounded-lg transition-colors"
        >
          + Nouvelle conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="text-xs text-gray-400 p-3 text-center">Aucune conversation</p>
        ) : (
          sessions.map((s) => (
            <div
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`group flex items-start gap-2 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                activeId === s.id ? "bg-teal-50 border-l-2 border-l-[#0B6B72]" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[#0B6B72] truncate">{s.domaine}</div>
                <div className="text-xs text-gray-500 truncate mt-0.5">
                  {s.messages[0]?.content ?? "Nouvelle conversation"}
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all text-xs mt-0.5"
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
