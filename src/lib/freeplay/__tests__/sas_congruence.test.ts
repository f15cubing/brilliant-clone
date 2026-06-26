import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { sas_congruence } from "../rules/sas_congruence";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules.
 *
 * Triangle ABC (scalene): A=[0,0], B=[4,0], C=[1,3], ∠ABC = 45°. DEF is a rigid
 * image (rotation + translation), correspondence A↔D, B↔E, C↔F.
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

const sideBA = rel("cong", ["A", "B", "D", "E"]); // |BA| = |ED|
const sideBC = rel("cong", ["B", "C", "E", "F"]); // |BC| = |EF|
const included = rel("eqangle", ["A", "B", "C", "D", "E", "F"]); // ∠ABC = ∠DEF
const thirdSide = rel("cong", ["A", "C", "D", "F"]); // |AC| = |DF| (goal)

const ctx = { coords, bindings: {}, points: Object.keys(coords) };
const hasThird = (out: ReturnType<typeof sas_congruence.derive>) =>
  out.some(
    (f) =>
      f.kind === "rel" &&
      f.name === "cong" &&
      ["A", "C", "D", "F"].every((p, i) => f.points[i] === p),
  );

describe("SAS congruent triangles (promoted rule)", () => {
  it("the coordinate figure realizes every given (and the goal) faithfully", () => {
    expect(factHolds(sideBA, coords)).toBe(true);
    expect(factHolds(sideBC, coords)).toBe(true);
    expect(factHolds(included, coords)).toBe(true);
    expect(factHolds(thirdSide, coords)).toBe(true);
  });

  it("the rule alone derives the third-side congruence AC = DF", () => {
    const out = sas_congruence.derive([sideBA, sideBC, included], ctx);
    expect(hasThird(out)).toBe(true);
  });

  it("end-to-end: verify() accepts AC = DF citing exactly the three SAS premises", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC, included],
    });
    expect(r).toEqual({ valid: true, rule: "SAS congruent triangles" });
  });

  it("MINIMALITY: dropping the included angle ⇒ third side not derived", () => {
    const out = sas_congruence.derive([sideBA, sideBC], ctx);
    expect(hasThird(out)).toBe(false);
  });

  it("CROSS-RULE SOUNDNESS: one side + the included angle must NOT prove AC = DF", () => {
    // Guards the length-layer interaction: with the figure congruent, the SAS
    // SIMILARITY ratio rule must not fire off the lone included angle (reading
    // the second side ratio from coordinates) and let the length layer bridge a
    // cited cong to the third side. {BC=EF, ∠ABC=∠DEF} is SSA, not SAS.
    for (const subset of [
      [sideBC, included], // drop BA
      [sideBA, included], // drop BC
    ]) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: [sideBA, sideBC, included],
        candidateFact: thirdSide,
        citedPremises: subset,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("MINIMALITY: dropping the first side (cong BA=ED) ⇒ third side not derived", () => {
    const out = sas_congruence.derive([sideBC, included], ctx);
    expect(hasThird(out)).toBe(false);
  });

  it("MINIMALITY: dropping the second side (cong BC=EF) ⇒ third side not derived", () => {
    const out = sas_congruence.derive([sideBA, included], ctx);
    expect(hasThird(out)).toBe(false);
  });

  it("SOUNDNESS: a NON-included angle (vertex A/D) does not justify AC = DF", () => {
    const nonIncluded = rel("eqangle", ["B", "A", "C", "E", "D", "F"]);
    expect(factHolds(nonIncluded, coords)).toBe(true); // genuinely equal angles
    const out = sas_congruence.derive([sideBA, sideBC, nonIncluded], ctx);
    expect(hasThird(out)).toBe(false);

    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [sideBA, sideBC, nonIncluded],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC, nonIncluded],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a second triangle that is NOT congruent ⇒ AC = DF not validated", () => {
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
    expect(factHolds(sideBA, bad)).toBe(true);
    expect(factHolds(sideBC, bad)).toBe(true);
    expect(factHolds(included, bad)).toBe(false);
    expect(factHolds(thirdSide, bad)).toBe(false);

    const out = sas_congruence.derive([sideBA, sideBC, included], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: [sideBA, sideBC, included],
      candidateFact: thirdSide,
      citedPremises: [sideBA, sideBC, included],
    });
    expect(r.valid).toBe(false);
  });
});
