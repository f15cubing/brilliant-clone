import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { isosceles_converse } from "../rules/isosceles_converse";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules. The CONVERSE of the shipped
 * `isosceles` rule (equal sides ⇒ equal base angles).
 *
 * Generic isosceles triangle: apex T=(0,4), base A=(-3,0), B=(3,0).
 *   TA = TB = 5, AB = 6 (NOT equilateral). P is an unrelated extra point.
 */
const coords: Coords = {
  T: [0, 4],
  A: [-3, 0],
  B: [3, 0],
  P: [7, 2],
};

const cong = rel("cong", ["T", "A", "T", "B"]); // TA = TB
const goal = rel("eqangle", ["T", "A", "B", "T", "B", "A"]); // ∠TAB = ∠TBA

describe("isosceles: equal sides ⇒ equal base angles (promoted rule)", () => {
  it("the rule alone derives eqangle(T,A,B,T,B,A) from cong(T,A,T,B)", () => {
    const out = isosceles_converse.derive([cong], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(true);
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
      expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(true);
    }
  });

  it("end-to-end: verify() accepts the base-angle equality citing cong(T,A,T,B)", () => {
    const r = verify({
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

  it("MINIMALITY: with no cited cong, the rule emits nothing", () => {
    const out = isosceles_converse.derive([], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(out.length).toBe(0);
  });

  it("SOUNDNESS: in a scalene triangle (TA ≠ TB) emits nothing, step rejected", () => {
    // T=(0,4), A=(-3,0), B=(5,0): TA = 5 but TB = √41, base angles differ.
    const scalene: Coords = {
      T: [0, 4],
      A: [-3, 0],
      B: [5, 0],
      P: [7, 2],
    };
    const out = isosceles_converse.derive([cong], {
      coords: scalene,
      bindings: {},
      points: Object.keys(scalene),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(false);

    const r = verify({
      coords: scalene,
      bindings: {},
      establishedFacts: [cong],
      candidateFact: goal,
      citedPremises: [cong],
    });
    expect(r.valid).toBe(false);
  });
});
