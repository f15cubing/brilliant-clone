import { MathText } from "@/components/MathText";
import { factLabel } from "@/lib/freeplay/dsl";
import type { FactEntry } from "@/lib/freeplay/proof";
// R2-D2 (proof archive): the win panel surfaces the save confirmation.
import type { ProofSaveState } from "@/lib/freeplay/useProofRecorder";

/** R2-D2: confirmation copy for the proof-archive save status. */
function saveLine(save: ProofSaveState): { text: string; tone: string } | null {
  switch (save.status) {
    case "saved":
      return save.scope === "cloud"
        ? { text: "Proof saved to your profile.", tone: "text-correct" }
        : { text: "Proof saved on this device.", tone: "text-correct" };
    case "error":
      return { text: "Couldn't save proof.", tone: "text-vermilion" };
    default:
      return null; // idle (incl. test mode) / saving -> no line
  }
}

/** Renders the assembled proof once the goal has been reached. */
export function ProofSummary({
  facts,
  save,
}: {
  facts: FactEntry[];
  // R2-D2 (proof archive): optional so existing/other callers are unaffected.
  save?: ProofSaveState;
}) {
  const steps = facts.filter((f) => f.source === "derived");
  const line = save ? saveLine(save) : null;
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
      {line && (
        <p className={`font-mono text-xs ${line.tone}`}>{line.text}</p>
      )}
    </section>
  );
}
