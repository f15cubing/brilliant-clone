import { MathText } from "@/components/MathText";
import { factLabel } from "@/lib/freeplay/dsl";
import type { FactEntry } from "@/lib/freeplay/proof";

/** The running list of established facts (given hypotheses + derived steps). */
export function FactList({
  facts,
  className,
}: {
  facts: FactEntry[];
  className?: string;
}) {
  return (
    <section
      className={
        className ??
        "flex flex-col gap-3 rounded-sm border border-rule bg-panel-soft p-4"
      }
    >
      <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ultramarine">
        Established facts
      </h2>
      <ol className="flex flex-col gap-2">
        {facts.map((f, idx) => (
          <li
            key={f.id}
            className="flex gap-2.5 border-b border-rule/60 pb-2 last:border-b-0 last:pb-0"
          >
            <span className="mt-0.5 font-mono text-xs text-ink-faint">{idx + 1}.</span>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-ink">
                <MathText>{factLabel(f.fact)}</MathText>
              </p>
              {f.source === "given" ? (
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                  given
                </span>
              ) : f.source === "construction" ? (
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-[#7a3ea8]">
                  construction
                </span>
              ) : (
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-correct">
                  {f.rule}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
