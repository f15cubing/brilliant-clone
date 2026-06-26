/**
 * Play-test for IMO 2018 Problem 1 (DE ∥ FG) — SOLVED END-TO-END (Batch 7).
 *
 * The full angle-chase + Reim solution is encoded in six steps:
 *   1–4  derive AX = AD and AY = AE via a directed-angle chase (inscribed angle
 *        + isosceles converse) followed by the shipped isosceles rule.
 *   5    cyclic(D,E,X,Y) from AX = AD = AE = AY — closed by the research rule
 *        `concyclic_equal_radii` (equal radii ⇒ concyclic).
 *   6    DE ∥ FG by Reim's theorem (AR).
 * All six steps verify and the goal is reached.
 */
import { describe, expect, it } from "vitest";
import { factHolds } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { researchVerify } from "../../harness";
import { replayProblem } from "../replay";
import { imo_2018_p1 as P } from "../imo_2018_p1";

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

  it("step 1: directed-angle chase ⇒ ∠AXD = ∠ADX", () => {
    expect(report.steps[0].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  it("step 2: equal base angles ⇒ AX = AD (isosceles)", () => {
    expect(report.steps[1].result).toEqual({
      valid: true,
      rule: "isosceles: equal base angles ⇒ equal sides",
    });
  });

  it("step 3: mirror chase ⇒ ∠AYE = ∠AEY", () => {
    expect(report.steps[2].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  it("step 4: equal base angles ⇒ AY = AE (isosceles)", () => {
    expect(report.steps[3].result).toEqual({
      valid: true,
      rule: "isosceles: equal base angles ⇒ equal sides",
    });
  });

  // ---- THE FORMERLY-BLOCKED STEP, now closed by `concyclic_equal_radii` -----
  it("step 5: cyclic(D,E,X,Y) from the equal radii (equal radii ⇒ concyclic)", () => {
    expect(report.steps[4].result).toEqual({
      valid: true,
      rule: "equal radii ⇒ concyclic",
    });
  });

  it("the four rim points ARE genuinely concyclic", () => {
    expect(factHolds(rel("cyclic", ["D", "E", "X", "Y"]), P.coords)).toBe(true);
  });

  it("step 6 (Reim) finishes DE ∥ FG", () => {
    expect(report.steps[5].result).toEqual({
      valid: true,
      rule: "algebraic angle-chase",
    });
  });

  it("goal reached end-to-end", () => {
    expect(report.goalReached).toBe(true);
  });

  // The Reim finish also works from a directly-supplied concyclicity (sanity).
  it("step 6 (Reim) verifies from cyclic(D,E,X,Y) directly", () => {
    const cyclicDEXY = rel("cyclic", ["D", "E", "X", "Y"]);
    const established = [
      ...P.given,
      rel("eqangle", ["A", "X", "D", "A", "D", "X"]),
      rel("cong", ["A", "X", "A", "D"]),
      rel("eqangle", ["A", "Y", "E", "A", "E", "Y"]),
      rel("cong", ["A", "Y", "A", "E"]),
      cyclicDEXY,
    ];
    const r = researchVerify({
      coords: P.coords,
      bindings: {},
      establishedFacts: established,
      candidateFact: P.goal,
      citedPremises: [
        cyclicDEXY,
        rel("cyclic", ["F", "G", "X", "Y"]),
        rel("coll", ["F", "D", "X"]),
        rel("coll", ["G", "E", "Y"]),
      ],
    });
    expect(r).toEqual({ valid: true, rule: "algebraic angle-chase" });
  });
});
