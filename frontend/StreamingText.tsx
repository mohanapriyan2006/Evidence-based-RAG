import { useEffect, useMemo, useState } from "react";

type Source = {
  id: string;
  label: string;
  section?: string;
};

type StreamingTextProps = {
  answer?: string;
  sources?: Source[];
  loading?: boolean;
  loop?: boolean;
  fill?: boolean;
  onDone?: () => void;
};

const FALLBACK_ANSWER =
  "The program is available to applicants who meet the eligibility conditions stated in the policy. The applicable requirements should be checked against the cited clauses before making a final determination.";

const FALLBACK_SOURCES: Source[] = [
  { id: "1", label: "Policy manual", section: "§2.1.1" },
  { id: "2", label: "Eligibility requirements", section: "§2.1.3" },
];

function Icon({
  name,
  size = 17,
}: {
  name: "copy" | "refresh" | "up" | "down" | "chevron";
  size?: number;
}) {
  const paths = {
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    refresh: <path d="M20 11a8.5 8.5 0 1 0 1 4.8M20 4v7h-7" />,
    up: (
      <>
        <path d="M7 10v11" />
        <path d="M14.8 5.8 14 10h5.7a2 2 0 0 1 1.9 2.6l-2.1 7.3a2 2 0 0 1-1.9 1.5H4a2 2 0 0 1-2-2v-7.2a2 2 0 0 1 2-2h2.8a2 2 0 0 0 1.8-1.1L11.8 3a2.3 2.3 0 0 1 3 2.8Z" />
      </>
    ),
    down: (
      <>
        <path d="M17 14V3" />
        <path d="M9.2 18.2 10 14H4.3a2 2 0 0 1-1.9-2.6l2.1-7.3A2 2 0 0 1 6.4 2.6H17a2 2 0 0 1 2 2v7.2a2 2 0 0 1-2 2h-2.8a2 2 0 0 0-1.8 1.1l-3.2 6.1a2.3 2.3 0 0 1-2-2.8Z" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

export default function StreamingText({
  answer = FALLBACK_ANSWER,
  sources = FALLBACK_SOURCES,
  loading = false,
  loop = false,
  fill = true,
  onDone,
}: StreamingTextProps) {
  const [visible, setVisible] = useState(loading ? 0 : answer.length);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => answer || FALLBACK_ANSWER, [answer]);

  useEffect(() => {
    if (loading) {
      setVisible(0);
      return;
    }

    if (!loop) {
      setVisible(text.length);
      onDone?.();
      return;
    }

    setVisible(0);
    let index = 0;

    const timer = window.setInterval(() => {
      index += Math.max(1, Math.ceil(text.length / 80));
      setVisible(Math.min(index, text.length));

      if (index >= text.length) {
        window.clearInterval(timer);
        onDone?.();
      }
    }, 24);

    return () => window.clearInterval(timer);
  }, [loading, loop, text, onDone]);

  const shownText = text.slice(0, visible);
  const done = visible >= text.length && !loading;

  async function copyAnswer() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className={fill ? "w-full" : "w-full max-w-3xl"}>
      <div className="group">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-[11px] font-semibold text-white">
            GA
          </div>
          <span className="text-[13px] font-medium text-white/80">
            Grounded Answer
          </span>
        </div>

        <div className="max-w-3xl text-[15px] leading-7 text-white/90">
          {loading ? (
            <div className="flex items-center gap-1.5 py-2">
              <span className="size-1.5 animate-pulse rounded-full bg-white/50" />
              <span className="size-1.5 animate-pulse rounded-full bg-white/35 [animation-delay:120ms]" />
              <span className="size-1.5 animate-pulse rounded-full bg-white/20 [animation-delay:240ms]" />
            </div>
          ) : (
            <>
              {shownText}
              {!done && (
                <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-white/70" />
              )}
            </>
          )}
        </div>

        <div
          className={`mt-4 flex items-center gap-1 transition-opacity ${
            done ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          <button
            type="button"
            onClick={copyAnswer}
            aria-label="Copy answer"
            className="flex size-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          >
            <Icon name="copy" />
          </button>

          <button
            type="button"
            aria-label="Regenerate answer"
            className="flex size-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          >
            <Icon name="refresh" />
          </button>

          <button
            type="button"
            aria-label="Helpful"
            className="flex size-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          >
            <Icon name="up" />
          </button>

          <button
            type="button"
            aria-label="Not helpful"
            className="flex size-8 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/80"
          >
            <Icon name="down" />
          </button>

          <button
            type="button"
            onClick={() => setSourcesOpen((value) => !value)}
            className="ml-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/50 transition hover:bg-white/[0.05] hover:text-white/80"
          >
            <span className="flex -space-x-1">
              {sources.slice(0, 3).map((source) => (
                <span
                  key={source.id}
                  className="flex size-5 items-center justify-center rounded-full border-2 border-[#181818] bg-white/[0.12] text-[8px] font-medium text-white/70"
                >
                  {source.id}
                </span>
              ))}
            </span>
            <span>{sources.length} sources</span>
            <Icon name="chevron" size={13} />
          </button>

          {copied && (
            <span className="ml-1 text-xs text-white/45">Copied</span>
          )}
        </div>

        {sourcesOpen && done && (
          <div className="mt-2 max-w-2xl overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.035]">
            {sources.map((source) => (
              <div
                key={source.id}
                className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-2.5 last:border-0"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white/[0.07] text-[10px] text-white/60">
                  {source.id}
                </span>
                <span className="text-sm text-white/75">{source.label}</span>
                {source.section && (
                  <span className="ml-auto font-mono text-[11px] text-white/35">
                    {source.section}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
