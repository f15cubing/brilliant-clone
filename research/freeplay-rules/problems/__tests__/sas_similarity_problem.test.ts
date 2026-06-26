/**
 * Play-test for the CONVERSE POWER OF A POINT problem, whose proof genuinely
 * needs SAS similarity (the two driving triangles △ABE, △ADC share the angle at
 * A, so AA is unavailable — only the included-sides proportion saves it).
 *
 * `replayProblem` cannot be used here: it runs the angle-only `researchVerify`,
 * which has no `eqratio`. So we drive each step through `researchVerifyL`
 * (RULES + RESEARCH_RULES + LENGTH_RULES) directly, advancing the established set
 * exactly like the real proof loop. We also assert the GAP: the shipped engine
 * (RULES) cannot validate the ratio goal at all.
 */
import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, factHoldsL, type LFact } from "../../lengths/dsl";
import { researchVerifyL } from "../../lengths/verify";
import { verifyWith, RULES } from "../../harness";
import { sas_similarity_problem as P } from "../sas_similarity_problem";

describe(`problem: ${P.id} (${P.source})`, () => {
  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHoldsL(g, P.coords), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (incl. the eqratio goal) is numerically true", () => {
    for (const s of P.steps) {
      expect(factHoldsL(s.fact, P.coords), JSON.stringify(s.fact)).toBe(true);
    }
    expect(factHoldsL(P.goal, P.coords)).toBe(true);
  });

  it("the configuration is a faithful realization (external A, B C D E concyclic)", () => {
    const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const { A, B, C, D, E } = P.coords as Record<string, number[]>;
    // B, C, D, E all lie on the circle centered at the origin, radius 5.
    for (const p of [B, C, D, E]) expect(d([0, 0], p)).toBeCloseTo(5, 9);
    // A is strictly OUTSIDE that circle (a genuine external point).
    expect(d([0, 0], A)).toBeGreaterThan(5);
    // The two driving triangles are non-degenerate (scalene, not collinear).
    expect(Math.abs(d(A, B) - d(B, E))).toBeGreaterThan(1e-6);
  });

  // Manual replay through the length-aware verifier.
  const replay = () => {
    let established: LFact[] = [...P.given];
    const results = P.steps.map((s) => {
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: s.fact,
        citedPremises: s.premises,
      });
      if (r.valid) established = [...established, s.fact];
      return r;
    });
    return { results, established };
  };

  it("step 1: ∠ABE = ∠ADC fires DIRECTLY under the SAS similarity rule", () => {
    const { results } = replay();
    expect(results[0]).toEqual({ valid: true, rule: P.steps[0].expectRule });
  });

  it("step 2: BE/CD = AB/AD via SAS similarity fused by the length-chase", () => {
    const { results } = replay();
    expect(results[1]).toEqual({ valid: true, rule: P.steps[1].expectRule });
  });

  it("the goal (eqratio BE/CD = AB/AD) is reached end-to-end", () => {
    const { results, established } = replay();
    expect(results.every((r) => r.valid)).toBe(true);
    expect(established.some((f) => factHoldsL(P.goal, P.coords) && JSON.stringify(f) === JSON.stringify(P.goal))).toBe(true);
  });

  // ---- minimality: every cited premise on the KEY step is load-bearing ------

  it("KEY step is MINIMAL: it needs BOTH the included angle AND the side ratio", () => {
    const established = [...P.given];
    // cite only the shared angle (drop the power ratio) → the bridge alone
    // cannot reach AB/AD = BE/CD.
    const dropRatio = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: established,
      candidateFact: P.goal,
      citedPremises: [P.given[3]], // sharedAngle
    });
    expect(dropRatio.valid, "shared angle alone must not suffice").toBe(false);

    // cite only the power ratio (drop the included angle) → the rule never
    // fires, so no bridge is produced.
    const dropAngle = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: established,
      candidateFact: P.goal,
      citedPremises: [P.given[2]], // powerRatio
    });
    expect(dropAngle.valid, "side ratio alone must not suffice").toBe(false);
  });

  // ---- soundness: a false ratio / a non-power figure are rejected -----------

  it("soundness: the false orientation AB/AC = BE/CD is NOT derived", () => {
    const wrong = eqratio("A", "B", "A", "C", "B", "E", "C", "D"); // AB/AC = BE/CD
    expect(factHoldsL(wrong, P.coords)).toBe(false); // numerically false here
    const r = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: wrong,
      citedPremises: [P.given[2], P.given[3]],
    });
    expect(r.valid).toBe(false);
  });

  it("soundness: when the power hypothesis FAILS, the SAS step is rejected", () => {
    // Slide D along secant 2 to D'=(1,-8): still on line y=-3x-5 (A,E,D' collinear)
    // but NO LONGER on the circle, so AB·AC ≠ AD'·AE and the triangles are not
    // similar. The included-side proportion guard must reject the emit.
    const bad = { ...P.coords, D: [1, -8] as [number, number] };
    expect(factHoldsL(rel("coll", ["A", "E", "D"]), bad)).toBe(true);
    expect(factHoldsL(P.given[2], bad)).toBe(false); // power ratio now false
    const r = researchVerifyL({
      coords: bad,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.goal,
      citedPremises: [P.given[2], P.given[3]],
    });
    expect(r.valid).toBe(false);
  });

  // ---- THE GAP: the shipped engine cannot do this on its own ----------------

  it("GAP: the shipped engine (RULES) cannot validate the ratio goal", () => {
    // `eqratio` is not in the shipped DSL and the shipped AR is angles-only, so
    // the production verifier cannot even express, let alone establish, the
    // cross-chord ratio: `factHolds` on a ratio fact is false, so the step is
    // rejected outright. (We cite the ordinary angle fact — an `eqratio` premise
    // would itself crash the shipped `canonicalKey`, which is the same gap.)
    const sharedAngle = P.given[3] as Fact;
    const r = verifyWith(RULES, {
      coords: P.coords,
      bindings: {},
      establishedFacts: [sharedAngle],
      candidateFact: P.goal as unknown as Fact,
      citedPremises: [sharedAngle],
    });
    expect(r.valid).toBe(false);
  });
});
