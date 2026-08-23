import { useEffect, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { askQuestion } from "./api/client";
import { Citation } from "./types";
import StreamingText, { SourceItem } from "./components/StreamingText";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "answered" | "refused" | "conflict" | "error";
  sources?: Citation[];
  followUps?: string[];
};

const STARTER_QUESTIONS = [
  "Who is eligible for the program?",
  "What documents are required for proof of income?",
  "When can an application be refused or delayed?",
];

const MODELS = [
  { id: "vanilla-1", name: "Vanilla 1", desc: "Fast general policy query" },
  { id: "grounded-rag", name: "Grounded RAG v2", desc: "High precision evidence retrieval" },
  { id: "strict-policy", name: "Strict Policy Mode", desc: "No extrapolation allowed" },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Vanilla 1");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const submitQuestion = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setMessages((prev) => [...prev, { id: makeId(), role: "user", content: q }]);
    setLoading(true);

    try {
      const data = await askQuestion(q);
      
      // Dynamic follow-ups generation based on response context
      const dynamicFollowUps = [
        `What specific clauses govern ${q.split(" ").slice(-2).join(" ")}?`,
        "Are there any exceptions or policy overrides?",
        "How can I submit an appeal if denied?",
      ];

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: data.answer,
          status: data.status,
          sources: data.sources,
          followUps: dynamicFollowUps,
        },
      ]);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to connect to the policy service.";
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: message,
          status: "error",
          followUps: ["Try rephrasing the question", "Check policy backend connection"],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault();
    submitQuestion(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) submitQuestion(input);
    }
  };

  const handleTextareaInput = (e: FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  const toggleMic = () => {
    setIsListening((prev) => !prev);
    if (!isListening) {
      // Speech simulation fallback feedback
      const speechSamples = [
        "What are the eligibility requirements for family coverage?",
        "Compare gelato and soft serve margins",
        "Which policy sections detail application refusal reasons?",
      ];
      const randomSample = speechSamples[Math.floor(Math.random() * speechSamples.length)];
      setTimeout(() => {
        setInput(randomSample);
        setIsListening(false);
      }, 2000);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[#141415] text-[#ececec] antialiased selection:bg-white/20 selection:text-white">
      {/* Sleek Navigation Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#141415]/80 px-4 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[11px] font-bold text-black shadow-md shadow-emerald-500/10">
            GA
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white/90">
              Grounded Answer
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewChat}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <span>+</span>
            <span>New chat</span>
          </button>
        </div>
      </header>

      {/* Main Chat Container */}
      <main className="flex-1 overflow-y-auto px-4 pb-36 pt-6 md:px-8">
        {messages.length === 0 ? (
          /* Empty / Welcome Starter Screen */
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
              {STARTER_QUESTIONS.map((question) => (
                <button
                  key={question}
                  type="button"
                  onClick={() => submitQuestion(question)}
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
          /* Message List */
          <div className="mx-auto w-full max-w-3xl space-y-8">
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end grounded-fade-in">
                  <div className="max-w-[85%] rounded-2xl rounded-tr-xs border border-white/10 bg-[#242428] px-4.5 py-3 text-[15px] leading-relaxed text-white/90 shadow-md">
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
                  onSelectFollowUp={submitQuestion}
                  onRegenerate={() => {
                    const lastUser = [...messages].reverse().find((msg) => msg.role === "user");
                    if (lastUser) submitQuestion(lastUser.content);
                  }}
                />
              ),
            )}

            {loading && <StreamingText loading fill loop={false} />}

            <div ref={bottomRef} />
          </div>
        )}
      </main>

      {/* Fixed Capsule Prompt Input Bar (Image 2 Match) */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-[#141415] via-[#141415]/95 to-transparent px-3 pb-5 pt-10 md:pb-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
          <div className="capsule-input-container relative flex min-h-[54px] items-center gap-2 rounded-full border border-white/[0.12] px-3.5 py-1.5 transition-all duration-200">
            {/* Left '+' Attachment Button */}
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

              {/* Tools Menu Drawer */}
              {showToolsMenu && (
                <div className="absolute bottom-12 left-0 w-56 rounded-2xl border border-white/10 bg-[#1c1c1e] p-2 shadow-2xl backdrop-blur-xl">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                    Quick Actions
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInput("Compare gelato and soft serve margins");
                      setShowToolsMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-white/80 transition hover:bg-white/10"
                  >
                    <span>📊</span> Compare Financial Margins
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInput("Which policy sections cover refusal criteria?");
                      setShowToolsMenu(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium text-white/80 transition hover:bg-white/10"
                  >
                    <span>📜</span> Policy Refusal Criteria
                  </button>
                </div>
              )}
            </div>

            {/* Input Textarea */}
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

            {/* Right Tools Container  */}
            <div className="flex shrink-0 items-center gap-2">
              {/* Send Button */}
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
    </div>
  );
}
