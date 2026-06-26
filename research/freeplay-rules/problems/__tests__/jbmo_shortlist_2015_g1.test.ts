/**
 * Play-test for JBMO Shortlist 2015 G1 (A, B, D, E concyclic) — verified end-to-end.
 *
 * A tangent-chord directed-angle chase to ∠BAE = ∠BDE, then the shipped
 * `converse_inscribed` rule to conclude A, B, D, E concyclic. Replayed through
 * the research harness; every step is accepted, every premise of the chase is
 * load-bearing, and the goal is reached.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { researchVerify } from "../../harness";
import { replayProblem } from "../replay";
import { jbmo_shortlist_2015_g1 as P } from "../jbmo_shortlist_2015_g1";

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

  it("the triangle ABC is scalene (a faithful generic realization)", () => {
    const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    const { A, B, C } = P.coords as Record<string, number[]>;
    const ab = d(A, B), bc = d(B, C), ca = d(C, A);
    expect(Math.abs(ab - bc)).toBeGreaterThan(1e-3);
    expect(Math.abs(bc - ca)).toBeGreaterThan(1e-3);
    expect(Math.abs(ca - ab)).toBeGreaterThan(1e-3);
  });

  it("each step is accepted with its expected rule", () => {
    for (let i = 0; i < P.steps.length; i++) {
      expect(report.steps[i].result, `step ${i + 1}: ${P.steps[i].humanReadable}`).toEqual({
        valid: true,
        rule: P.steps[i].expectRule,
      });
    }
  });

  it("the converse-inscribed step really yields the concyclicity A,B,D,E", () => {
    expect(report.steps[1].result).toEqual({ valid: true, rule: "converse of inscribed angle" });
    expect(factHolds({ kind: "rel", name: "cyclic", points: ["A", "B", "D", "E"] }, P.coords)).toBe(true);
  });

  it("goal reached end-to-end (A,B,D,E concyclic) and all steps valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  it("the tangent-chord chase is MINIMAL: dropping any of its seven premises breaks it", () => {
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
});
