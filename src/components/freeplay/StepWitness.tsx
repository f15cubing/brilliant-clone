/**
 * The "why" line under a stored proof step.
 *
 * A step used to show its rule name and nothing else, which tells a reader that
 * the engine was satisfied but not how to satisfy themselves. This renders the
 * recorded witness instead: the rational combination behind an algebraic step,
 * the facts a named theorem was applied to, and, importantly, any established
 * fact the engine used that the learner never cited.
 *
 * Collapsed by default. Someone skimming their own proof wants the statements;
 * someone checking it wants the arithmetic.
 */
import { factLabel, type LFact } from "@/lib/freeplay/dsl";
import type { CertificateTerm, Justification } from "@/lib/freeplay/justification";
import { rnum, rstr, type Rat } from "@/lib/freeplay/rational";
import { MathText } from "@/components/MathText";

/** "+", "−", "+ 3·", "− 1/2·" — the sign carried out front so terms chain. */
function coefficient(c: Rat, first: boolean): string {
  const negative = rnum(c) < 0;
  const magnitude = rstr({ n: Math.abs(c.n), d: c.d });
  const sign = negative ? "−" : first ? "" : "+";
  const scale = magnitude === "1" ? "" : `${magnitude}·`;
  return `${sign} ${scale}`.trim();
}

function originNote(t: CertificateTerm): string | null {
  if (t.origin === "derived") return t.viaRule ? `one step: ${t.viaRule}` : "derived";
  if (t.origin === "figure") return t.note ? `from the figure — ${t.note}` : "from the figure";
  return null;
}

function FactList({ facts }: { facts: LFact[] }) {
  return (
    <>
      {facts.map((f, i) => (
        <span key={i}>
          {i > 0 && "; "}
          <MathText>{factLabel(f)}</MathText>
        </span>
      ))}
    </>
  );
}

export function StepWitness({ justification }: { justification?: Justification }) {
  if (!justification) return null;
  const { certificate, deduction, implicitPremises, certificateGap } = justification;
  if (!certificate && !deduction && !implicitPremises && !certificateGap) return null;

  return (
    <details className="mt-1 font-mono text-[0.7rem] text-ink-faint">
      <summary className="cursor-pointer select-none uppercase tracking-[0.14em] hover:text-ink-soft">
        why
      </summary>

      <div className="mt-1.5 flex flex-col gap-1.5 border-l border-rule pl-3">
        {certificate && (
          <div>
            <span className="uppercase tracking-[0.14em]">
              {certificate.layer === "angle" ? "angle chase" : "ratio chase"}
            </span>
            <ul className="mt-1 flex flex-col gap-0.5">
              {certificate.terms.map((t, i) => (
                <li key={i}>
                  <span className="text-ink-soft">{coefficient(t.coeff, i === 0)}</span>{" "}
                  <span className="font-serif text-ink">
                    <MathText>{factLabel(t.fact)}</MathText>
                  </span>
                  {originNote(t) && <span className="text-ink-faint"> ({originNote(t)})</span>}
                </li>
              ))}
              {certificate.turns && rnum(certificate.turns) !== 0 && (
                <li className="text-ink-soft">
                  {coefficient(certificate.turns, false)} 180°
                </li>
              )}
            </ul>
          </div>
        )}

        {deduction && (
          <div>
            <span className="uppercase tracking-[0.14em]">{deduction.rule}</span>
            <span className="text-ink-faint"> applied to </span>
            <span className="font-serif text-ink">
              <FactList facts={deduction.matched} />
            </span>
            {deduction.readsFigureIncidence && (
              <p className="mt-1 text-ink-faint">
                This rule also reads which points lie on a line from the figure, so
                check that incidence too.
              </p>
            )}
          </div>
        )}

        {implicitPremises && implicitPremises.length > 0 && (
          <div className="text-ink-soft">
            <span className="uppercase tracking-[0.14em]">used, not cited</span>
            <span className="font-serif text-ink">
              {" "}
              <FactList facts={implicitPremises} />
            </span>
          </div>
        )}

        {certificateGap && <p>No combination could be recovered: {certificateGap}</p>}
      </div>
    </details>
  );
}
