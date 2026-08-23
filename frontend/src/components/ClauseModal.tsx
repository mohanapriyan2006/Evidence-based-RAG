import React, { useEffect, useState } from "react";
import { getSource } from "../api/client";
import { ClauseDetail } from "../types";

interface ClauseModalProps {
  clauseId: string | null;
  onClose: () => void;
}

export const ClauseModal: React.FC<ClauseModalProps> = ({ clauseId, onClose }) => {
  const [clause, setClause] = useState<ClauseDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!clauseId) {
      setClause(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getSource(clauseId)
      .then((data) => {
        if (isMounted) {
          setClause(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to load clause detail");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clauseId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!clauseId) return null;

  const copyText = async () => {
    if (clause?.text) {
      await navigator.clipboard.writeText(`[${clause.id} ${clause.section}] ${clause.text}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm grounded-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-[#1a1a1e] p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-mono text-sm font-bold shadow-inner">
              §
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  {clauseId.startsWith("§") ? clauseId : `§${clauseId}`}
                </h3>
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                  Verified Evidence
                </span>
              </div>
              <p className="text-xs text-white/50">Full Policy Manual Clause Record</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-8 items-center justify-center rounded-full text-white/40 transition hover:bg-white/10 hover:text-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="py-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 space-y-3">
              <div className="size-7 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              <span className="text-xs font-mono text-white/50">Fetching clause from policy API...</span>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-center">
              <p className="text-xs font-semibold text-rose-400">{error}</p>
              <p className="mt-1 text-[11px] text-white/40">Ensure backend server is running at http://localhost:8000</p>
            </div>
          )}

          {!loading && !error && clause && (
            <div className="space-y-4">
              {/* Part & Section Context */}
              <div className="rounded-2xl bg-white/[0.04] p-3.5 border border-white/[0.06] space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/80">
                  {clause.part}
                </div>
                <div className="text-sm font-semibold text-white/90">
                  {clause.section}
                </div>
              </div>

              {/* Clause Body Text */}
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
                  Verbatim Clause Text
                </div>
                <div className="relative rounded-2xl border border-white/10 bg-[#121214] p-4 text-[14px] leading-relaxed text-white/90 shadow-inner">
                  "{clause.text}"
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {!loading && !error && clause && (
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={copyText}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-white/80 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>{copied ? "Copied to Clipboard!" : "Copy Clause"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20 active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClauseModal;
