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
}

export default function ChatWindow({ messages, isLoading }: Props) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ background: "#0A0A0F" }}>
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-sm" style={{ color: "#4B5563" }}>
          Posez votre première question pédagogique…
        </div>
      )}
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-black text-xs font-bold mr-2 mt-1 flex-shrink-0"
              style={{ background: "#84CC16" }}
            >
              IA
            </div>
          )}
          <div
            className="max-w-[75%] rounded-2xl px-4 py-3 text-sm"
            style={
              msg.role === "user"
                ? { background: "#84CC1618", color: "#FFFFFF", borderRadius: "16px 4px 16px 16px", border: "1px solid #84CC1630" }
                : { background: "#111116", color: "#E5E7EB", borderRadius: "4px 16px 16px 16px", border: "1px solid #1E1E2C" }
            }
          >
            {msg.role === "assistant" ? (
              <div className="prose prose-sm max-w-none prose-invert prose-p:my-1 prose-headings:my-2">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && <span className="inline-block w-1.5 h-4 animate-pulse ml-0.5 align-middle" style={{ background: "#84CC16" }} />}
              </div>
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}
      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-black text-xs font-bold mr-2 mt-1 flex-shrink-0" style={{ background: "#84CC16" }}>IA</div>
          <div className="rounded-2xl px-4 py-3" style={{ background: "#111116", border: "1px solid #1E1E2C", borderRadius: "4px 16px 16px 16px" }}>
            <div className="flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#84CC16", animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#84CC16", animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#84CC16", animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
