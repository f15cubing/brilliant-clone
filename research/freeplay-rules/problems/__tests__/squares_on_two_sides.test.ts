/**
 * Play-test for "squares on two sides" (BG = CE) — verified end-to-end.
 *
 * One directed-angle step to ∠BAG = ∠EAC (from the two square right angles), then
 * the shipped spiral-congruence rule (SAS about the common vertex A) to BG = CE.
 * Replayed through the research harness; every step is accepted, every premise is
 * load-bearing, and the goal is reached.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { researchVerify } from "../../harness";
import { replayProblem } from "../replay";
import { squares_on_two_sides as P } from "../squares_on_two_sides";

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

  it("triangle ABC is scalene and BG = CE numerically", () => {
    const { A, B, C, E, G } = P.coords as Record<string, number[]>;
    const ab = d(A, B), bc = d(B, C), ca = d(C, A);
    expect(Math.abs(ab - bc)).toBeGreaterThan(1e-3);
    expect(Math.abs(bc - ca)).toBeGreaterThan(1e-3);
    expect(Math.abs(ca - ab)).toBeGreaterThan(1e-3);
    expect(Math.abs(d(B, G) - d(C, E))).toBeLessThan(1e-9);
  });

  it("each step is accepted with its expected rule", () => {
    for (let i = 0; i < P.steps.length; i++) {
      expect(report.steps[i].result, `step ${i + 1}: ${P.steps[i].humanReadable}`).toEqual({
        valid: true,
        rule: P.steps[i].expectRule,
      });
    }
  });

  it("goal reached end-to-end (BG = CE) and all steps valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  it("step 1 MINIMAL: both square right angles are needed", () => {
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

  it("step 2 MINIMAL: dropping either side-congruence or the angle breaks SAS", () => {
    const established = [...P.given, P.steps[0].fact];
    const prem = P.steps[1].premises;
    for (let i = 0; i < prem.length; i++) {
      const without = prem.filter((_, k) => k !== i);
      const r = researchVerify({
        coords: P.coords, bindings: {}, establishedFacts: established,
        candidateFact: P.steps[1].fact, citedPremises: without,
      });
      expect(r.valid, `dropping premise ${i} should break step 2`).toBe(false);
    }
  });
});
