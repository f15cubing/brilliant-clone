/**
 * Play-test for the POWER OF A POINT problem.
 *
 * Finding: power of a point is ALREADY derivable — no new rule needed. The chain
 * is two `inscribed_angle`/angle-chase steps to obtain the two AA angle pairs,
 * then one `similar_triangles_aa` + length-chase step to the ratio.
 *
 * `replayProblem` cannot be used here: it runs the angle-only `researchVerify`,
 * which has no `eqratio`. So we drive each step through `researchVerifyL`
 * (RULES + RESEARCH_RULES + LENGTH_RULES) directly, advancing the established
 * set exactly like the real proof loop.
 */
import { describe, expect, it } from "vitest";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { eqratio, factHoldsL, type LFact } from "../../lengths/dsl";
import { researchVerifyL } from "../../lengths/verify";
import { power_of_a_point as P } from "../power_of_a_point";

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

  it("P lies strictly between A,B and between C,D (chords cross inside)", () => {
    // power of a point requires P interior; cong of the collinearities only is
    // not enough, so spot-check the betweenness numerically.
    const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const { A, B, C, D, P: Pt } = P.coords as Record<string, number[]>;
    expect(Math.abs(d(A, Pt) + d(Pt, B) - d(A, B))).toBeLessThan(1e-9);
    expect(Math.abs(d(C, Pt) + d(Pt, D) - d(C, D))).toBeLessThan(1e-9);
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

  it("step 1: ∠PAC = ∠PDB via inscribed angle + angle-chase", () => {
    const { results } = replay();
    expect(results[0]).toEqual({ valid: true, rule: P.steps[0].expectRule });
  });

  it("step 2: ∠PCA = ∠PBD via inscribed angle + angle-chase", () => {
    const { results } = replay();
    expect(results[1]).toEqual({ valid: true, rule: P.steps[1].expectRule });
  });

  it("step 3: PA/PC = PD/PB via AA similar triangles + length-chase", () => {
    const { results } = replay();
    expect(results[2]).toEqual({ valid: true, rule: P.steps[2].expectRule });
  });

  it("the goal (eqratio) is reached end-to-end", () => {
    const { results, established } = replay();
    expect(results.every((r) => r.valid)).toBe(true);
    expect(established.some((f) => factHoldsL(P.goal, P.coords) && JSON.stringify(f) === JSON.stringify(P.goal))).toBe(true);
  });

  // ---- minimality: every cited premise is load-bearing ----------------------

  it("step 1 is MINIMAL: dropping any given breaks the derivation", () => {
    for (let i = 0; i < P.given.length; i++) {
      const without = P.given.filter((_, k) => k !== i);
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: P.given,
        candidateFact: P.steps[0].fact,
        citedPremises: without,
      });
      expect(r.valid, `dropping given ${i} should break step 1`).toBe(false);
    }
  });

  it("step 3 is MINIMAL: it needs BOTH angle pairs (AA, not just one)", () => {
    const established = [...P.given, P.steps[0].fact, P.steps[1].fact];
    for (const only of [P.steps[0].fact, P.steps[1].fact]) {
      const r = researchVerifyL({
        coords: P.coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: P.goal,
        citedPremises: [only],
      });
      expect(r.valid, "one angle pair must not suffice for the ratio").toBe(false);
    }
  });

  // ---- soundness: a wrong ratio is rejected; non-power figure can't fake it --

  it("soundness: the false orientation PA/PB = PC/PD is NOT derived", () => {
    // PA/PD = PC/PB is TRUE here (corresponding sides), but PA/PB = PC/PD is a
    // genuinely DIFFERENT, FALSE proportion — the engine must not produce it.
    const wrong = eqratio("P", "A", "P", "B", "P", "C", "P", "D"); // PA/PB = PC/PD
    expect(factHoldsL(wrong, P.coords)).toBe(false); // numerically false in this figure
    const r = researchVerifyL({
      coords: P.coords,
      bindings: {},
      establishedFacts: [...P.given, P.steps[0].fact, P.steps[1].fact],
      candidateFact: wrong,
      citedPremises: [P.steps[0].fact, P.steps[1].fact],
    });
    expect(r.valid).toBe(false);
  });

  it("soundness: a NON-concyclic figure does not yield the inscribed-angle step", () => {
    // Move D off the circle so A,B,C,D are NOT concyclic; the eqangle that
    // underpins step 1 is then false and the step must be rejected if cited.
    const bad: Coords = { ...P.coords, D: [3, -2] };
    // chords still meet at a P', but the cyclic given is false here.
    expect(factHoldsL(rel("cyclic", ["A", "B", "C", "D"]), bad)).toBe(false);
    const r = researchVerifyL({
      coords: bad,
      bindings: {},
      establishedFacts: P.given,
      candidateFact: P.steps[0].fact,
      citedPremises: P.given,
    });
    expect(r.valid).toBe(false);
  });
});
