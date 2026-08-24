import { useEffect, useRef, useState } from "react";
import { askQuestion } from "./api/client";
import { Message, QuickAction } from "./types";
import ChatView from "./components/ChatView";
import ChatInput from "./components/ChatInput";
import ClauseModal from "./components/ClauseModal";

const STARTER_QUESTIONS = [
  "Who is eligible for the program?",
  "What is the monthly earnings disregard for a claim in February 2026 vs April 2026?",
  "How many days to report a change of circumstances?",
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Earnings Disregard (Pre-March)",
    desc: "February 2026 claim ($120/mo)",
    prompt: "What is the monthly earnings disregard for a claim dated February 2026?",
    icon: (
      <svg className="size-4 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Earnings Disregard (Post-March)",
    desc: "April 2026 claim ($175/mo)",
    prompt: "What is the monthly earnings disregard for a claim dated April 2026?",
    icon: (
      <svg className="size-4 shrink-0 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Reporting Changes Deadline",
    desc: "10 days (Pre-March) vs 14 days (Post-March)",
    prompt: "How many calendar days do I have to report a change of circumstances?",
    icon: (
      <svg className="size-4 shrink-0 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: "Countable Income Definition",
    desc: "Earned vs unearned rules",
    prompt: "How is countable income defined?",
    icon: (
      <svg className="size-4 shrink-0 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    label: "Identify Contradictions",
    desc: "Detect conflicting policy clauses",
    prompt: "Can an overpayment be recovered after six years?",
    icon: (
      <svg className="size-4 shrink-0 text-rose-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Policy Refusal Criteria",
    desc: "Unanswerable & evidence gaps",
    prompt: "What is the department's phone number?",
    icon: (
      <svg className="size-4 shrink-0 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      </svg>
    ),
  },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [claimDate, setClaimDate] = useState<string>("2026-04-01");

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const submitQuestion = async (question: string) => {
    const q = question.trim();
    if (!q || loading) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setMessages((prev) => [...prev, { id: makeId(), role: "user", content: q, claim_date: claimDate }]);
    setLoading(true);

    try {
      const data = await askQuestion(q, claimDate);
      
      const dynamicFollowUps = [
        `What specific clauses govern ${q.split(" ").slice(-2).join(" ")}?`,
        "How does Amendment No. 2026-01 alter this rule?",
        "Are there transitional provisions under §5.1 - §5.3?",
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
          claim_date: data.claim_date || claimDate,
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

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <div className="flex h-screen flex-col bg-[#141415] text-[#ececec] antialiased selection:bg-white/20 selection:text-white">
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

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-white/80">
            <span className="text-[11px] text-white/50">Date of Claim:</span>
            <select
              value={claimDate}
              onChange={(e) => setClaimDate(e.target.value)}
              className="bg-transparent font-medium text-emerald-400 focus:outline-none cursor-pointer"
            >
              <option value="2026-04-01" className="bg-[#1e1e20] text-white">Post-March 2026 (Amendment 2026-01)</option>
              <option value="2026-02-15" className="bg-[#1e1e20] text-white">Pre-March 2026 (Feb 2026 Claim)</option>
            </select>
          </div>

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

      {/* Main Chat */}
      <ChatView
        messages={messages}
        loading={loading}
        starterQuestions={STARTER_QUESTIONS}
        onSubmitQuestion={submitQuestion}
        onSelectClause={(id) => setSelectedClauseId(id)}
        bottomRef={bottomRef}
      />

      {/* Input Bar */}
      <ChatInput
        input={input}
        setInput={setInput}
        loading={loading}
        onSubmitQuestion={submitQuestion}
        quickActions={QUICK_ACTIONS}
        textareaRef={textareaRef}
      />

      {/* Clause Evidence Modal */}
      <ClauseModal
        clauseId={selectedClauseId}
        onClose={() => setSelectedClauseId(null)}
      />
    </div>
  );
}

