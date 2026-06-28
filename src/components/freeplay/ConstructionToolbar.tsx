import {
  AUX_OPERAND_HINTS,
  AUX_SHORT,
  type AuxKind,
} from "@/lib/freeplay/auxConstructions";

const TOOLS: AuxKind[] = [
  "midpoint",
  "foot",
  "inter_ll",
  "inter_lc",
  "inter_cc",
  "reflect_point",
  "reflect_line",
];

/**
 * The auxiliary-construction palette for the freeplay arena. Pick a tool, then
 * click points on the figure to build a new point (midpoint, foot, intersection,
 * reflection). The constructed point's defining fact becomes a citable premise.
 */
export function ConstructionToolbar({
  activeTool,
  onSelect,
  operands,
  auxCount,
  onUndo,
  className,
}: {
  activeTool: AuxKind | null;
  onSelect: (tool: AuxKind | null) => void;
  operands: string[];
  auxCount: number;
  onUndo: () => void;
  className?: string;
}) {
  const hint = activeTool
    ? `Click the ${AUX_OPERAND_HINTS[activeTool][operands.length] ?? "point"}${
        operands.length ? ` — chosen: ${operands.join(", ")}` : ""
      }`
    : "Pick a tool, then click points on the figure to add a construction.";

  return (
    <section className={className}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-[#7a3ea8]">
          Add construction
        </h2>
        {auxCount > 0 && (
          <button
            type="button"
            onClick={onUndo}
            className="rounded-sm border border-rule px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
          >
            Undo
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TOOLS.map((tool) => {
          const active = activeTool === tool;
          return (
            <button
              key={tool}
              type="button"
              onClick={() => onSelect(active ? null : tool)}
              className={[
                "rounded-sm border px-2 py-1 font-mono text-[0.62rem] uppercase tracking-wide transition",
                active
                  ? "border-[#7a3ea8] bg-[#7a3ea8] text-paper"
                  : "border-rule text-ink-soft hover:border-ink-faint hover:text-ink",
              ].join(" ")}
            >
              {AUX_SHORT[tool]}
            </button>
          );
        })}
      </div>
      <p className="font-serif text-xs leading-snug text-ink-soft">{hint}</p>
    </section>
  );
}
