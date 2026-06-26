import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { dist, type V } from "@/lib/freeplay/geom";
import { sas_similarity } from "../lengths/rules/sas_similarity";
import { verify } from "../verify";
import { eqratio, factHoldsL } from "../lengths/dsl";

/**
 * Triangle ABC in GENERIC (scalene) position:
 *   A=[0,0], B=[6,0], C=[1,4]  →  |AB|=6, |BC|=√41, |CA|=√17  (all different).
 *
 * Triangle DEF is a SIMILAR (not congruent) image of ABC under a spiral
 * similarity: scale s=1.7, rotation 40°, translation [9,2], correspondence
 * A↔D, B↔E, C↔F. The two SAS givens (AB/DE = BC/EF and the included
 * ∠ABC = ∠DEF) and every derived fact hold exactly. s≠1 ⇒ genuine SIMILARITY.
 */
const A: V = [0, 0];
const B: V = [6, 0];
const C: V = [1, 4];

function sim(p: V, scaleK: number, thetaDeg: number, t: V): V {
  const r = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [
    scaleK * (cos * p[0] - sin * p[1]) + t[0],
    scaleK * (sin * p[0] + cos * p[1]) + t[1],
  ];
}

const S = (p: V): V => sim(p, 1.7, 40, [9, 2]);
const D = S(A);
const E = S(B);
const F = S(C);

const coords: Coords = { A, B, C, D, E, F };
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

// SAS premises: AB/DE = BC/EF  and  the INCLUDED angle ∠ABC = ∠DEF (vertices B,E).
const ratioPrem = eqratio("A", "B", "D", "E", "B", "C", "E", "F");
const angB = rel("eqangle", ["A", "B", "C", "D", "E", "F"]);

// Derived (target) remaining proportion AB/DE = CA/FD.
const goal = eqratio("A", "B", "D", "E", "C", "A", "F", "D");
// Derived remaining equal angles.
const angAtA = rel("eqangle", ["B", "A", "C", "E", "D", "F"]); // ∠BAC = ∠EDF
const angAtC = rel("eqangle", ["B", "C", "A", "E", "F", "D"]); // ∠BCA = ∠EFD

