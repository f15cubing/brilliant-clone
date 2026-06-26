/**
 * v1 verifier (local stand-in for the Python symbolic backend).
 *
 * A step is accepted iff:
 *   1. the asserted fact is TRUE in the figure (numeric check), AND
 *   2. some theorem in the rule library derives it in ONE step from exactly the
 *      facts the learner cited.
 *
 * This accepts ANY valid single-step deduction (not a single scripted path),
 * and cleanly separates "not true" from "true but doesn't follow".
 */
import { AngleAR } from "./ar";
import { factHolds, type Coords, type VarBindings } from "./check";
import { canonicalKey, factEqual, isAmong, rel, type EqRatio, type Fact } from "./dsl";
import { factHoldsL, type LFact, type LRule } from "./lengths/dsl";
import { LengthAR } from "./lengths/lengthAR";
import { RATIO_RULES } from "./lengths/rules";
import { RULES } from "./rules";
import { analogSource, isGivenSymmetry, type Subst } from "./symmetry";

/**
 * The full single-step rule set the verifier runs: the shipped angle/incidence
 * `RULES` plus the LENGTH/RATIO rules (`RATIO_RULES`). The ratio rules are
 * composed HERE, at the verify layer — exactly as the research lab's
 * `lengths/verify.ts` composes `[...RULES, ...LENGTH_RULES]` — rather than being
 * spliced into the shipped `RULES` export, so the angle-only rule list (and the
 * tests that assert against it) is left untouched. A `Rule` widens to an `LRule`
 * (its `Fact[]` result is an `LFact[]`), so the two kinds mix freely.
 */
const ALL_RULES: LRule[] = [...RULES, ...RATIO_RULES];

/**
 * Expand every coll(≥4) into all its 3-point sub-collinearities (keeping the
 * original). Lets the learner state a whole line once — `coll(Q,A1,Q1,A2)` —
 * while the 3-point rules still see every triple they need. Used only to FEED
 * the rules; the learner's cited list (for the necessity check) is untouched.
 */
function expandColls(facts: Fact[]): Fact[] {
  const out = [...facts];
  const seen = new Set(facts.map(canonicalKey));
  for (const f of facts) {
    if (f.kind !== "rel" || f.name !== "coll" || f.points.length <= 3) continue;
    const p = f.points;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        for (let k = j + 1; k < p.length; k++) {
          const tri = rel("coll", [p[i], p[j], p[k]]);
          const key = canonicalKey(tri);
          if (!seen.has(key)) {
            seen.add(key);
            out.push(tri);
          }
        }
  }
  return out;
}

export interface VerifyInput {
  coords: Coords;
  bindings: VarBindings;
  establishedFacts: LFact[];
  candidateFact: LFact;
  citedPremises: LFact[];
  /** The puzzle's given facts (hypotheses). Required for "by symmetry" steps. */
  givens?: LFact[];
  /** When present, the step is justified "by symmetry" under this relabeling. */
  analogy?: { subst: Subst };
}

export type VerifyResult =
  | { valid: true; rule: string }
  | {
      valid: false;
      reason:
        | "not_true"
        | "unknown_premise"
        | "unjustified"
        | "not_symmetry"
        | "extraneous_premises";
    };

/**
 * Does `cited` derive `candidate` in one step? Returns the rule name, or null.
 * Never throws — a misbehaving rule is skipped. Three reasoning layers are tried
 * in order:
 *   1. DD — each rule scans the (coll-expanded) cited facts; a direct
 *      `factEqual` match returns that rule's name. Ratio (`eqratio`) outputs are
 *      collected separately for the length layer.
 *   2. AngleAR — directed-angle Gaussian elimination over cited ∪ DD angle
 *      consequences (skipped for ratio candidates, which carry no angle equation).
 *   3. LengthAR — log-length Gaussian elimination over the cited facts ∪ one-step
 *      DD/length consequences (so e.g. a cited proportion fuses with a rule's
 *      bridge proportion to close an SAS-similarity ratio chase).
 */
function deriveOnce(
  cited: LFact[],
  candidate: LFact,
  ctx: { coords: Coords; bindings: VarBindings; points: string[] },
): string | null {
  // The DD rules and the angle table only reason about ordinary facts; `eqratio`
  // premises are routed straight to the length layer. They are also exposed to
  // the rules via `ctx.citedRatios` so a length rule that needs a proportion as
  // a GENUINE premise (e.g. SAS similarity's two-sides ratio) can require it to
  // be cited rather than reading it off the coordinates. Computed from THIS
  // call's `cited`, so the minimality check sees the right subset.
  const ordinary = cited.filter((f): f is Fact => f.kind !== "eqratio");
  const citedRatios = cited.filter((f): f is EqRatio => f.kind === "eqratio");
  const facts = expandColls(ordinary);
  const ruleCtx = { ...ctx, citedRatios };

  const ddDerived: Fact[] = []; // ordinary one-step consequences
  const lDerived: LFact[] = []; // one-step ratio consequences (eqratio)
  for (const rule of ALL_RULES) {
    let produced: LFact[];
    try {
      produced = rule.derive(facts, ruleCtx);
    } catch {
      continue;
    }
    for (const d of produced) {
      if (factEqual(d, candidate)) return rule.name;
      if (d.kind === "eqratio") lDerived.push(d);
      else ddDerived.push(d);
    }
  }

  // Angle layer (only meaningful for ordinary angle candidates).
  if (candidate.kind !== "eqratio") {
    const ar = new AngleAR(ctx.coords, ctx.bindings);
    for (const f of [...facts, ...ddDerived]) ar.add(f);
    if (ar.implies(candidate)) return "algebraic angle-chase";
  }

  // Length layer: cited facts + one-step DD / length consequences.
  const lar = new LengthAR(ctx.coords);
  for (const f of [...cited, ...ddDerived, ...lDerived]) lar.add(f);
  if (lar.implies(candidate)) return "algebraic length-chase";

  return null;
}

