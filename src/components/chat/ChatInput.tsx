"use client";

import { useState, useRef } from "react";

interface Props {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const msg = value.trim();
    if (!msg || disabled) return;
    onSend(msg);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  function handleInput() {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid #1E1E2C", background: "#111116" }}>
      <div className="flex gap-2 items-end">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          rows={1}
          disabled={disabled}
          placeholder="Posez votre question pédagogique… (Entrée pour envoyer)"
          className="flex-1 resize-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#4B5563] focus:outline-none focus:ring-2 focus:ring-[#39C84A]/30 focus:border-[#39C84A] transition-colors disabled:opacity-50"
          style={{ minHeight: "42px", maxHeight: "120px", background: "#1A1A24", border: "1px solid #1E1E2C" }}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="w-10 h-10 disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 text-black font-bold"
          style={{ background: "#39C84A" }}
        >
          <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] mt-1.5" style={{ color: "#4B5563" }}>Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
    </form>
  );
}
