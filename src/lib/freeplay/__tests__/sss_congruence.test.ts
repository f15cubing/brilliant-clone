import { describe, expect, it } from "vitest";
import { factEqual, rel } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { sss_congruence } from "../rules/sss_congruence";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules.
 *
 * Triangle ABC (scalene): A=[0,0], B=[4,0], C=[1,3]. DEF is a MIRRORED rigid
 * image (reflection + rotation + translation), correspondence A↔D, B↔E, C↔F —
 * checks the rule stays sound for reflected (improper) images.
 */
const A: V = [0, 0];
const B: V = [4, 0];
const C: V = [1, 3];

function mirrorRigid(p: V, thetaDeg: number, t: V): V {
  const m: V = [p[0], -p[1]];
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

const sideAB = rel("cong", ["A", "B", "D", "E"]); // |AB| = |DE|
const sideBC = rel("cong", ["B", "C", "E", "F"]); // |BC| = |EF|
const sideCA = rel("cong", ["C", "A", "F", "D"]); // |CA| = |FD|

const angB = rel("eqangle", ["A", "B", "C", "D", "E", "F"]); // ∠ABC = ∠DEF (primary)
const angA = rel("eqangle", ["B", "A", "C", "E", "D", "F"]); // ∠BAC = ∠EDF
const angC = rel("eqangle", ["B", "C", "A", "E", "F", "D"]); // ∠BCA = ∠EFD

const givens = [sideAB, sideBC, sideCA];
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

describe("SSS congruent triangles (promoted rule)", () => {
  it("the coordinate figure realizes every given (and the goal angles) faithfully", () => {
    expect(factHolds(sideAB, coords)).toBe(true);
    expect(factHolds(sideBC, coords)).toBe(true);
    expect(factHolds(sideCA, coords)).toBe(true);
    expect(factHolds(angB, coords)).toBe(true);
    expect(factHolds(angA, coords)).toBe(true);
    expect(factHolds(angC, coords)).toBe(true);
  });

  it("the rule alone derives ∠ABC = ∠DEF and both extra angles", () => {
    const out = sss_congruence.derive(givens, ctx);
    expect(out.some((f) => factEqual(f, angB))).toBe(true);
    expect(out.some((f) => factEqual(f, angA))).toBe(true);
    expect(out.some((f) => factEqual(f, angC))).toBe(true);
  });

  it("end-to-end: verify() accepts ∠ABC = ∠DEF citing the three SSS congruences", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "SSS congruent triangles" });
  });

  it("MINIMALITY: dropping cong(A,B,D,E) ⇒ angle not derived", () => {
    const out = sss_congruence.derive([sideBC, sideCA], ctx);
    expect(out.some((f) => factEqual(f, angB))).toBe(false);
  });

  it("MINIMALITY: dropping cong(B,C,E,F) ⇒ angle not derived", () => {
    const out = sss_congruence.derive([sideAB, sideCA], ctx);
    expect(out.some((f) => factEqual(f, angB))).toBe(false);
  });

  it("MINIMALITY: dropping cong(C,A,F,D) ⇒ angle not derived", () => {
    const out = sss_congruence.derive([sideAB, sideBC], ctx);
    expect(out.some((f) => factEqual(f, angB))).toBe(false);
  });

  it("SOUNDNESS: a non-congruent second triangle ⇒ no angle emitted, step rejected", () => {
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
    expect(factHolds(sideAB, bad)).toBe(true);
    expect(factHolds(sideBC, bad)).toBe(true);
    expect(factHolds(sideCA, bad)).toBe(false);
    expect(factHolds(angB, bad)).toBe(false);

    const out = sss_congruence.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "eqangle")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: angB,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });
});