export function verify(input: VerifyInput): VerifyResult {
  const { coords, bindings, establishedFacts, candidateFact, citedPremises } = input;

  // ---- "By symmetry" / analogous argument --------------------------------
  if (input.analogy) {
    // The symmetry machinery is angle/incidence-only (it relabels `Fact`s).
    // Ratio facts are out of scope for "by symmetry", and ratio givens cannot
    // constrain a relabeling, so we work over the ordinary facts only.
    if (candidateFact.kind === "eqratio") {
      return { valid: false, reason: "unjustified" };
    }
    const points = Object.keys(coords);
    const givens = (input.givens ?? establishedFacts).filter(
      (f): f is Fact => f.kind !== "eqratio",
    );
    const ordinaryEstablished = establishedFacts.filter(
      (f): f is Fact => f.kind !== "eqratio",
    );
    // σ must be an automorphism of the hypotheses.
    if (!isGivenSymmetry(input.analogy.subst, givens, points)) {
      return { valid: false, reason: "not_symmetry" };
    }
    // Some established fact must map onto the asserted fact under σ.
    if (!analogSource(candidateFact, input.analogy.subst, ordinaryEstablished)) {
      return { valid: false, reason: "unjustified" };
    }
    // Safety gate: the consequence must hold numerically (it always should).
    if (!factHolds(candidateFact, coords, bindings)) {
      return { valid: false, reason: "not_true" };
    }
    return { valid: true, rule: "by symmetry (analogous argument)" };
  }

  // Cited premises must all be established.
  for (const prem of citedPremises) {
    if (!isAmong(prem, establishedFacts)) {
      return { valid: false, reason: "unknown_premise" };
    }
  }

  // Numeric truth gate (ratio-aware: `factHoldsL` checks `eqratio` proportions
  // and delegates to the shipped `factHolds` for ordinary facts).
  if (!factHoldsL(candidateFact, coords, bindings)) {
    return { valid: false, reason: "not_true" };
  }

  // De-duplicate cited premises by canonical key.
  const seen = new Set<string>();
  const cited = citedPremises.filter((f) => {
    const k = canonicalKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // A justified step must cite the facts it uses.
  if (cited.length === 0) return { valid: false, reason: "unjustified" };

  const ctx = { coords, bindings, points: Object.keys(coords) };

  // The cited facts must derive the candidate in one step (DD rule or AR).
  const rule = deriveOnce(cited, candidateFact, ctx);
  if (!rule) return { valid: false, reason: "unjustified" };

  // Minimality / necessity: every cited fact must be REQUIRED. If the candidate
  // still derives after dropping one, that fact was extraneous — so citing
  // "everything" can't cheat the checker.
  for (let i = 0; i < cited.length; i++) {
    const without = cited.filter((_, k) => k !== i);
    if (deriveOnce(without, candidateFact, ctx) !== null) {
      return { valid: false, reason: "extraneous_premises" };
    }
  }

  return { valid: true, rule };
}

/**
 * Every NEW fact the rule library can derive in one step from `facts` (treating
 * all of them as cited). Used by the dev/debug panel and, later, hints.
 */
export function deriveAll(
  facts: Fact[],
  coords: Coords,
  bindings: VarBindings = {},
): { fact: Fact; rule: string }[] {
  const ctx = { coords, bindings, points: Object.keys(coords) };
  const expanded = expandColls(facts);
  const known = new Set(facts.map(canonicalKey));
  const seen = new Set<string>();
  const out: { fact: Fact; rule: string }[] = [];
  for (const rule of ALL_RULES) {
    let produced: LFact[];
    try {
      produced = rule.derive(expanded, ctx);
    } catch {
      continue;
    }
    for (const derived of produced) {
      // The dev panel enumerates ordinary (angle/incidence) consequences only;
      // ratio facts are reasoned about in the length layer, not listed here.
      if (derived.kind === "eqratio") continue;
      const k = canonicalKey(derived);
      if (known.has(k) || seen.has(k)) continue;
      if (!factHolds(derived, coords, bindings)) continue;
      seen.add(k);
      out.push({ fact: derived, rule: rule.name });
    }
  }
  return out;
}
