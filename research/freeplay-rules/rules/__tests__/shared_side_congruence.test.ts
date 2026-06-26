import { describe, expect, it } from "vitest";
import { factEqual, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { shared_side_congruence } from "../shared_side_congruence";
import { verifyWith, RULES } from "../../harness";

/**
 * Generic kite ABCD sharing the diagonal AC, with third vertices B and D:
 *   A = [0, 4]   apex of the short legs   (AB = AD = √13)
 *   B = [2, 1]
 *   C = [0, -3]  apex of the long legs    (CB = CD = √20)
 *   D = [-2, 1]
 *
 * It is a FAITHFUL, NON-degenerate realization: AB = AD and CB = CD, but
 * AB ≠ CB (NOT a rhombus), no three points are collinear, and ∠ABC = ∠ADC ≈
 * 119.74° is not a right angle (no accidental symmetry). The shared side is
 * AC (the y-axis); B (x=2) and D (x=-2) lie on OPPOSITE sides of it — the
 * reflective kite case — so the test also exercises the rule's orientation-free
 * (undirected angle) handling. Every given and goal is checked with `factHolds`.
 */
const A: V = [0, 4];
const B: V = [2, 1];
const C: V = [0, -3];
const D: V = [-2, 1];

const coords: Coords = { A, B, C, D };

// The two SSS-over-a-shared-side premises (the legs at each shared endpoint).
const legA = rel("cong", ["A", "B", "A", "D"]); // AB = AD
const legC = rel("cong", ["C", "B", "C", "D"]); // CB = CD

// The corresponding equal angles (conclusions).
const angBD = rel("eqangle", ["A", "B", "C", "A", "D", "C"]); // ∠ABC = ∠ADC (primary)
const angA = rel("eqangle", ["B", "A", "C", "D", "A", "C"]); // ∠BAC = ∠DAC
const angC = rel("eqangle", ["B", "C", "A", "D", "C", "A"]); // ∠BCA = ∠DCA

const givens = [legA, legC];
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

describe("shared-side congruent triangles (research rule)", () => {
  it("the coordinate figure realizes every given (and the goal angles) faithfully", () => {
    expect(factHolds(legA, coords)).toBe(true);
    expect(factHolds(legC, coords)).toBe(true);
    expect(factHolds(angBD, coords)).toBe(true);
    expect(factHolds(angA, coords)).toBe(true);
    expect(factHolds(angC, coords)).toBe(true);
    // It is a genuine (non-rhombus) kite: the two leg lengths differ.
    expect(factHolds(rel("cong", ["A", "B", "C", "B"]), coords)).toBe(false);
    // B and D are on opposite sides of the shared side AC (the y-axis).
    expect(B[0] * D[0]).toBeLessThan(0);
  });

  it("the rule alone derives the primary ∠ABC = ∠ADC and both shared-endpoint angles", () => {
    const out = shared_side_congruence.derive(givens, ctx);
    expect(out.some((f) => factEqual(f, angBD))).toBe(true);
    expect(out.some((f) => factEqual(f, angA))).toBe(true);
    expect(out.some((f) => factEqual(f, angC))).toBe(true);
  });

  it("verifies in isolation citing exactly the two leg congruences ⇒ ∠ABC = ∠ADC", () => {
    const r = verifyWith([shared_side_congruence], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angBD,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "shared-side congruent triangles" });
  });

  it("MINIMALITY: dropping cong(A,B,A,D) → not valid", () => {
    const r = verifyWith([shared_side_congruence], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angBD,
      citedPremises: [legC],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping cong(C,B,C,D) → not valid", () => {
    const r = verifyWith([shared_side_congruence], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angBD,
      citedPremises: [legA],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a non-kite 4-point figure ⇒ no angle emitted, step rejected", () => {
    // A generic quadrilateral that is NOT a kite: AB ≠ AD and CB ≠ CD, so
    // △ABC and △ADC are not congruent and ∠ABC ≠ ∠ADC.
    const bad: Coords = {
      A: [0, 4],
      B: [2, 1],
      C: [0, -3],
      D: [-3, 0],
    };
    expect(factHolds(legA, bad)).toBe(false); // AB ≠ AD
    expect(factHolds(legC, bad)).toBe(false); // CB ≠ CD
    expect(factHolds(angBD, bad)).toBe(false); // ∠ABC ≠ ∠ADC

    // Rule emits nothing (its numeric angle guards reject the false conclusion)…
    const out = shared_side_congruence.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(false);

    // …and the verifier rejects the step outright.
    const r = verifyWith([shared_side_congruence], {
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angBD,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: the shipped engine (RULES) cannot prove ∠ABC = ∠ADC from the two leg congruences", () => {
    // The conclusion is an ANGLE equality drawn from two LENGTH equalities over
    // a 4-point figure. AR is angles-only (it ignores `cong`), the shipped
    // `isosceles` rule runs the other way (eqangle ⇒ cong), and `sss_congruence`
    // needs six distinct vertices — so the step is genuinely unprovable today.
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angBD,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });
});
