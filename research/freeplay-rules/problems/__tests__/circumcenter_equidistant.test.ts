import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { replayProblem } from "../replay";
import { circumcenter_equidistant as P } from "../circumcenter_equidistant";

/**
 * Play-test for Problem 1. Originally this stalled at the OB=OC step (no
 * cong-transitivity rule). Batch 2 added `cong_transitivity`, so the chain now
 * CLOSES end-to-end:
 *  - two perp_bisector steps (OA=OB, OA=OC), then
 *  - cong_transitivity (OB=OC) ⇒ goal reached.
 */
describe(`problem: ${P.id} (${P.source})`, () => {
  const report = replayProblem(P);

  it("every given is numerically true in the coordinates", () => {
    for (const g of P.given) {
      expect(factHolds(g, P.coords, P.bindings ?? {}), JSON.stringify(g)).toBe(true);
    }
  });

  it("every step fact is numerically true in the coordinates", () => {
    for (const s of report.steps) {
      expect(s.numericallyTrue, s.label).toBe(true);
    }
    // and the goal itself is numerically true (OB = OC = √13)…
    expect(factHolds(P.goal, P.coords, P.bindings ?? {})).toBe(true);
  });

  it("step 1: O on perp bisector of AB ⇒ OA = OB (perp_bisector rule)", () => {
    expect(report.steps[0].result).toEqual({
      valid: true,
      rule: "perpendicular bisector ⇒ equidistant",
    });
  });

  it("step 2: O on perp bisector of AC ⇒ OA = OC (perp_bisector rule)", () => {
    expect(report.steps[1].result).toEqual({
      valid: true,
      rule: "perpendicular bisector ⇒ equidistant",
    });
  });

  it("step 3 (OB = OC) now closes via cong_transitivity (Batch 2 gap fix)", () => {
    expect(report.steps[2].result).toEqual({
      valid: true,
      rule: "equal segments chain",
    });
  });

  it("the goal is now reached end-to-end", () => {
    expect(report.goalReached).toBe(true);
    expect(report.allValid).toBe(true);
  });
});
