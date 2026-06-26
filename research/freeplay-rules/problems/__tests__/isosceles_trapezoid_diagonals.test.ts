import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { replayProblem } from "../replay";
import { isosceles_trapezoid_diagonals as P } from "../isosceles_trapezoid_diagonals";

/**
 * Play-test for Problem 2. The single SAS step closes a genuine LENGTH goal
 * (BD = AC) that the angles-only AR cannot produce, so this exercises the new
 * `sas_congruence` rule end-to-end and DOES reach the goal.
 */
describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords, P.bindings ?? {}), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact (and the goal) is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, s.label).toBe(true);
    }
    expect(factHolds(P.goal, P.coords, P.bindings ?? {})).toBe(true);
  });

  it("KEY step: SAS on △DAB ≅ △CBA yields BD = AC (sas_congruence rule)", () => {
    expect(report.steps[0].result).toEqual({
      valid: true,
      rule: "SAS congruent triangles",
    });
  });

  it("the full goal BD = AC is reached, every step valid", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });
});
