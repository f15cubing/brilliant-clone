/**
 * Research harness — a parametrized clone of `src/lib/freeplay/verify.ts`.
 *
 * The production verifier (`verify()`) hard-codes the shipped `RULES` array. To
 * prototype NEW rules WITHOUT touching the live engine (and without wiring them
 * into the website), this harness takes an explicit rule list and otherwise
 * behaves identically: a step is accepted iff the candidate fact is numerically
 * true AND one rule (DD or AR angle-chase) derives it from exactly the cited
 * premises, with the same minimality (anti-cheat) and "by symmetry" handling.
 *
 * Keep this in lock-step with the production verifier's semantics so a rule that
 * passes here is a faithful drop-in candidate for `src/lib/freeplay/rules.ts`.
 */
import { AngleAR } from "@/lib/freeplay/ar";
import { factHolds, type Coords, type VarBindings } from "@/lib/freeplay/check";
import {
  canonicalKey,
  factEqual,
  isAmong,
  rel,
  type Fact,
} from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { RULES } from "@/lib/freeplay/rules";
import {
  analogSource,
  isGivenSymmetry,
  type Subst,
} from "@/lib/freeplay/symmetry";

export type { Rule } from "@/lib/freeplay/rules";

export interface VerifyInput {
  coords: Coords;
  bindings: VarBindings;
  establishedFacts: Fact[];
  candidateFact: Fact;
  citedPremises: Fact[];
  givens?: Fact[];
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

/** Expand every coll(≥4) into all 3-point sub-collinearities (keep original). */
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

/** Does `cited` derive `candidate` in one step under `rules` (DD or AR)? */
function deriveOnce(
  rules: Rule[],
  cited: Fact[],
  candidate: Fact,
  ctx: { coords: Coords; bindings: VarBindings; points: string[] },
): string | null {
  const facts = expandColls(cited);
  const ddDerived: Fact[] = [];
  for (const rule of rules) {
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

/**
 * Verify a single step against an explicit rule list. Defaults to the shipped
 * `RULES`; pass `[...RULES, ...myNewRules]` to test research rules in context.
 */
export function verifyWith(rules: Rule[], input: VerifyInput): VerifyResult {
  const { coords, bindings, establishedFacts, candidateFact, citedPremises } =
    input;

  if (input.analogy) {
    const points = Object.keys(coords);
    const givens = input.givens ?? establishedFacts;
    if (!isGivenSymmetry(input.analogy.subst, givens, points)) {
      return { valid: false, reason: "not_symmetry" };
    }
    if (!analogSource(candidateFact, input.analogy.subst, establishedFacts)) {
      return { valid: false, reason: "unjustified" };
    }
    if (!factHolds(candidateFact, coords, bindings)) {
      return { valid: false, reason: "not_true" };
    }
    return { valid: true, rule: "by symmetry (analogous argument)" };
  }

  for (const prem of citedPremises) {
    if (!isAmong(prem, establishedFacts)) {
      return { valid: false, reason: "unknown_premise" };
    }
  }

  if (!factHolds(candidateFact, coords, bindings)) {
    return { valid: false, reason: "not_true" };
  }

  const seen = new Set<string>();
  const cited = citedPremises.filter((f) => {
    const k = canonicalKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (cited.length === 0) return { valid: false, reason: "unjustified" };

  const ctx = { coords, bindings, points: Object.keys(coords) };

  const rule = deriveOnce(rules, cited, candidateFact, ctx);
  if (!rule) return { valid: false, reason: "unjustified" };

  for (let i = 0; i < cited.length; i++) {
    const without = cited.filter((_, k) => k !== i);
    if (deriveOnce(rules, without, candidateFact, ctx) !== null) {
      return { valid: false, reason: "extraneous_premises" };
    }
  }

  return { valid: true, rule };
}

/** Every NEW fact derivable in one step from `facts` under `rules`. */
export function deriveAllWith(
  rules: Rule[],
  facts: Fact[],
  coords: Coords,
  bindings: VarBindings = {},
): { fact: Fact; rule: string }[] {
  const ctx = { coords, bindings, points: Object.keys(coords) };
  const expanded = expandColls(facts);
  const known = new Set(facts.map(canonicalKey));
  const seen = new Set<string>();
  const out: { fact: Fact; rule: string }[] = [];
  for (const rule of rules) {
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

export { RULES };
