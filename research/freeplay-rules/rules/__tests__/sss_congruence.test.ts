import { describe, expect, it } from "vitest";
import { factEqual, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { sss_congruence } from "../sss_congruence";
import { verifyWith, RULES } from "../../harness";

/**
 * Triangle ABC in generic (scalene) position:
 *   A=[0,0], B=[4,0], C=[1,3]
 *   |AB| = 4, |BC| = √18, |CA| = √10  — three distinct side lengths.
 *
 * Triangle DEF is a MIRRORED rigid image of ABC: reflect across the x-axis,
 * then rotate by 37° and translate. An improper isometry preserves every length
 * and every UNDIRECTED angle, so DEF is congruent to ABC (a reflected copy) with
 * the correspondence A↔D, B↔E, C↔F, and all of
 *   cong(A,B,D,E), cong(B,C,E,F), cong(C,A,F,D), eqangle(A,B,C,D,E,F)
 * hold exactly. Using a reflection (not just a rotation) checks the rule stays
 * sound for mirror images. We verify each given with `factHolds` below.
 */
const A: V = [0, 0];
const B: V = [4, 0];
const C: V = [1, 3];

/** Reflect across the x-axis, then rotate by `thetaDeg`, then translate by `t`. */
function mirrorRigid(p: V, thetaDeg: number, t: V): V {
  const m: V = [p[0], -p[1]]; // orientation-reversing reflection
  const r = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [cos * m[0] - sin * m[1] + t[0], sin * m[0] + cos * m[1] + t[1]];
}

const T = (p: V): V => mirrorRigid(p, 37, [10, 2]);
const D = T(A);
const E = T(B);
const F = T(C);

const coords: Coords = { A, B, C, D, E, F };

// The three SSS premises (a complete side cycle).
const sideAB = rel("cong", ["A", "B", "D", "E"]); // |AB| = |DE|
const sideBC = rel("cong", ["B", "C", "E", "F"]); // |BC| = |EF|
const sideCA = rel("cong", ["C", "A", "F", "D"]); // |CA| = |FD|

// The corresponding equal angles (conclusions).
const angB = rel("eqangle", ["A", "B", "C", "D", "E", "F"]); // ∠ABC = ∠DEF (primary)
const angA = rel("eqangle", ["B", "A", "C", "E", "D", "F"]); // ∠BAC = ∠EDF
const angC = rel("eqangle", ["B", "C", "A", "E", "F", "D"]); // ∠BCA = ∠EFD

const givens = [sideAB, sideBC, sideCA];
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

describe("SSS congruent triangles (research rule)", () => {
  it("the coordinate figure realizes every given (and the goal angles) faithfully", () => {
    expect(factHolds(sideAB, coords)).toBe(true);
    expect(factHolds(sideBC, coords)).toBe(true);
    expect(factHolds(sideCA, coords)).toBe(true);
    expect(factHolds(angB, coords)).toBe(true);
    expect(factHolds(angA, coords)).toBe(true);
    expect(factHolds(angC, coords)).toBe(true);
  });

  it("the rule alone derives the primary angle ∠ABC = ∠DEF and both extra angles", () => {
    const out = sss_congruence.derive(givens, ctx);
    expect(out.some((f) => factEqual(f, angB))).toBe(true);
    expect(out.some((f) => factEqual(f, angA))).toBe(true);
    expect(out.some((f) => factEqual(f, angC))).toBe(true);
  });

  it("verifies in isolation citing exactly the three SSS side congruences ⇒ ∠ABC = ∠DEF", () => {
    const r = verifyWith([sss_congruence], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "SSS congruent triangles" });
  });

  it("MINIMALITY: dropping cong(A,B,D,E) → not valid", () => {
    const r = verifyWith([sss_congruence], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: [sideBC, sideCA],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping cong(B,C,E,F) → not valid", () => {
    const r = verifyWith([sss_congruence], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: [sideAB, sideCA],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping cong(C,A,F,D) → not valid", () => {
    const r = verifyWith([sss_congruence], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: [sideAB, sideBC],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a second triangle that is NOT congruent → no angle emitted, step rejected", () => {
    // D2,E2 keep |D2 E2| = |AB| = 4 and |E2 F2| = |BC| = √18, but F2 sits at an
    // 70° angle from E2 (≠ ∠ABC = 45°), so the third side |F2 D2| ≠ |CA| and the
    // triangles are NOT congruent: ∠D2 E2 F2 ≠ ∠ABC.
    const len = Math.sqrt(18);
    const phi = (70 * Math.PI) / 180;
    const bad: Coords = {
      A,
      B,
      C,
      D: [20, 0],
      E: [24, 0],
      F: [24 + len * Math.cos(phi), len * Math.sin(phi)],
    };
    expect(factHolds(sideAB, bad)).toBe(true); // |AB| = |DE| still holds
    expect(factHolds(sideBC, bad)).toBe(true); // |BC| = |EF| still holds
    expect(factHolds(sideCA, bad)).toBe(false); // third side differs → not congruent
    expect(factHolds(angB, bad)).toBe(false); // ∠ABC ≠ ∠DEF

    // Rule emits nothing (its numeric angle guards reject the false conclusion)…
    const out = sss_congruence.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(false);

    // …and the verifier rejects the step outright.
    const r = verifyWith([sss_congruence], {
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("PROMOTED: the shipped engine (RULES) now proves ∠ABC = ∠DEF from the three congruences", () => {
    // This rule has been promoted into the shipped engine
    // (src/lib/freeplay/rules/), so RULES now turns the three congruences into
    // the `eqangle` directly. Regression guard that the promotion stayed wired.
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: givens,
    });
    expect(r.valid).toBe(true);
  });
});
