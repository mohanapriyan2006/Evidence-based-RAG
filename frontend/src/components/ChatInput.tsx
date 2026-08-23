import React, { useEffect, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { QuickAction } from "../types";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  loading: boolean;
  onSubmitQuestion: (question: string) => void;
  quickActions: QuickAction[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  loading,
  onSubmitQuestion,
  quickActions,
  textareaRef,
}) => {
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!loading && input.trim()) {
      onSubmitQuestion(input);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) {
        onSubmitQuestion(input);
      }
    }
  };

  const handleTextareaInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#141415] via-[#141415]/95 to-transparent px-3 pb-5 pt-10 md:pb-6">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="capsule-input-container relative flex min-h-[54px] items-center gap-2 rounded-full border border-white/[0.12] px-3.5 py-1.5 transition-all duration-200">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowToolsMenu((prev) => !prev)}
              aria-label="Add options"
              title="Add attachment or prompt template"
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-white/50 transition hover:bg-white/10 hover:text-white active:scale-95"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* Tools menu */}
            {showToolsMenu && (
              <div
                ref={toolsMenuRef}
                className="absolute bottom-14 left-0 w-72 max-h-96 overflow-y-auto rounded-2xl border border-white/10 bg-[#1c1c1e]/95 p-2 shadow-2xl backdrop-blur-2xl z-50 space-y-0.5"
              >
                {quickActions.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setInput(item.prompt);
                      setShowToolsMenu(false);
                      if (textareaRef.current) {
                        textareaRef.current.focus();
                      }
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/10 group/item"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] transition group-hover/item:bg-white/15">
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white/90 truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-white/40 truncate">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder="Write a message..."
            disabled={loading}
            className="max-h-36 min-h-[36px] flex-1 resize-none bg-transparent py-2 pl-1 pr-2 text-[15px] leading-relaxed text-white outline-none placeholder:text-white/35"
          />

          {/* Right Container  */}
          <div className="flex shrink-0 items-center gap-2">
            {/* Send btn */}
            <button
              type="submit"
              disabled={!input.trim() || loading}
              aria-label="Send question"
              className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                input.trim() && !loading
                  ? "bg-white text-black shadow-md shadow-white/10 hover:bg-white/90 active:scale-95"
                  : "bg-[#3a3a3c] text-white/30 cursor-not-allowed"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ChatInput;
