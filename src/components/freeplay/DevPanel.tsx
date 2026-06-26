import { useMemo, useState } from "react";
import { MathText } from "@/components/MathText";
import { canonicalKey, factLabel, type Fact } from "@/lib/freeplay/dsl";
import type { VarBindings, Coords } from "@/lib/freeplay/check";
import { deriveAll, type VerifyResult } from "@/lib/freeplay/verify";

export interface LastAttempt {
  fact: Fact;
  holds: boolean;
  result: VerifyResult;
}

/**
 * Dev-only diagnostics: shows why the last assertion was accepted/rejected and
 * lists every fact the engine can currently derive in one step. Helps confirm
 * the checker is behaving and shows which next statements will be accepted.
 */
export function DevPanel({
  coords,
  bindings,
  facts,
  last,
}: {
  coords: Coords;
  bindings: VarBindings;
  facts: Fact[];
  last: LastAttempt | null;
}) {
  const [show, setShow] = useState(false);

  const derivable = useMemo(
    () => (show ? deriveAll(facts, coords, bindings) : []),
    [show, facts, coords, bindings],
  );

  return (
    <section className="flex flex-col gap-2 rounded-sm border border-dashed border-ink-faint/50 bg-panel/40 p-3">
      <h2 className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-ink-faint">
        Engine diagnostics (dev)
      </h2>

      {last && (
        <div className="font-mono text-[0.7rem] leading-relaxed text-ink-soft">
          <div>
            last: <span className="text-ink">{canonicalKey(last.fact)}</span>
          </div>
          <div>
            numerically true:{" "}
            <span className={last.holds ? "text-correct" : "text-vermilion"}>
              {String(last.holds)}
            </span>
            {"  ·  result: "}
            <span className="text-ink">
              {last.result.valid
                ? `valid (${last.result.rule})`
                : last.result.reason}
            </span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="self-start rounded-sm border border-rule px-2 py-1 font-mono text-[0.62rem] uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink"
      >
        {show ? "Hide" : "Show"} derivable facts ({show ? derivable.length : "?"})
      </button>

      {show && (
        <ul className="flex max-h-56 flex-col gap-1 overflow-auto">
          {derivable.length === 0 && (
            <li className="font-mono text-[0.7rem] text-ink-faint">
              Nothing new derivable from the current facts.
            </li>
          )}
          {derivable.map((d, i) => (
            <li key={i} className="font-serif text-[0.8rem] text-ink-soft">
              <MathText>{factLabel(d.fact)}</MathText>{" "}
              <span className="font-mono text-[0.62rem] text-ink-faint">— {d.rule}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
