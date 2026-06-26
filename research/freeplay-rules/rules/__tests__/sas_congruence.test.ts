import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { sas_congruence } from "../sas_congruence";
import { verifyWith, RULES } from "../../harness";

/**
 * Triangle ABC in generic (scalene) position:
 *   A=[0,0], B=[4,0], C=[1,3]
 *   |BA| = 4, |BC| = √18, |AC| = √10, included angle ∠ABC = 45°.
 *
 * Triangle DEF is a rigid image of ABC (rotation by 37° + translation), with the
 * correspondence A↔D, B↔E, C↔F. A rotation preserves every length and angle, so
 *   cong(A,B,D,E), cong(B,C,E,F), eqangle(A,B,C,D,E,F), cong(A,C,D,F)
 * all hold exactly. We verify each given with `factHolds` below.
 */
const A: V = [0, 0];
const B: V = [4, 0];
const C: V = [1, 3];

function rigid(p: V, thetaDeg: number, t: V): V {
  const r = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [cos * p[0] - sin * p[1] + t[0], sin * p[0] + cos * p[1] + t[1]];
}

const T = (p: V): V => rigid(p, 37, [10, 2]);
const D = T(A);
const E = T(B);
const F = T(C);

const coords: Coords = { A, B, C, D, E, F };

// SAS premises.
const sideBA = rel("cong", ["A", "B", "D", "E"]); // |BA| = |ED|
const sideBC = rel("cong", ["B", "C", "E", "F"]); // |BC| = |EF|
const included = rel("eqangle", ["A", "B", "C", "D", "E", "F"]); // ∠ABC = ∠DEF
const thirdSide = rel("cong", ["A", "C", "D", "F"]); // |AC| = |DF|  (the goal)

const ctx = { coords, bindings: {}, points: Object.keys(coords) };

describe("SAS congruent triangles (research rule)", () => {
  it("the coordinate figure realizes every given (and the goal) faithfully", () => {
    expect(factHolds(sideBA, coords)).toBe(true);
    expect(factHolds(sideBC, coords)).toBe(true);
    expect(factHolds(included, coords)).toBe(true);
    expect(factHolds(thirdSide, coords)).toBe(true);
  });

  it("the rule alone derives the third-side congruence AC = DF", () => {
    const out = sas_congruence.derive([sideBA, sideBC, included], ctx);
    expect(
      out.some((f) => f.kind === "rel" && f.name === "cong" &&
        ["A", "C", "D", "F"].every((p, i) => f.points[i] === p)),
    ).toBe(true);
  });

  it("verifies in isolation citing exactly the three SAS premises", () => {
    const r = verifyWith([sas_congruence], {
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC, included],
    });
    expect(r).toEqual({ valid: true, rule: "SAS congruent triangles" });
  });

  it("MINIMALITY: dropping the included angle → not valid", () => {
    const r = verifyWith([sas_congruence], {
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC], // no angle
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping the first side (cong BA=ED) → not valid", () => {
    const r = verifyWith([sas_congruence], {
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBC, included],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping the second side (cong BC=EF) → not valid", () => {
    const r = verifyWith([sas_congruence], {
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBA, included],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a NON-included angle (vertex A/D) does not justify AC = DF", () => {
    // ∠BAC = ∠EDF is a true angle equality here, but its vertices (A,D) are not
    // the vertices between the two cong'd sides, so SAS must not fire.
    const nonIncluded = rel("eqangle", ["B", "A", "C", "E", "D", "F"]);
    expect(factHolds(nonIncluded, coords)).toBe(true); // genuinely equal angles
    const r = verifyWith([sas_congruence], {
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, nonIncluded],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC, nonIncluded],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a second triangle that is NOT congruent → AC = DF not validated", () => {
    // D2,E2 keep |D2 E2| = |AB| = 4 and |E2 F2| = |BC| = √18, but the included
    // angle at E2 is 80° (≠ 45°), so the triangle is not congruent and DF ≠ AC.
    const len = Math.sqrt(18);
    const phi = (80 * Math.PI) / 180;
    const bad: Coords = {
      A,
      B,
      C,
      D: [14, 0],
      E: [10, 0],
      F: [10 + len * Math.cos(phi), len * Math.sin(phi)],
    };
    expect(factHolds(sideBA, bad)).toBe(true); // |BA| = |ED| still holds
    expect(factHolds(sideBC, bad)).toBe(true); // |BC| = |EF| still holds
    expect(factHolds(included, bad)).toBe(false); // angle differs (45° vs 80°)
    expect(factHolds(thirdSide, bad)).toBe(false); // |AC| ≠ |DF|

    // Rule emits nothing (its numeric guards reject the false conclusion)…
    const out = sas_congruence.derive([sideBA, sideBC, included], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    // …and the verifier rejects the step outright.
    const r = verifyWith([sas_congruence], {
      coords: bad,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC, included],
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: the shipped engine (RULES) cannot prove AC = DF from the SAS premises", () => {
    // The third-side equality is a LENGTH fact; AR is angles-only and no shipped
    // DD rule produces this `cong`, so this step is genuinely unprovable today.
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC, included],
    });
    expect(r.valid).toBe(false);
  });
});
