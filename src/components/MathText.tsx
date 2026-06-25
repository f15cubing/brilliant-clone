import { Fragment, type ReactNode } from "react";
import { InlineMath } from "react-katex";

/** Renders a leaf string with **bold**, *italic* and `code` markup. */
function markup(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|`([^`]+)`|\*([^*]+)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const key = `${keyBase}-${i++}`;
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={key} className="font-semibold text-ink">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined) {
      nodes.push(
        <code
          key={key}
          className="rounded-sm bg-panel px-1 py-0.5 font-mono text-[0.92em] text-ultramarine"
        >
          {m[2]}
        </code>,
      );
    } else if (m[3] !== undefined) {
      nodes.push(
        <em key={key} className="italic">
          {m[3]}
        </em>,
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/**
 * Renders text with inline KaTeX (`$...$`) plus lightweight markdown
 * (bold/italic/code). Used for prompts, options, explanations and concepts.
 */
export function MathText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  const segments = children.split(/(\$[^$]+\$)/g);
  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (seg.startsWith("$") && seg.endsWith("$") && seg.length > 2) {
          return <InlineMath key={idx} math={seg.slice(1, -1)} />;
        }
        return <Fragment key={idx}>{markup(seg, String(idx))}</Fragment>;
      })}
    </span>
  );
}
