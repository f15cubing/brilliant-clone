/**
 * Play-test for the arc-midpoint ("trillium") lemma MB = MC — verified end-to-end.
 *
 * A one-line inscribed-angle + bisector chase to ∠MBC = ∠MCB, then the shipped
 * isosceles rule to MB = MC. Replayed through the research harness; every step is
 * accepted, both premises of the chase are load-bearing, and the goal is reached.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { researchVerify } from "../../harness";
import { replayProblem } from "../replay";
import { arc_midpoint_lemma as P } from "../arc_midpoint_lemma";

const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);

describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) expect(factHolds(g, P.coords), JSON.stringify(g)).toBe(true);
  });

  it("every step fact (and the goal) is numerically true", () => {
    for (const s of report.steps) expect(s.numericallyTrue, s.label).toBe(true);
    expect(factHolds(P.goal, P.coords)).toBe(true);
  });

  it("triangle ABC is scalene and MB = MC numerically", () => {
    const { A, B, C, M } = P.coords as Record<string, number[]>;
    const ab = d(A, B), bc = d(B, C), ca = d(C, A);
    expect(Math.abs(ab - bc)).toBeGreaterThan(1e-3);
    expect(Math.abs(bc - ca)).toBeGreaterThan(1e-3);
    expect(Math.abs(ca - ab)).toBeGreaterThan(1e-3);
    expect(Math.abs(d(M, B) - d(M, C))).toBeLessThan(1e-9);
  });

  it("each step is accepted with its expected rule", () => {
    for (let i = 0; i < P.steps.length; i++) {
      expect(report.steps[i].result, `step ${i + 1}: ${P.steps[i].humanReadable}`).toEqual({
        valid: true,
        rule: P.steps[i].expectRule,
      });
    }
  });

  it("goal reached end-to-end (MB = MC) and all steps valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  it("step 1 MINIMAL: needs BOTH the concyclicity and the bisector equality", () => {
    const prem = P.steps[0].premises;
    for (let i = 0; i < prem.length; i++) {
      const without = prem.filter((_, k) => k !== i);
      const r = researchVerify({
        coords: P.coords, bindings: {}, establishedFacts: P.given,
        candidateFact: P.steps[0].fact, citedPremises: without,
      });
      expect(r.valid, `dropping premise ${i} should break step 1`).toBe(false);
    }
  });
});
