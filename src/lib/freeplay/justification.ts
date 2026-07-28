/**
 * The shape of an *auditable* justification.
 *
 * `verify()` used to report a step's reason as a bare string ("SAS congruence",
 * "algebraic angle-chase"). That is enough for a UI label and useless for
 * checking: a reader is told the step follows without being told why, and the
 * facts the engine quietly supplied on the learner's behalf are invisible.
 *
 * These types carry the missing information:
 *
 *  - `certificate` — for an algebraic step, the rational combination of facts
 *    that produces the claim, so a reader can add it up by hand.
 *  - `deduction` — for a rule step, the exact facts the rule matched, reduced to
 *    a minimal subset, so a reader can check the named theorem against them.
 *  - `implicitPremises` — established facts the engine used without the learner
 *    citing them. Without these a step can look like a non-sequitur on paper.
 */
import type { LFact } from "./dsl";
import type { Rat } from "./rational";

/** How a fact used by a step came to be available. */
export type PremiseOrigin =
  /** The learner cited it. */
  | "cited"
  /** A one-step consequence of the cited facts, produced by a named rule. */
  | "derived"
  /** Established figure structure the engine supplied uncited (collinearity). */
  | "figure";

/** One `coefficient × fact` term of an algebraic certificate. */
export interface CertificateTerm {
  fact: LFact;
  /** Exact rational multiplier on this fact's equation. */
  coeff: Rat;
  origin: PremiseOrigin;
  /** The rule that produced this fact, when `origin` is `"derived"`. */
  viaRule?: string;
  /** Disambiguates facts that contribute more than one equation (e.g. `coll`). */
  note?: string;
}

/**
 * A hand-checkable receipt for an algebraic step: the claim's equation equals
 * the sum of `terms`, plus `turns` whole turns of 180° on the angle layer.
 */
export interface AlgebraicCertificate {
  layer: "angle" | "length";
  terms: CertificateTerm[];
  /** Whole multiples of 180° absorbed by the identity. Angle layer only. */
  turns?: Rat;
}

/** What a named rule actually matched, for a deduction step. */
export interface DeductionWitness {
  /** Stable rule identifier (`Rule.id`). */
  ruleId: string;
  /** Display name (`Rule.name`), the same string the UI shows. */
  rule: string;
  /** Minimal subset of the available facts on which the rule still fires. */
  matched: LFact[];
  /**
   * The rule reads incidence (collinearity / point-on-line) off the figure
   * rather than requiring it cited, so `matched` is not the whole story: an
   * auditor must also confirm the incidence the diagram supplies.
   */
  readsFigureIncidence: boolean;
}

/** The full reason a step was accepted. */
export interface Justification {
  /** Human-facing label, unchanged from the original `rule` string. */
  rule: string;
  kind: "deduction" | "angle-algebra" | "length-algebra" | "symmetry";
  deduction?: DeductionWitness;
  certificate?: AlgebraicCertificate;
  /**
   * Established facts the engine supplied without citation, needed to make the
   * step follow. Recording these is what makes a compiled proof self-contained.
   */
  implicitPremises?: LFact[];
  /** Why a certificate is absent when one was expected. */
  certificateGap?: string;
}

/**
 * Rules whose guards read incidence from the coordinates instead of requiring a
 * cited `coll`. Derived by inspecting `rules.ts`: these call `onLine(...)` or
 * `collinear(...)` on `ctx.coords` while matching. A step justified by one of
 * them leans on the diagram for structure the citation list does not show, so
 * the compiled proof flags it for the auditor.
 *
 * Keep in sync with `rules.ts`; `justification.readsFigureIncidence.test.ts`
 * fails if a rule starts or stops reading incidence.
 */
export const RULES_READING_FIGURE_INCIDENCE: ReadonlySet<string> = new Set([
  "collinear_same_ray",
  "para_equal_angles",
  "concyclic_merge",
  "pappus",
]);
