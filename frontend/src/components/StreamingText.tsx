import { useEffect, useMemo, useState } from "react";
import "./grounded-answer.css";

export type SourceItem = {
  id: string;
  label?: string;
  section?: string;
  text?: string;
  part?: string;
  url?: string;
};

type StreamingTextProps = {
  answer?: string;
  sources?: SourceItem[];
  status?: "answered" | "refused" | "conflict" | "error";
  loading?: boolean;
  loop?: boolean;
  fill?: boolean;
  followUps?: string[];
  onSelectFollowUp?: (question: string) => void;
  onRegenerate?: () => void;
  onDone?: () => void;
};

const FALLBACK_ANSWER =
  "Pistachio is your fastest-growing flavor — sales are up 23% this month and margins beat vanilla by 8 points. [scoopdata.io] Stone-fruit flavors are trending in the same range.";

const FALLBACK_SOURCES: SourceItem[] = [
  { id: "1", label: "scoopdata.io", section: "§3.2 Sales Metrics", text: "Pistachio sales increased by 23% MoM with margin outperforming vanilla." },
  { id: "2", label: "Market Trends Q3", section: "§4.1 Regional Demand", text: "Stone-fruit and pit-fruit variants show 20%+ growth in summer/fall transition." },
  { id: "3", label: "Inventory Ledger", section: "§1.0 Product Costs", text: "Gelato raw ingredient costs remain stable while soft-serve syrup costs increased 4%." },
];

const FALLBACK_FOLLOWUPS = [
  "Which flavors sell best in winter",
  "Compare gelato and soft serve margins",
  "What is the cost breakdown for pistachio production?",
];

