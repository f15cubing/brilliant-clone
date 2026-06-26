import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { isosceles_converse } from "../isosceles_converse";
import { verifyWith, RULES } from "../../harness";

/**
 * Generic isosceles triangle: apex T=(0,4), base A=(-3,0), B=(3,0).
 *   TA = TB = 5, but AB = 6 (NOT equilateral). The base angles ∠TAB and ∠TBA
 *   are equal. P is an unrelated extra point to keep the figure generic.
 */
const coords: Coords = {
  T: [0, 4],
  A: [-3, 0],
  B: [3, 0],
  P: [7, 2],
};

const cong = rel("cong", ["T", "A", "T", "B"]); // TA = TB
const goal = rel("eqangle", ["T", "A", "B", "T", "B", "A"]); // ∠TAB = ∠TBA

describe("isosceles: equal sides ⇒ equal base angles (research rule)", () => {
  it("the rule alone derives eqangle(T,A,B,T,B,A) from cong(T,A,T,B)", () => {
    const out = isosceles_converse.derive([cong], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(
      out.some((f) => f.kind === "rel" && f.name === "eqangle"),
    ).toBe(true);
  });

  it("recognizes the apex regardless of cong ordering (cong is symmetric)", () => {
    for (const c of [
      rel("cong", ["T", "A", "T", "B"]),
      rel("cong", ["A", "T", "B", "T"]),
      rel("cong", ["T", "A", "B", "T"]),
      rel("cong", ["T", "B", "T", "A"]),
    ]) {
      const out = isosceles_converse.derive([c], {
        coords,
        bindings: {},
        points: Object.keys(coords),
      });
      expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(
        true,
      );
    }
  });

  it("verifies in isolation citing exactly cong(T,A,T,B)", () => {
    const r = verifyWith([isosceles_converse], {
      coords,
      bindings: {},
      establishedFacts: [cong],
      candidateFact: goal,
      citedPremises: [cong],
    });
    expect(r).toEqual({
      valid: true,
      rule: "isosceles: equal sides ⇒ equal base angles",
    });
  });

  it("MINIMALITY: with no cited cong, the step is not valid", () => {
    const r = verifyWith([isosceles_converse], {
      coords,
      bindings: {},
      establishedFacts: [cong],
      candidateFact: goal,
      citedPremises: [],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: in a scalene triangle (TA ≠ TB) the rule emits nothing and the step is rejected", () => {
    // T=(0,4), A=(-3,0), B=(5,0): TA = 5 but TB = √41, so TA ≠ TB and the base
    // angles ∠TAB and ∠TBA are NOT equal (the conclusion is false here).
    const scalene: Coords = {
      T: [0, 4],
      A: [-3, 0],
      B: [5, 0],
      P: [7, 2],
    };

    // The rule never produces the false base-angle equality.
    const out = isosceles_converse.derive([cong], {
      coords: scalene,
      bindings: {},
      points: Object.keys(scalene),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(
      false,
    );

    // And the verifier rejects the step (numeric truth gate).
    const r = verifyWith([isosceles_converse], {
      coords: scalene,
      bindings: {},
      establishedFacts: [cong],
      candidateFact: goal,
      citedPremises: [cong],
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: the shipped engine cannot derive the base-angle equality from the cong alone", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [cong],
      candidateFact: goal,
      citedPremises: [cong],
    });
    // Shipped engine has no length→angle reasoning (AR is angles-only and the
    // shipped `isosceles` goes angle→length), so this must be a real gap.
    expect(r.valid).toBe(false);
  });
});
