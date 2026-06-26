import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { similar_triangles_aa } from "../lengths/rules/similar_triangles_aa";
import { verify } from "../verify";
import { eqratio, factHoldsL } from "../lengths/dsl";

/**
 * Triangle ABC in GENERIC (scalene) position:
 *   A=[0,0], B=[5,0], C=[2,3]   →  |AB|=5, |BC|=√18, |CA|=√13  (all different).
 *
 * Triangle DEF is a SIMILAR (not congruent) image of ABC under a spiral
 * similarity: scale s=1.7, rotation 40°, translation [8,3], with correspondence
 * A↔D, B↔E, C↔F. A similarity preserves angles and scales every length by s, so
 * the two cited equal angles and all three side proportions hold exactly. s≠1
 * makes the triangles non-congruent, so this is a genuine SIMILARITY.
 */
const A: V = [0, 0];
const B: V = [5, 0];
const C: V = [2, 3];

function sim(p: V, scaleK: number, thetaDeg: number, t: V): V {
  const r = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [
    scaleK * (cos * p[0] - sin * p[1]) + t[0],
    scaleK * (sin * p[0] + cos * p[1]) + t[1],
  ];
}

const S = (p: V): V => sim(p, 1.7, 40, [8, 3]);
const D = S(A);
const E = S(B);
const F = S(C);

const coords: Coords = { A, B, C, D, E, F };
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

// AA premises: ∠BAC = ∠EDF (vertices A,D) and ∠ABC = ∠DEF (vertices B,E).
const angA = rel("eqangle", ["B", "A", "C", "E", "D", "F"]);
const angB = rel("eqangle", ["A", "B", "C", "D", "E", "F"]);
// Primary side proportion AB/DE = BC/EF.
const goal = eqratio("A", "B", "D", "E", "B", "C", "E", "F");

describe("AA similar triangles (length rule)", () => {
  it("the coordinate figure realizes the two angles and all proportions", () => {
    expect(factHoldsL(angA, coords)).toBe(true);
    expect(factHoldsL(angB, coords)).toBe(true);
    expect(factHoldsL(goal, coords)).toBe(true);
    // and the other two corresponding proportions
    expect(factHoldsL(eqratio("A", "B", "D", "E", "C", "A", "F", "D"), coords)).toBe(true);
    expect(factHoldsL(eqratio("B", "C", "E", "F", "C", "A", "F", "D"), coords)).toBe(true);
    // the triangles are genuinely NON-congruent (DE = 1.7·AB ≠ AB)
    expect(factHoldsL(rel("cong", ["A", "B", "D", "E"]), coords)).toBe(false);
  });

  it("the rule alone emits the primary side proportion AB/DE = BC/EF", () => {
    const out = similar_triangles_aa.derive([angA, angB], ctx);
    expect(out.some((f) => f.kind === "eqratio")).toBe(true);
    // all three pairwise proportions are produced
    expect(out.length).toBeGreaterThanOrEqual(3);
  });

  it("verifies the eqratio citing exactly the two eqangle facts", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: goal,
      citedPremises: [angA, angB],
    });
    expect(r).toEqual({ valid: true, rule: "AA similar triangles" });
  });

  it("MINIMALITY: dropping either equal-angle premise → not valid", () => {
    const dropA = verify({
      coords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: goal,
      citedPremises: [angB],
    });
    expect(dropA.valid).toBe(false);

    const dropB = verify({
      coords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: goal,
      citedPremises: [angA],
    });
    expect(dropB.valid).toBe(false);
  });

  it("MIRROR similarity is accepted (orientation is not constrained)", () => {
    // Reflect ABC across the x-axis, then scale/translate: a MIRROR image. AA
    // still holds (angles are unsigned), and the proportions are unchanged.
    const M = (p: V): V => {
      const flipped: V = [p[0], -p[1]];
      return sim(flipped, 1.3, 15, [4, -6]);
    };
    const mcoords: Coords = { A, B, C, D: M(A), E: M(B), F: M(C) };
    expect(factHoldsL(angA, mcoords)).toBe(true);
    expect(factHoldsL(angB, mcoords)).toBe(true);
    expect(factHoldsL(goal, mcoords)).toBe(true);
    const r = verify({
      coords: mcoords,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: goal,
      citedPremises: [angA, angB],
    });
    expect(r).toEqual({ valid: true, rule: "AA similar triangles" });
  });

  it("SOUNDNESS: triangles that are NOT similar → no emit, step rejected", () => {
    // DEF here is a generic triangle NOT similar to ABC, so the AA angle
    // equalities fail and AB/DE ≠ BC/EF.
    const bad: Coords = { A, B, C, D: [8, 3], E: [16, 2], F: [10, 9] };
    expect(factHoldsL(goal, bad)).toBe(false); // proportion is false

    // The rule's numeric guard keeps it silent.
    const out = similar_triangles_aa.derive([angA, angB], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "eqratio")).toBe(false);

    // And the verifier rejects the step outright.
    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: [angA, angB],
      candidateFact: goal,
      citedPremises: [angA, angB],
    });
    expect(r.valid).toBe(false);
  });
});