function Icon({
  name,
  size = 16,
}: {
  name:
    | "copy"
    | "check"
    | "refresh"
    | "up"
    | "down"
    | "chevron"
    | "corner-arrow"
    | "external"
    | "shield-check"
    | "alert-triangle"
    | "alert-circle";
  size?: number;
}) {
  const paths = {
    copy: (
      <>
        <rect x="9" y="9" width="11" height="11" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    check: <path d="M20 6L9 17l-5-5" />,
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
    "corner-arrow": <path d="M18 9v3a2 2 0 0 1-2 2H6m4-4-4 4 4 4" />,
    external: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
    "shield-check": (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    "alert-triangle": (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    "alert-circle": (
      <>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// Source Avatar Badge Colors matching Image 1
const SOURCE_AVATAR_COLORS = [
  "bg-emerald-600 text-white",
  "bg-blue-600 text-white",
  "bg-amber-600 text-white",
  "bg-indigo-600 text-white",
  "bg-rose-600 text-white",
];

export default function StreamingText({
  answer = FALLBACK_ANSWER,
  sources = FALLBACK_SOURCES,
  status = "answered",
  loading = false,
  loop = false,
  fill = true,
  followUps = FALLBACK_FOLLOWUPS,
  onSelectFollowUp,
  onRegenerate,
  onDone,
}: StreamingTextProps) {
  const [visible, setVisible] = useState(loading ? 0 : answer.length);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [activeCitationIndex, setActiveCitationIndex] = useState<number | null>(null);

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
      index += Math.max(1, Math.ceil(text.length / 70));
      setVisible(Math.min(index, text.length));

      if (index >= text.length) {
        window.clearInterval(timer);
        onDone?.();
      }
    }, 20);

    return () => window.clearInterval(timer);
  }, [loading, loop, text, onDone]);

  const shownText = text.slice(0, visible);
  const done = visible >= text.length && !loading;

  async function copyAnswer() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  // Parse text for citations like [scoopdata.io] or [1] or [Section 2.1]
  const renderFormattedText = (rawText: string) => {
    // Regex matches pattern [something]
    const parts = rawText.split(/(\[[^\]]+\])/g);
    return parts.map((part, idx) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        const citationLabel = part.slice(1, -1);
        return (
          <span
            key={idx}
            onClick={() => setSourcesOpen(true)}
            className="inline-citation-badge"
            title={`View evidence source: ${citationLabel}`}
          >
            <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-500/20 text-[9px]">
              🍃
            </span>
            <span>{citationLabel}</span>
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <article className={`grounded-fade-in ${fill ? "w-full" : "w-full max-w-3xl"}`}>
      <div className="group">
        {/* Assistant Header & Status Badge */}
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 font-mono text-[11px] font-bold text-black shadow-md shadow-emerald-500/10">
              GA
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/90">
              Grounded Answer
            </span>
          </div>

          {/* Status Badge */}
          {!loading && status && (
            <div className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium backdrop-blur-md">
              {status === "answered" && (
                <span className="inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-400 rounded-full text-[11px]">
                  <Icon name="shield-check" size={12} /> Grounded
                </span>
              )}
              {status === "refused" && (
                <span className="inline-flex items-center gap-1 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400 rounded-full text-[11px]">
                  <Icon name="alert-triangle" size={12} /> Refused
                </span>
              )}
              {status === "conflict" && (
                <span className="inline-flex items-center gap-1 border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-rose-400 rounded-full text-[11px]">
                  <Icon name="alert-circle" size={12} /> Policy Conflict
                </span>
              )}
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="max-w-3xl text-[16px] leading-7 font-normal text-white/90 tracking-wide">
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-white/50 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="size-2 animate-pulse rounded-full bg-emerald-400" />
                <span className="size-2 animate-pulse rounded-full bg-emerald-400 [animation-delay:150ms]" />
                <span className="size-2 animate-pulse rounded-full bg-emerald-400 [animation-delay:300ms]" />
              </div>
              <span className="text-xs font-mono text-white/40">Searching policy manual & generating grounded evidence...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">
              {renderFormattedText(shownText)}
              {!done && (
                <span className="ml-1 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-emerald-400" />
              )}
            </div>
          )}
        </div>

        {/* Action Bar from Image 1 */}
        <div
          className={`mt-4 flex flex-wrap items-center gap-1.5 transition-all duration-200 ${
            done ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
        >
          {/* Copy Button */}
          <button
            type="button"
            onClick={copyAnswer}
            aria-label="Copy answer"
            title="Copy answer to clipboard"
            className="flex size-8 items-center justify-center rounded-lg border border-transparent text-white/40 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white/90"
          >
            {copied ? <Icon name="check" size={15} /> : <Icon name="copy" size={15} />}
          </button>

          {/* Regenerate Button */}
          <button
            type="button"
            onClick={onRegenerate}
            aria-label="Regenerate answer"
            title="Regenerate answer"
            className="flex size-8 items-center justify-center rounded-lg border border-transparent text-white/40 transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white/90"
          >
            <Icon name="refresh" size={15} />
          </button>

          {/* Thumbs Up Button */}
          <button
            type="button"
            onClick={() => setFeedback(feedback === "up" ? null : "up")}
            aria-label="Helpful"
            title="Helpful"
            className={`flex size-8 items-center justify-center rounded-lg border transition ${
              feedback === "up"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                : "border-transparent text-white/40 hover:border-white/10 hover:bg-white/[0.06] hover:text-white/90"
            }`}
          >
            <Icon name="up" size={15} />
          </button>

          {/* Thumbs Down Button */}
          <button
            type="button"
            onClick={() => setFeedback(feedback === "down" ? null : "down")}
            aria-label="Not helpful"
            title="Not helpful"
            className={`flex size-8 items-center justify-center rounded-lg border transition ${
              feedback === "down"
                ? "border-rose-500/40 bg-rose-500/15 text-rose-400"
                : "border-transparent text-white/40 hover:border-white/10 hover:bg-white/[0.06] hover:text-white/90"
            }`}
          >
            <Icon name="down" size={15} />
          </button>

          {/* Overlapping Sources Button (Exact Match from Image 1) */}
          {sources.length > 0 && (
            <button
              type="button"
              onClick={() => setSourcesOpen((prev) => !prev)}
              className="ml-2 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70 shadow-sm transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              {/* Overlapping Avatars */}
              <span className="flex -space-x-1.5">
                {sources.slice(0, 3).map((source, i) => (
                  <span
                    key={source.id || i}
                    className={`flex size-4.5 items-center justify-center rounded-full border border-[#181818] font-bold text-[8px] ${
                      SOURCE_AVATAR_COLORS[i % SOURCE_AVATAR_COLORS.length]
                    }`}
                  >
                    {source.id ? source.id.slice(0, 2) : i + 1}
                  </span>
                ))}
              </span>
              <span className="font-medium">{sources.length} sources</span>
              <span className={`transition-transform duration-200 ${sourcesOpen ? "rotate-180" : ""}`}>
                <Icon name="chevron" size={12} />
              </span>
            </button>
          )}

          {copied && <span className="ml-2 text-xs font-medium text-emerald-400">Copied!</span>}
        </div>

        {/* Collapsible Source Evidence Drawer */}
        {sourcesOpen && done && sources.length > 0 && (
          <div className="mt-3.5 max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c1e]/90 p-1 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/50">
                Grounded Evidence Sources ({sources.length})
              </span>
              <button
                type="button"
                onClick={() => setSourcesOpen(false)}
                className="text-xs text-white/40 hover:text-white/80"
              >
                Close
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto divide-y divide-white/[0.05]">
              {sources.map((source, idx) => (
                <div
                  key={source.id || idx}
                  className="p-3 transition hover:bg-white/[0.03]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-5 items-center justify-center rounded bg-emerald-500/20 text-[10px] font-mono font-bold text-emerald-400">
                        {source.id || idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-white/90">
                        {source.label || source.part || `Source #${source.id}`}
                      </span>
                    </div>
                    {source.section && (
                      <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/50">
                        {source.section}
                      </span>
                    )}
                  </div>
                  {source.text && (
                    <p className="mt-1.5 text-xs text-white/70 leading-relaxed font-sans pl-7">
                      "{source.text}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-ups Section from Image 1 */}
        {done && followUps && followUps.length > 0 && (
          <div className="mt-6 border-t border-white/[0.06] pt-4">
            <h4 className="mb-2.5 text-xs font-medium text-white/40 tracking-wide">
              Follow-ups
            </h4>
            <div className="flex flex-col gap-1.5">
              {followUps.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectFollowUp?.(item)}
                  className="followup-item flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 text-left text-sm text-white/85 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
                >
                  <span className="flex shrink-0 text-white/40">
                    <Icon name="corner-arrow" size={15} />
                  </span>
                  <span className="flex-1 font-medium">{item}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
