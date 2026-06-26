import { describe, expect, it } from "vitest";
import { factEqual, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { shared_side_congruence } from "../rules/shared_side_congruence";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules — the 4-point (kite) SSS case.
 *
 * Generic kite ABCD sharing diagonal AC, third vertices B, D on OPPOSITE sides
 * of AC (the reflective kite): A=[0,4], B=[2,1], C=[0,-3], D=[-2,1].
 *   AB = AD = √13, CB = CD = √20 (NOT a rhombus), ∠ABC = ∠ADC ≈ 119.74°.
 */
const A: V = [0, 4];
const B: V = [2, 1];
const C: V = [0, -3];
const D: V = [-2, 1];

const coords: Coords = { A, B, C, D };

const legA = rel("cong", ["A", "B", "A", "D"]); // AB = AD
const legC = rel("cong", ["C", "B", "C", "D"]); // CB = CD

const angBD = rel("eqangle", ["A", "B", "C", "A", "D", "C"]); // ∠ABC = ∠ADC (primary)
const angA = rel("eqangle", ["B", "A", "C", "D", "A", "C"]); // ∠BAC = ∠DAC
const angC = rel("eqangle", ["B", "C", "A", "D", "C", "A"]); // ∠BCA = ∠DCA

const givens = [legA, legC];
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

describe("shared-side congruent triangles (promoted rule)", () => {
  it("the coordinate figure realizes every given (and the goal angles) faithfully", () => {
    expect(factHolds(legA, coords)).toBe(true);
    expect(factHolds(legC, coords)).toBe(true);
    expect(factHolds(angBD, coords)).toBe(true);
    expect(factHolds(angA, coords)).toBe(true);
    expect(factHolds(angC, coords)).toBe(true);
    expect(factHolds(rel("cong", ["A", "B", "C", "B"]), coords)).toBe(false);
    expect(B[0] * D[0]).toBeLessThan(0); // opposite sides of AC
  });

  it("the rule alone derives ∠ABC = ∠ADC and both shared-endpoint angles", () => {
    const out = shared_side_congruence.derive(givens, ctx);
    expect(out.some((f) => factEqual(f, angBD))).toBe(true);
    expect(out.some((f) => factEqual(f, angA))).toBe(true);
    expect(out.some((f) => factEqual(f, angC))).toBe(true);
  });

  it("end-to-end: verify() accepts ∠ABC = ∠ADC citing the two leg congruences", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angBD,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "shared-side congruent triangles" });
  });

  it("MINIMALITY: dropping cong(A,B,A,D) ⇒ angle not derived", () => {
    const out = shared_side_congruence.derive([legC], ctx);
    expect(out.some((f) => factEqual(f, angBD))).toBe(false);
  });

  it("MINIMALITY: dropping cong(C,B,C,D) ⇒ angle not derived", () => {
    const out = shared_side_congruence.derive([legA], ctx);
    expect(out.some((f) => factEqual(f, angBD))).toBe(false);
  });

  it("SOUNDNESS: a non-kite 4-point figure ⇒ no angle emitted, step rejected", () => {
    const bad: Coords = {
      A: [0, 4],
      B: [2, 1],
      C: [0, -3],
      D: [-3, 0],
    };
    expect(factHolds(legA, bad)).toBe(false);
    expect(factHolds(legC, bad)).toBe(false);
    expect(factHolds(angBD, bad)).toBe(false);

    const out = shared_side_congruence.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angBD,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });
});
