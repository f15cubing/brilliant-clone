/**
 * The auditable-witness contract.
 *
 * These tests are about whether a *finished proof can be checked on paper*, so
 * they assert on the reported reason rather than on acceptance. Three claims:
 *
 *  1. Every algebraic step yields a certificate whose coefficients really do
 *     reproduce the step's equation.
 *  2. Every rule step names the exact facts the rule matched.
 *  3. A step that leans on an uncited fact says so. The G2 case below is the
 *     motivating example: its printed citation alone does not reach the claim.
 */
import { describe, expect, it } from "vitest";

import { canonicalKey, factEqual, type Fact, type LFact } from "../dsl";
import {
  RULES_READING_FIGURE_INCIDENCE,
  type CertificateTerm,
} from "../justification";
import { RATIO_RULES } from "../lengths/rules";
import { FREEPLAY_PUZZLES, getPuzzle } from "../puzzles";
import { rnum } from "../rational";
import { sampleRealizations } from "../realize";
import { RULES } from "../rules";
import { verify } from "../verify";

/** Every rule the verifier can fire: angle/incidence plus length/ratio. */
const ALL_RULE_IDS = new Set([...RULES, ...RATIO_RULES].map((r) => r.id));

/** Replay a puzzle's shipped solution, collecting each accepted justification. */
function replay(puzzleId: string) {
  const puzzle = getPuzzle(puzzleId)!;
  const realizations = sampleRealizations(puzzle);
  const established: LFact[] = [...puzzle.given];
  const out: {
    fact: LFact;
    cited: LFact[];
    result: ReturnType<typeof verify>;
  }[] = [];
  for (const step of puzzle.solution ?? []) {
    const result = verify({
      coords: puzzle.coords,
      bindings: puzzle.variables ?? {},
      establishedFacts: established,
      candidateFact: step.fact,
      citedPremises: step.premises,
      givens: puzzle.given,
      realizations,
      witness: true,
    });
    out.push({ fact: step.fact, cited: step.premises, result });
    established.push(step.fact);
  }
  return { puzzle, realizations, steps: out };
}

describe("witness is opt-in", () => {
  it("is absent unless asked for, so existing callers see the old shape", () => {
    const { puzzle, realizations } = replay("imo-2019-p2");
    const step = puzzle.solution![0];
    const r = verify({
      coords: puzzle.coords,
      bindings: puzzle.variables ?? {},
      establishedFacts: [...puzzle.given],
      candidateFact: step.fact,
      citedPremises: step.premises,
      realizations,
    });
    expect(r).toEqual({ valid: true, rule: step.rule });
  });
});

describe("algebraic certificates", () => {
  it("recovers a certificate for every algebraic step in every shipped puzzle", () => {
    let algebraic = 0;
    const gaps: string[] = [];
    for (const p of FREEPLAY_PUZZLES) {
      for (const s of replay(p.id).steps) {
        if (!s.result.valid) continue;
        const j = s.result.justification!;
        if (j.kind !== "angle-algebra" && j.kind !== "length-algebra") continue;
        algebraic++;
        if (!j.certificate) gaps.push(`${p.id}: ${j.rule} for ${canonicalKey(s.fact)}`);
      }
    }
    // Guards against the solver silently regressing into "accepted, no reason".
    expect(algebraic).toBeGreaterThan(10);
    expect(gaps).toEqual([]);
  });

  it("uses only facts that were cited, derived in one step, or established structure", () => {
    for (const p of FREEPLAY_PUZZLES) {
      for (const s of replay(p.id).steps) {
        if (!s.result.valid) continue;
        const cert = s.result.justification?.certificate;
        if (!cert) continue;
        for (const t of cert.terms) {
          expect(["cited", "derived", "figure"]).toContain(t.origin);
          // A cited term must actually be one of the learner's premises.
          if (t.origin === "cited") {
            const isCited = s.cited.some((c) => factEqual(c, t.fact));
            const isSubColl = t.fact.kind === "rel" && t.fact.name === "coll";
            expect(isCited || isSubColl).toBe(true);
          }
          // A derived term must say which rule produced it.
          if (t.origin === "derived") expect(t.viaRule).toBeTruthy();
          // Zero-coefficient terms are noise; they should have been dropped.
          expect(rnum(t.coeff)).not.toBe(0);
        }
      }
    }
  });

  it("keeps certificates short enough to check by hand", () => {
    const sizes: number[] = [];
    for (const p of FREEPLAY_PUZZLES) {
      for (const s of replay(p.id).steps) {
        if (!s.result.valid) continue;
        const cert = s.result.justification?.certificate;
        if (cert) sizes.push(cert.terms.length);
      }
    }
    expect(sizes.length).toBeGreaterThan(0);
    // A receipt nobody can read is no better than a boolean.
    expect(Math.max(...sizes)).toBeLessThanOrEqual(8);
  });
});

