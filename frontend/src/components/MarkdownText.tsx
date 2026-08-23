import React from "react";

interface MarkdownTextProps {
  content: string;
  onSelectClause?: (clauseId: string) => void;
  onOpenSources?: () => void;
}

export const MarkdownText: React.FC<MarkdownTextProps> = ({
  content,
  onSelectClause,
  onOpenSources,
}) => {
  const parseInline = (text: string) => {
    // Matches citation badges like [§1.4.7], bold **text**, italic *text*, inline code `code`
    const regex = /(\[§?[0-9]+(?:\.[0-9]+)+\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (!part) return null;

      // Citation badge: [§1.4.7]
      if (part.startsWith("[") && part.endsWith("]")) {
        const label = part.slice(1, -1);
        return (
          <span
            key={index}
            onClick={() => (onSelectClause ? onSelectClause(label) : onOpenSources?.())}
            className="inline-citation-badge mx-0.5 cursor-pointer hover:bg-emerald-500/25 active:scale-95 transition-all"
            title={`Click to inspect policy clause: ${label}`}
          >
            <span className="flex size-3.5 items-center justify-center rounded-full bg-emerald-500/20 text-[9px] font-mono">
              §
            </span>
            <span>{label}</span>
          </span>
        );
      }

      // Bold **text**
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Italic *text*
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={index} className="italic text-white/80">
            {part.slice(1, -1)}
          </em>
        );
      }

      // Code `code`
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={index}
            className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-emerald-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }

      return <span key={index}>{part}</span>;
    });
  };

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: { text: string; num?: string }[] = [];

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      const isNumbered = Boolean(listItems[0].num);
      elements.push(
        isNumbered ? (
          <ol key={`ol-${key}`} className="my-2.5 space-y-1.5 pl-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[15px] leading-relaxed text-white/90">
                <span className="font-mono text-xs font-bold text-emerald-400 shrink-0 pt-0.5">
                  {item.num}.
                </span>
                <div>{parseInline(item.text)}</div>
              </li>
            ))}
          </ol>
        ) : (
          <ul key={`ul-${key}`} className="my-2.5 space-y-1.5 pl-2">
            {listItems.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-[15px] leading-relaxed text-white/90">
                <span className="size-1.5 shrink-0 rounded-full bg-emerald-400 mt-2.5" />
                <div>{parseInline(item.text)}</div>
              </li>
            ))}
          </ul>
        )
      );
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(idx);
      elements.push(<div key={`space-${idx}`} className="h-2" />);
      return;
    }

    // Headings: ###, ##, #
    if (trimmed.startsWith("#")) {
      flushList(idx);
      if (trimmed.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${idx}`} className="mt-4 mb-2 text-base font-bold text-white tracking-tight">
            {parseInline(trimmed.slice(4))}
          </h3>
        );
        return;
      }
      if (trimmed.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${idx}`} className="mt-5 mb-2 text-lg font-bold text-white tracking-tight">
            {parseInline(trimmed.slice(3))}
          </h2>
        );
        return;
      }
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1 key={`h1-${idx}`} className="mt-6 mb-3 text-xl font-extrabold text-white tracking-tight">
            {parseInline(trimmed.slice(2))}
          </h1>
        );
        return;
      }
    }

    // Bullet lists: - item, * item
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      listItems.push({ text: bulletMatch[1] });
      return;
    }

    // Numbered lists: 1. item, 2. item
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numberMatch) {
      listItems.push({ num: numberMatch[1], text: numberMatch[2] });
      return;
    }

    // Blockquote: > text
    if (trimmed.startsWith(">")) {
      flushList(idx);
      elements.push(
        <blockquote
          key={`quote-${idx}`}
          className="my-2 border-l-2 border-emerald-400 bg-white/[0.03] py-2 pl-3.5 pr-3 text-sm italic text-white/80 rounded-r-xl"
        >
          {parseInline(trimmed.slice(1).trim())}
        </blockquote>
      );
      return;
    }

    // Standard paragraph line
    flushList(idx);
    elements.push(
      <p key={`p-${idx}`} className="leading-relaxed text-white/90">
        {parseInline(line)}
      </p>
    );
  });

  flushList(lines.length);

  return <div className="space-y-1 text-[15px]">{elements}</div>;
};

export default MarkdownText;
