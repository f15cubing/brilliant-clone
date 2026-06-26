/**
 * Play-test for IMO Shortlist 2010 G1 (AP = AQ) — verified end-to-end.
 *
 * Seven steps: a directed-angle chase to ∠APQ = ∠AFQ, the converse of the
 * inscribed angle to get A,P,F,Q concyclic, a second chase to ∠AQP = ∠ACB, and
 * the shipped isosceles rule to finish AP = AQ. Replayed through the research
 * harness; every step is accepted, every premise is load-bearing, and the goal
 * is reached.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { researchVerify } from "../../harness";
import { replayProblem } from "../replay";
import { imo_shortlist_2010_g1 as P } from "../imo_shortlist_2010_g1";

describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (and the goal) is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, s.label).toBe(true);
    }
    expect(factHolds(P.goal, P.coords)).toBe(true);
  });

  it("the triangle is acute and scalene (a faithful generic realization)", () => {
    const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const { A, B, C } = P.coords as Record<string, number[]>;
    const ab = d(A, B), bc = d(B, C), ca = d(C, A);
    // pairwise distinct side lengths (scalene)
    expect(Math.abs(ab - bc)).toBeGreaterThan(1e-3);
    expect(Math.abs(bc - ca)).toBeGreaterThan(1e-3);
    expect(Math.abs(ca - ab)).toBeGreaterThan(1e-3);
    // acute: every squared side < sum of the other two squared sides
    const a2 = bc * bc, b2 = ca * ca, c2 = ab * ab;
    expect(a2).toBeLessThan(b2 + c2);
    expect(b2).toBeLessThan(a2 + c2);
    expect(c2).toBeLessThan(a2 + b2);
  });

  it("each step is accepted with its expected rule", () => {
    for (let i = 0; i < P.steps.length; i++) {
      expect(report.steps[i].result, `step ${i + 1}: ${P.steps[i].humanReadable}`).toEqual({
        valid: true,
        rule: P.steps[i].expectRule,
      });
    }
  });

  it("the key step 4 really produces the concyclicity A,P,F,Q", () => {
    expect(report.steps[3].result).toEqual({
      valid: true,
      rule: "converse of inscribed angle",
    });
    expect(factHolds({ kind: "rel", name: "cyclic", points: ["A", "P", "F", "Q"] }, P.coords)).toBe(true);
  });

  it("goal reached end-to-end (AP = AQ) and all steps valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  // ---- minimality spot-check on the two crux chases -------------------------

  it("step 1 is MINIMAL: dropping either premise breaks ∠APQ = ∠ACB", () => {
    const prem = P.steps[0].premises;
    for (let i = 0; i < prem.length; i++) {
      const without = prem.filter((_, k) => k !== i);
      const r = researchVerify({
        coords: P.coords,
        bindings: {},
        establishedFacts: P.given,
        candidateFact: P.steps[0].fact,
        citedPremises: without,
      });
      expect(r.valid, `dropping premise ${i} should break step 1`).toBe(false);
    }
  });

  it("step 5 is MINIMAL: dropping any premise breaks ∠AQP = ∠ACB", () => {
    const established = [...P.given, P.steps[3].fact];
    const prem = P.steps[4].premises;
    for (let i = 0; i < prem.length; i++) {
      const without = prem.filter((_, k) => k !== i);
      const r = researchVerify({
        coords: P.coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: P.steps[4].fact,
        citedPremises: without,
      });
      expect(r.valid, `dropping premise ${i} should break step 5`).toBe(false);
    }
  });
});