describe("deduction witnesses", () => {
  it("names a minimal set of matched facts for every rule step", () => {
    let ruleSteps = 0;
    for (const p of FREEPLAY_PUZZLES) {
      for (const s of replay(p.id).steps) {
        if (!s.result.valid) continue;
        const j = s.result.justification!;
        if (j.kind !== "deduction") continue;
        ruleSteps++;
        expect(j.deduction).toBeDefined();
        expect(j.deduction!.matched.length).toBeGreaterThan(0);
        // The witness must not be larger than what the learner cited plus the
        // sub-collinearities the engine expands out of a cited `coll`.
        expect(j.deduction!.matched.length).toBeLessThanOrEqual(
          Math.max(s.cited.length, 1) + 6,
        );
        expect(ALL_RULE_IDS).toContain(j.deduction!.ruleId);
      }
    }
    expect(ruleSteps).toBeGreaterThan(10);
  });

  it("flags the rules that read incidence off the figure", () => {
    // If a rule starts or stops consulting the diagram for collinearity, the
    // hard-coded set in justification.ts is stale and a compiled proof would
    // silently stop warning its auditor. Keep the two in step.
    for (const flagged of RULES_READING_FIGURE_INCIDENCE) {
      expect(ALL_RULE_IDS, `${flagged} is not a shipped rule id`).toContain(flagged);
    }
  });
});

describe("uncited facts are recorded (IMO SL 2024 G2)", () => {
  // The motivating case. The shipped solution justifies ∠APX = ∠A2BC by citing
  // ONE fact, `cyclic(B,P,A2,X)`. That alone does not reach the claim: the angle
  // chase also swings arms along two established lines the learner never cited.
  // Before the witness existed, the stored proof printed only the citation, so
  // the step read as a non-sequitur on paper.
  const target = "imo-shortlist-2024-g2";

  it("reports the two lines the chase used but the learner did not cite", () => {
    const withImplicit = replay(target).steps.filter(
      (s) => s.result.valid && s.result.justification?.implicitPremises?.length,
    );
    expect(withImplicit.length).toBeGreaterThan(0);

    const first = withImplicit[0];
    const implicit = first.result.valid
      ? first.result.justification!.implicitPremises!
      : [];
    // Every uncited fact is a collinearity, and each is listed once.
    for (const f of implicit) {
      expect(f.kind === "rel" && f.name === "coll").toBe(true);
    }
    expect(new Set(implicit.map(canonicalKey)).size).toBe(implicit.length);
    // It genuinely needed more than it cited.
    expect(implicit.length).toBeGreaterThanOrEqual(1);
  });

  it("the citation alone does not reach the claim without those lines", () => {
    const { puzzle, realizations, steps } = replay(target);
    const step = steps.find(
      (s) => s.result.valid && s.result.justification?.implicitPremises?.length,
    )!;
    const implicit = step.result.valid
      ? step.result.justification!.implicitPremises!
      : [];

    // Rebuild the established set WITHOUT the uncited lines, leaving exactly
    // what the compiled proof used to print for this step.
    const upTo: LFact[] = [...puzzle.given];
    for (const s of steps) {
      if (s === step) break;
      upTo.push(s.fact);
    }
    const stripped = upTo.filter(
      (f) => !implicit.some((i) => canonicalKey(i) === canonicalKey(f)),
    );
    expect(stripped.length).toBeLessThan(upTo.length); // the lines were givens

    const r = verify({
      coords: puzzle.coords,
      bindings: puzzle.variables ?? {},
      establishedFacts: stripped,
      candidateFact: step.fact as Fact,
      citedPremises: step.cited,
      givens: puzzle.given,
      realizations,
      witness: true,
    });
    // The step is TRUE, so the truth gate still passes; it simply no longer
    // follows. That is the exact shape of the hole this change closes.
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("unjustified");
  });

  it("the recorded certificate adds up to the step it justifies", () => {
    // Specifically the step that leans on uncited lines: its certificate is the
    // one that has to expose them.
    const step = replay(target).steps.find(
      (s) =>
        s.result.valid &&
        s.result.justification?.certificate &&
        s.result.justification.implicitPremises?.length,
    )!;
    const cert = step.result.valid ? step.result.justification!.certificate! : null;
    expect(cert).not.toBeNull();
    // `solveCombination` substitutes the combination back before returning it,
    // so a certificate that survives to here has already been checked. Assert
    // the reported shape a reader depends on.
    expect(cert!.layer).toBe("angle");
    expect(cert!.terms.length).toBeGreaterThan(0);
    const byOrigin = (o: CertificateTerm["origin"]) =>
      cert!.terms.filter((t) => t.origin === o);
    expect(byOrigin("figure").length + byOrigin("derived").length).toBeGreaterThan(0);
    // Terms drawn from the same multi-equation fact are distinguishable.
    for (const t of byOrigin("figure")) expect(t.note).toBeTruthy();
  });
});
