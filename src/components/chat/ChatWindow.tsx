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
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          Posez votre première question pédagogique…
        </div>
      )}
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
          {msg.role === "assistant" && (
            <div className="w-7 h-7 rounded-full bg-[#006633] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 flex-shrink-0">
              IA
            </div>
          )}
          <div
            className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-[#006633] text-white rounded-tr-sm"
                : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
            }`}
          >
            {msg.role === "assistant" ? (
              <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
                {msg.streaming && <span className="inline-block w-1.5 h-4 bg-[#006633] animate-pulse ml-0.5 align-middle" />}
              </div>
            ) : (
              msg.content
            )}
          </div>
        </div>
      ))}
      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
        <div className="flex justify-start">
          <div className="w-7 h-7 rounded-full bg-[#006633] flex items-center justify-center text-white text-xs font-bold mr-2 mt-1">IA</div>
          <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
