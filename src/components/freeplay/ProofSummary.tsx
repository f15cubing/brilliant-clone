import { MathText } from "@/components/MathText";
import { factLabel } from "@/lib/freeplay/dsl";
import type { FactEntry } from "@/lib/freeplay/proof";

/** Renders the assembled proof once the goal has been reached. */
export function ProofSummary({ facts }: { facts: FactEntry[] }) {
  const steps = facts.filter((f) => f.source === "derived");
  return (
    <section className="flex flex-col gap-3 rounded-sm border border-correct/40 bg-correct/5 p-4">
      <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-correct">
        Proof complete
      </h2>
      <ol className="flex list-decimal flex-col gap-2 pl-5">
        {steps.map((s) => (
          <li key={s.id} className="font-serif text-ink">
            <MathText>{factLabel(s.fact)}</MathText>{" "}
            <span className="font-mono text-xs text-ink-faint">— {s.rule}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
