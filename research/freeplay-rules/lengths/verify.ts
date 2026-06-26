/**
 * Research verifier WITH a length layer — `harness/verify.ts` extended to accept
 * length/ratio steps.
 *
 * Same contract as the angle harness: a step is accepted iff
 *   (1) the candidate fact is numerically TRUE (now via `factHoldsL`), AND
 *   (2) one rule derives it from exactly the cited premises — where "one rule"
 *       now means a DD rule, an AngleAR angle-chase, OR a LengthAR length-chase,
 *       AND
 *   (3) MINIMALITY: dropping any cited fact breaks the derivation.
 *
 * After running the DD rules (collecting both their ordinary `Fact`s and any
 * `eqratio` outputs) and the AngleAR over (cited + DD consequences), we ALSO run
 * `LengthAR` over (cited facts + one-step DD/length consequences) and accept if
 * the candidate is a length/ratio consequence.
 */
import { AngleAR } from "@/lib/freeplay/ar";
import type { Coords, VarBindings } from "@/lib/freeplay/check";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { RuleCtx } from "@/lib/freeplay/rules";
import { RULES } from "@/lib/freeplay/rules";
import { RESEARCH_RULES } from "../rules";
import {
  canonicalKeyL,
  factEqualL,
  factHoldsL,
  isAmongL,
  type LFact,
  type LRule,
} from "./dsl";
import { LengthAR } from "./lengthAR";
import { LENGTH_RULES } from "./rules";

export interface VerifyLInput {
  coords: Coords;
  bindings: VarBindings;
  establishedFacts: LFact[];
  candidateFact: LFact;
  citedPremises: LFact[];
  givens?: LFact[];
}

export type VerifyLResult =
  | { valid: true; rule: string }
  | {
      valid: false;
      reason:
        | "not_true"
        | "unknown_premise"
        | "unjustified"
        | "extraneous_premises";
    };

/** Expand every coll(≥4) into all 3-point sub-collinearities (keep original). */
function expandColls(facts: Fact[]): Fact[] {
  const out = [...facts];
  const seen = new Set(facts.map((f) => canonicalKeyL(f)));
  for (const f of facts) {
    if (f.kind !== "rel" || f.name !== "coll" || f.points.length <= 3) continue;
    const p = f.points;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        for (let k = j + 1; k < p.length; k++) {
          const tri = rel("coll", [p[i], p[j], p[k]]);
          const key = canonicalKeyL(tri);
          if (!seen.has(key)) {
            seen.add(key);
            out.push(tri);
          }
        }
  }
  return out;
}

/** Does `cited` derive `candidate` in one step under `rules` (DD / AngleAR / LengthAR)? */
function deriveOnce(
  rules: LRule[],
  cited: LFact[],
  candidate: LFact,
  ctx: RuleCtx,
): string | null {
  const ordinary = cited.filter((f): f is Fact => f.kind !== "eqratio");
  const facts = expandColls(ordinary);

  const ddDerived: Fact[] = []; // ordinary one-step consequences
  const lDerived: LFact[] = []; // one-step ratio consequences (eqratio)
  for (const rule of rules) {
    let produced: LFact[];
    try {
      produced = rule.derive(facts, ctx);
    } catch {
      continue;
    }
    for (const d of produced) {
      if (factEqualL(d, candidate)) return rule.name;
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

/**
 * Verify a single (possibly length/ratio) step against an explicit rule list.
 * Pass `[...RULES, ...RESEARCH_RULES, ...LENGTH_RULES]` (see `researchVerifyL`)
 * to test length rules in full engine context.
 */
export function verifyL(rules: LRule[], input: VerifyLInput): VerifyLResult {
  const { coords, bindings, establishedFacts, candidateFact, citedPremises } =
    input;

  for (const prem of citedPremises) {
    if (!isAmongL(prem, establishedFacts)) {
      return { valid: false, reason: "unknown_premise" };
    }
  }

  if (!factHoldsL(candidateFact, coords, bindings)) {
    return { valid: false, reason: "not_true" };
  }

  const seen = new Set<string>();
  const cited = citedPremises.filter((f) => {
    const k = canonicalKeyL(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  if (cited.length === 0) return { valid: false, reason: "unjustified" };

  const ctx: RuleCtx = { coords, bindings, points: Object.keys(coords) };

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

/** Convenience: verify with shipped RULES + angle RESEARCH_RULES + LENGTH_RULES. */
export function researchVerifyL(input: VerifyLInput): VerifyLResult {
  return verifyL([...RULES, ...RESEARCH_RULES, ...LENGTH_RULES], input);
}

export { LENGTH_RULES };
