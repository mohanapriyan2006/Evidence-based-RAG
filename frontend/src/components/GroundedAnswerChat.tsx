import { FormEvent, useEffect, useRef, useState } from "react";
import StreamingText from "../../StreamingText";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; label: string; section?: string }[];
};

const STARTER_QUESTIONS = [
  "Who is eligible for the program?",
  "What documents are required?",
  "When can an application be refused?",
];

export default function GroundedAnswerChat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function ask(question: string) {
    const value = question.trim();
    if (!value || loading) return;

    setInput("");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", content: value },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
      });

      if (!response.ok) throw new Error("Request failed");

      const data = await response.json();

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.answer ?? data.message ?? "No answer was returned.",
          sources: data.sources ?? data.citations ?? [],
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I couldn't connect to the policy service. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(input);
  }

  return (
    <main className="min-h-screen bg-[#181818] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col">
        <header className="flex h-14 items-center justify-between px-5 md:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-white text-[10px] font-bold text-black">
              GA
            </div>
            <span className="text-sm font-medium text-white/90">
              Grounded Answer
            </span>
          </div>

          <button className="rounded-lg px-3 py-1.5 text-xs text-white/45 transition hover:bg-white/[0.05] hover:text-white/75">
            New chat
          </button>
        </header>

        <section className="flex flex-1 flex-col px-4 pb-36 pt-8 md:px-8">
          {messages.length === 0 ? (
            <div className="m-auto w-full max-w-2xl pb-20">
              <div className="mb-8 text-center">
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  Ask about the policy
                </h1>
                <p className="mt-3 text-sm text-white/40">
                  Answers are based only on the supplied policy manual.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {STARTER_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => ask(question)}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 text-left text-sm text-white/60 transition hover:border-white/[0.14] hover:bg-white/[0.05] hover:text-white/85"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-9">
              {messages.map((message) =>
                message.role === "user" ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl bg-white/[0.08] px-4 py-2.5 text-[15px] leading-6 text-white/90">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <StreamingText
                    key={message.id}
                    answer={message.content}
                    sources={message.sources}
                    loop={false}
                    fill
                  />
                ),
              )}

              {loading && (
                <StreamingText
                  loading
                  loop={false}
                  fill
                />
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </section>

        <div className="fixed inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#181818] via-[#181818]/95 to-transparent px-3 pb-4 pt-12 md:pb-6">
          <form onSubmit={submit} className="mx-auto max-w-3xl">
            <div className="flex min-h-14 items-end gap-2 rounded-2xl border border-white/[0.12] bg-[#212121] px-3 py-2 shadow-2xl shadow-black/30 transition focus-within:border-white/[0.2]">
              <button
                type="button"
                aria-label="Add"
                className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-xl text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
              >
                +
              </button>

              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submit(event);
                  }
                }}
                rows={1}
                placeholder="Ask a question about the policy"
                className="max-h-32 min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] leading-5 text-white outline-none placeholder:text-white/30"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                aria-label="Send"
                className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-white/25"
              >
                ↑
              </button>
            </div>

            <p className="mt-2 text-center text-[11px] text-white/25">
              Grounded responses use evidence from the policy manual.
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
