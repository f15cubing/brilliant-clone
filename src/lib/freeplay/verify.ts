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
import { canonicalKey, factEqual, isAmong, rel, type Fact } from "./dsl";
import { RULES } from "./rules";
import { analogSource, isGivenSymmetry, type Subst } from "./symmetry";

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
  establishedFacts: Fact[];
  candidateFact: Fact;
  citedPremises: Fact[];
  /** The puzzle's given facts (hypotheses). Required for "by symmetry" steps. */
  givens?: Fact[];
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
 * Does `cited` derive `candidate` in one step (DD rule or AR angle-chase)?
 * Returns the rule name, or null. Never throws — a misbehaving rule is skipped.
 */
function deriveOnce(
  cited: Fact[],
  candidate: Fact,
  ctx: { coords: Coords; bindings: VarBindings; points: string[] },
): string | null {
  const facts = expandColls(cited);
  const ddDerived: Fact[] = [];
  for (const rule of RULES) {
    let produced: Fact[];
    try {
      produced = rule.derive(facts, ctx);
    } catch {
      continue;
    }
    for (const d of produced) {
      if (factEqual(d, candidate)) return rule.name;
      ddDerived.push(d);
    }
  }
  const ar = new AngleAR(ctx.coords, ctx.bindings);
  for (const f of [...facts, ...ddDerived]) ar.add(f);
  if (ar.implies(candidate)) return "algebraic angle-chase";
  return null;
}

export function verify(input: VerifyInput): VerifyResult {
  const { coords, bindings, establishedFacts, candidateFact, citedPremises } = input;

  // ---- "By symmetry" / analogous argument --------------------------------
  if (input.analogy) {
    const points = Object.keys(coords);
    const givens = input.givens ?? establishedFacts;
    // σ must be an automorphism of the hypotheses.
    if (!isGivenSymmetry(input.analogy.subst, givens, points)) {
      return { valid: false, reason: "not_symmetry" };
    }
    // Some established fact must map onto the asserted fact under σ.
    if (!analogSource(candidateFact, input.analogy.subst, establishedFacts)) {
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

  // Numeric truth gate.
  if (!factHolds(candidateFact, coords, bindings)) {
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
  for (const rule of RULES) {
    let produced: Fact[];
    try {
      produced = rule.derive(expanded, ctx);
    } catch {
      continue;
    }
    for (const derived of produced) {
      const k = canonicalKey(derived);
      if (known.has(k) || seen.has(k)) continue;
      if (!factHolds(derived, coords, bindings)) continue;
      seen.add(k);
      out.push({ fact: derived, rule: rule.name });
    }
  }
  return out;
}