describe("SAS similar triangles (length rule)", () => {
  it("the coordinate figure realizes the SAS givens and every derived fact", () => {
    // givens
    expect(factHoldsL(ratioPrem, coords)).toBe(true);
    expect(factHoldsL(angB, coords)).toBe(true);
    // derived facts
    expect(factHoldsL(goal, coords)).toBe(true);
    expect(factHoldsL(angAtA, coords)).toBe(true);
    expect(factHoldsL(angAtC, coords)).toBe(true);
    // the bridge proportion the rule actually emits
    expect(factHoldsL(eqratio("B", "C", "E", "F", "C", "A", "F", "D"), coords)).toBe(true);
    // genuinely NON-congruent (DE = 1.7·AB ≠ AB), and scalene
    expect(factHoldsL(rel("cong", ["A", "B", "D", "E"]), coords)).toBe(false);
    expect(dist(A, B)).not.toBeCloseTo(dist(B, C));
    expect(dist(B, C)).not.toBeCloseTo(dist(C, A));
  });

  it("the rule emits the bridge proportion and the two remaining equal angles", () => {
    // The SAS two-sides proportion must be CITED (the verifier supplies it via
    // ctx.citedRatios); the rule no longer reads it off the coordinates.
    const out = sas_similarity.derive([angB], { ...ctx, citedRatios: [ratioPrem] });
    // bridge BC/EF = CA/FD
    expect(out.some((f) => f.kind === "eqratio")).toBe(true);
    // both remaining equal angles
    const has = (g: Fact) =>
      out.some(
        (f) =>
          f.kind === "rel" && factHoldsL(f, coords) && JSON.stringify(f) === JSON.stringify(g),
      );
    expect(has(angAtA)).toBe(true);
    expect(has(angAtC)).toBe(true);
    // it must NOT emit the target AB/DE = CA/FD directly (that needs the cited
    // ratio premise via the length layer — emitting it directly would break
    // minimality).
    const eqr = out.filter((f) => f.kind === "eqratio");
    expect(eqr.length).toBe(1);
  });

  it("verifies the derived proportion AB/DE = CA/FD citing the ratio + included-angle premises", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: goal,
      citedPremises: [ratioPrem, angB],
    });
    // The cited eqratio premise is fused with the rule's bridge by the length
    // layer, so the verifier attributes the step to the algebraic length-chase.
    expect(r).toEqual({ valid: true, rule: "algebraic length-chase" });
  });

  it("verifies a remaining equal angle directly under the rule name", () => {
    // A remaining equal angle follows from the FULL SAS hypothesis (both the
    // ratio and the included angle) — not the included angle alone, which would
    // be SSA-style unsound — so both premises are cited and both are required.
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: angAtA,
      citedPremises: [ratioPrem, angB],
    });
    expect(r).toEqual({ valid: true, rule: "SAS similar triangles" });
  });

  it("MINIMALITY (angle): a remaining equal angle is NOT derivable from the included angle alone", () => {
    // ∠ABC = ∠DEF on its own does not make the triangles similar, so ∠BAC = ∠EDF
    // must not be accepted without the cited side proportion.
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: angAtA,
      citedPremises: [angB],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping either SAS premise → not valid", () => {
    // drop the ratio premise (cite only the included angle)
    const dropRatio = verify({
      coords,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: goal,
      citedPremises: [angB],
    });
    expect(dropRatio.valid).toBe(false);

    // drop the included-angle premise (cite only the ratio)
    const dropAngle = verify({
      coords,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: goal,
      citedPremises: [ratioPrem],
    });
    expect(dropAngle.valid).toBe(false);
  });

  it("MIRROR similarity is accepted (orientation is not constrained)", () => {
    const M = (p: V): V => {
      const flipped: V = [p[0], -p[1]];
      return sim(flipped, 1.3, 15, [4, -6]);
    };
    const mcoords: Coords = { A, B, C, D: M(A), E: M(B), F: M(C) };
    expect(factHoldsL(ratioPrem, mcoords)).toBe(true);
    expect(factHoldsL(angB, mcoords)).toBe(true);
    expect(factHoldsL(goal, mcoords)).toBe(true);
    const r = verify({
      coords: mcoords,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: goal,
      citedPremises: [ratioPrem, angB],
    });
    expect(r).toEqual({ valid: true, rule: "algebraic length-chase" });
  });

  it("SOUNDNESS: a non-similar second triangle → no emit, step rejected", () => {
    const bad: Coords = { A, B, C, D: [8, 3], E: [16, 2], F: [10, 9] };
    expect(factHoldsL(goal, bad)).toBe(false);

    const out = sas_similarity.derive([angB], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
      citedRatios: [ratioPrem],
    });
    expect(out.some((f) => f.kind === "eqratio")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: goal,
      citedPremises: [ratioPrem, angB],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: proportional sides but a DIFFERENT included angle → no emit (included angle is required)", () => {
    // Build DEF so |ED|/|AB| = |EF|/|BC| = 1.5 (sides proportional) but the
    // included angle ∠DEF = 70° ≠ ∠ABC ≈ 38.66°  ⇒  NOT similar (SSA, not SAS).
    const k = 1.5;
    const E2: V = [20, 0];
    const D2: V = [E2[0] + k * dist(A, B), E2[1]];
    const phi = (70 * Math.PI) / 180;
    const F2: V = [
      E2[0] + k * dist(B, C) * Math.cos(phi),
      E2[1] + k * dist(B, C) * Math.sin(phi),
    ];
    const bad: Coords = { A, B, C, D: D2, E: E2, F: F2 };

    // sides ARE proportional ...
    expect(factHoldsL(ratioPrem, bad)).toBe(true);
    // ... but the included angle is NOT equal, so the triangles are not similar.
    expect(factHoldsL(angB, bad)).toBe(false);
    expect(factHoldsL(goal, bad)).toBe(false);

    // The rule sees the cited proportion but its angle guard rejects (SSA, not SAS).
    const out = sas_similarity.derive([angB], {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
      citedRatios: [ratioPrem],
    });
    expect(out.some((f) => f.kind === "eqratio")).toBe(false);

    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: [ratioPrem, angB],
      candidateFact: goal,
      citedPremises: [ratioPrem, angB],
    });
    expect(r.valid).toBe(false);
  });
});
