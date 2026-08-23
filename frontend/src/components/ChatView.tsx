import React from "react";
import { Message } from "../types";
import StreamingText, { SourceItem } from "./StreamingText";

interface ChatViewProps {
  messages: Message[];
  loading: boolean;
  starterQuestions: string[];
  onSubmitQuestion: (question: string) => void;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  messages,
  loading,
  starterQuestions,
  onSubmitQuestion,
  bottomRef,
}) => {
  return (
    <main className="flex-1 overflow-y-auto px-4 pb-36 pt-6 md:px-8">
      {messages.length === 0 ? (
        <div className="mx-auto flex h-full max-w-2xl flex-col justify-center pb-12 pt-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] shadow-inner">
              <span className="font-mono text-xl font-bold text-emerald-400">GA</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              Ask about the policy manual
            </h1>
            <p className="mt-3 text-sm text-white/50">
              Answers are grounded strictly on verified evidence from official policy documentation.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {starterQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onSubmitQuestion(question)}
                className="group rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 text-left text-sm font-medium text-white/70 transition-all duration-200 hover:border-emerald-500/40 hover:bg-white/[0.05] hover:text-white hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <p className="line-clamp-3 leading-relaxed">{question}</p>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-emerald-400 opacity-0 transition-opacity group-hover:opacity-100">
                  <span>Ask this</span>
                  <span>→</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-8">
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end grounded-fade-in">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs border border-white/10 bg-[#242428] px-5 py-3 text-[15px] leading-relaxed text-white/90 shadow-md">
                  {m.content}
                </div>
              </div>
            ) : (
              <StreamingText
                key={m.id}
                answer={m.content}
                sources={
                  m.sources
                    ? m.sources.map((s): SourceItem => ({
                        id: s.id,
                        label: s.part || s.id,
                        section: s.section,
                        text: s.text,
                      }))
                    : []
                }
                status={m.status}
                loop={false}
                fill
                followUps={m.followUps}
                onSelectFollowUp={onSubmitQuestion}
                onRegenerate={() => {
                  const lastUser = [...messages].reverse().find((msg) => msg.role === "user");
                  if (lastUser) onSubmitQuestion(lastUser.content);
                }}
              />
            ),
          )}

          {loading && <StreamingText loading fill loop={false} />}

          <div ref={bottomRef} />
        </div>
      )}
    </main>
  );
};

export default ChatView;
