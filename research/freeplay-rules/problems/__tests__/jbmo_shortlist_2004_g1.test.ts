/**
 * Play-test for JBMO Shortlist 2004 G1 (∠MBQ = ∠NBP) — verified end-to-end.
 *
 * Two isosceles base-angle steps (from the equal radii of the circle C centered
 * at A) feed a single directed-angle chase across the two intersecting circles.
 * Replayed through the research harness; every step is accepted, every premise in
 * the chase is load-bearing, and the goal is reached.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { researchVerify } from "../../harness";
import { replayProblem } from "../replay";
import { jbmo_shortlist_2004_g1 as P } from "../jbmo_shortlist_2004_g1";

const cross = (o: number[], a: number[], b: number[]) =>
  (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

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

  it("the realization matches the statement: N and Q are on opposite sides of MP, AB > AM", () => {
    const c = P.coords as Record<string, number[]>;
    const sN = cross(c.M, c.P, c.N);
    const sQ = cross(c.M, c.P, c.Q);
    expect(sN * sQ).toBeLessThan(0); // opposite sides of line MP
    const d = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    expect(d(c.A, c.B)).toBeGreaterThan(d(c.A, c.M)); // AB > AM
  });

  it("each step is accepted with its expected rule", () => {
    for (let i = 0; i < P.steps.length; i++) {
      expect(report.steps[i].result, `step ${i + 1}: ${P.steps[i].humanReadable}`).toEqual({
        valid: true,
        rule: P.steps[i].expectRule,
      });
    }
  });

  it("goal reached end-to-end (∠MBQ = ∠NBP) and all steps valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });

  it("the final chase is MINIMAL: dropping any of its four premises breaks it", () => {
    const established = [...P.given, P.steps[0].fact, P.steps[1].fact];
    const prem = P.steps[2].premises;
    for (let i = 0; i < prem.length; i++) {
      const without = prem.filter((_, k) => k !== i);
      const r = researchVerify({
        coords: P.coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: P.steps[2].fact,
        citedPremises: without,
      });
      expect(r.valid, `dropping premise ${i} should break the chase`).toBe(false);
    }
  });
});
