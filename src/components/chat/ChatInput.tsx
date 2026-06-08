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
    <form onSubmit={handleSubmit} className="border-t border-gray-100 bg-white px-4 py-3">
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
          className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6B72]/30 focus:border-[#0B6B72] transition-colors bg-gray-50 disabled:opacity-50"
          style={{ minHeight: "42px", maxHeight: "120px" }}
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="w-10 h-10 bg-[#0B6B72] hover:bg-[#084F57] disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
    </form>
  );
}
