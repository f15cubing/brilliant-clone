import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { dist, lineIntersect, type V } from "@/lib/freeplay/geom";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { imo_shortlist_2024_g5 as g5 } from "@/lib/freeplay/puzzles/imo_shortlist_2024_g5";
import { converse_power_of_a_point } from "../converse_power_of_a_point";
import { researchVerifyL, verifyL } from "../../verify";
import { eqratio, factHoldsL } from "../../dsl";

/**
 * Converse power of a point: lines AP and YZ meet at K with KA·KP = KY·KZ and K
 * in the SAME position relative to both pairs (chords inside, or secants
 * outside) ⇒ A,Y,P,Z concyclic. We build a generic realization of each
 * configuration, plus the MIXED counter-model the sign guard must reject.
 *
 * The equal-power premise is an `eqratio` read from `ctx.citedRatios`, exactly
 * as the shipped verifier supplies it — never reconstructed from coordinates.
 */
const R = 5;
const O: V = [0, 0];
const deg = (d: number) => (d * Math.PI) / 180;
const onCircle = (d: number): V => [R * Math.cos(deg(d)), R * Math.sin(deg(d))];

// ---- Figure A: intersecting chords, K strictly INSIDE -----------------------
// Four interleaved points (order around the circle: A,Y,P,Z) so chords AP and
// YZ cross at an interior K.
const A = onCircle(150);
const P = onCircle(20);
const Y = onCircle(80);
const Z = onCircle(-70);
const K = lineIntersect(A, P, Y, Z)!;
const chord: Coords = { A, P, Y, Z, K };
const ctxChord = { coords: chord, bindings: {}, points: Object.keys(chord) };

// ---- Figure B: two secants from an EXTERNAL K (positive control) ------------
const Ksec: V = [11, 2]; // |K| ≈ 11.18 > R, external

function secant(Pt: V, angleDeg: number): [V, V] {
  const d: V = [Math.cos(deg(angleDeg)), Math.sin(deg(angleDeg))];
  const b = 2 * (Pt[0] * d[0] + Pt[1] * d[1]);
  const c = Pt[0] * Pt[0] + Pt[1] * Pt[1] - R * R;
  const s = Math.sqrt(b * b - 4 * c);
  const at = (t: number): V => [Pt[0] + t * d[0], Pt[1] + t * d[1]];
  return [at((-b - s) / 2), at((-b + s) / 2)];
}
const [As, Ps] = secant(Ksec, 200); // secant K-A-P
const [Ys, Zs] = secant(Ksec, 178); // secant K-Y-Z
const secantCoords: Coords = { A: As, P: Ps, Y: Ys, Z: Zs, K: Ksec };
const ctxSecant = { coords: secantCoords, bindings: {}, points: Object.keys(secantCoords) };

// ---- Figure C: MIXED config (K between A,P but outside Y,Z) — NOT concyclic --
// Equal UNSIGNED products (KA·KP = KY·KZ = 8) with a non-trivial ratio (1.25),
// but opposite SIGNED powers ⇒ the four points are not concyclic.
const Kmix: V = [0, 0];
const dirM: V = [Math.cos(deg(50)), Math.sin(deg(50))];
const mixed: Coords = {
  A: [-2, 0],
  P: [4, 0], // chord, K between, product 8
  Y: [1.6 * dirM[0], 1.6 * dirM[1]],
  Z: [5 * dirM[0], 5 * dirM[1]], // secant ray, K outside, product 8
  K: Kmix,
};
const ctxMixed = { coords: mixed, bindings: {}, points: Object.keys(mixed) };

// ---- shared symbolic facts (same labels in every figure) --------------------
const ratio = eqratio("K", "A", "K", "Y", "K", "Z", "K", "P"); // KA·KP = KY·KZ
const collKAP = rel("coll", ["K", "A", "P"]);
const collKYZ = rel("coll", ["K", "Y", "Z"]);
const cyc = rel("cyclic", ["A", "Y", "P", "Z"]);
const cols = [collKAP, collKYZ];
const givens = [ratio, collKAP, collKYZ];

describe("converse power of a point (research length rule)", () => {
  it("Figure A is a faithful generic intersecting-chords realization", () => {
    expect(dist(O, K)).toBeLessThan(R); // K strictly inside
    expect(factHoldsL(ratio, chord)).toBe(true); // KA·KP = KY·KZ
    expect(factHoldsL(collKAP, chord)).toBe(true);
    expect(factHoldsL(collKYZ, chord)).toBe(true);
    expect(factHoldsL(cyc, chord)).toBe(true); // the conclusion is true
    // the four half-lengths from K are all distinct (no accidental symmetry)
    const ls = [dist(K, A), dist(K, P), dist(K, Y), dist(K, Z)];
    for (let i = 0; i < ls.length; i++)
      for (let j = i + 1; j < ls.length; j++)
        expect(Math.abs(ls[i] - ls[j])).toBeGreaterThan(1e-3);
  });

  it("FIRES IN ISOLATION (chords): derive emits cyclic(A,Y,P,Z) when the ratio is cited", () => {
    const out = converse_power_of_a_point.derive(cols, { ...ctxChord, citedRatios: [ratio] });
    expect(out.length).toBe(1);
    expect(out[0]).toEqual(cyc);
    expect(factHoldsL(out[0], chord)).toBe(true);
  });

  it("FIRES IN ISOLATION (chords): verifies in ONE step under the rule name", () => {
    const r = verifyL([converse_power_of_a_point], {
      coords: chord,
      bindings: {},
      establishedFacts: givens,
      candidateFact: cyc,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "converse power of a point" });
  });

  it("MINIMALITY (derive): dropping the cited ratio ⇒ no emit", () => {
    // The equal-power premise is load-bearing and read ONLY from ctx.citedRatios.
    const out = converse_power_of_a_point.derive(cols, { ...ctxChord, citedRatios: [] });
    expect(out.length).toBe(0);
  });

  it("MINIMALITY (derive): dropping either collinearity ⇒ no emit", () => {
    const dropAP = converse_power_of_a_point.derive([collKYZ], {
      ...ctxChord,
      citedRatios: [ratio],
    });
    expect(dropAP.length).toBe(0);
    const dropYZ = converse_power_of_a_point.derive([collKAP], {
      ...ctxChord,
      citedRatios: [ratio],
    });
    expect(dropYZ.length).toBe(0);
  });

  it("MINIMALITY (verify): dropping the ratio or either collinearity ⇒ not valid", () => {
    const drop = (cited: Fact[]) =>
      verifyL([converse_power_of_a_point], {
        coords: chord,
        bindings: {},
        establishedFacts: givens,
        candidateFact: cyc,
        citedPremises: cited,
      });
    expect(drop([collKAP, collKYZ]).valid).toBe(false); // no ratio
    expect(drop([ratio, collKYZ]).valid).toBe(false); // no coll(K,A,P)
    expect(drop([ratio, collKAP]).valid).toBe(false); // no coll(K,Y,Z)
  });

  it("SOUNDNESS-NEGATIVE (mixed config): equal unsigned products but NOT concyclic ⇒ no emit", () => {
    // The sign guard's reason to exist: K between A,P but outside Y,Z.
    expect(factHoldsL(ratio, mixed)).toBe(true); // KA·KP = KY·KZ (unsigned)
    expect(factHoldsL(collKAP, mixed)).toBe(true);
    expect(factHoldsL(collKYZ, mixed)).toBe(true);
    expect(factHoldsL(cyc, mixed)).toBe(false); // … but the four are NOT concyclic

    const out = converse_power_of_a_point.derive(cols, { ...ctxMixed, citedRatios: [ratio] });
    expect(out.length).toBe(0); // sign guard rejects it even with the ratio cited

    const r = verifyL([converse_power_of_a_point], {
      coords: mixed,
      bindings: {},
      establishedFacts: givens,
      candidateFact: cyc,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("POSITIVE CONTROL (secants config): the rule also fires from an external K", () => {
    expect(dist(O, Ksec)).toBeGreaterThan(R); // K strictly outside
    expect(factHoldsL(ratio, secantCoords)).toBe(true);
    expect(factHoldsL(cyc, secantCoords)).toBe(true);

    const out = converse_power_of_a_point.derive(cols, { ...ctxSecant, citedRatios: [ratio] });
    expect(out.length).toBe(1);
    expect(out[0]).toEqual(cyc);

    const r = verifyL([converse_power_of_a_point], {
      coords: secantCoords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: cyc,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "converse power of a point" });
  });

  it("GAP: the shipped + research engines (without this rule) cannot reach cyclic(A,Y,P,Z)", () => {
    // No registered rule maps an eqratio to a cyclic, and AR is angles-only, so
    // even citing the equal-power ratio and both lines the concyclicity is
    // `unjustified` until this rule is added.
    const r = researchVerifyL({
      coords: chord,
      bindings: {},
      establishedFacts: givens,
      candidateFact: cyc,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  // ---- G5 closure: the rule closes the real puzzle's first gap --------------
  // On the shipped IMO 2024 SL G5 figure, the established power-of-a-point chain
  // gives powerYZ = eqratio(K,A,K,Y,K,Z,K,P) (KA·KP = KY·KZ). Citing it with the
  // two lines coll(A,K,P), coll(Y,K,Z), the rule derives cyclic(A,Y,P,Z) — "P on
  // circle AYZ" — across every realization.
  describe("G5 closure (converse-PoP gap)", () => {
    const realizations = sampleRealizations(g5, 6, 0xc0ffee);
    const powerYZ = eqratio("K", "A", "K", "Y", "K", "Z", "K", "P");
    const collAKP = rel("coll", ["A", "K", "P"]);
    const collYKZ = rel("coll", ["Y", "K", "Z"]);
    const cycAYPZ = rel("cyclic", ["A", "Y", "P", "Z"]);
    const cited = [powerYZ, collAKP, collYKZ];

    it("produces multiple independent realizations", () => {
      expect(realizations.length).toBeGreaterThan(1);
    });

    it("derives cyclic(A,Y,P,Z) in ONE step in every realization", () => {
      for (const rz of realizations) {
        expect(factHoldsL(powerYZ, rz.coords, rz.bindings ?? {})).toBe(true);
        expect(factHoldsL(cycAYPZ, rz.coords, rz.bindings ?? {})).toBe(true);
        const r = verifyL([converse_power_of_a_point], {
          coords: rz.coords,
          bindings: rz.bindings ?? {},
          establishedFacts: cited,
          candidateFact: cycAYPZ,
          citedPremises: cited,
        });
        expect(r).toEqual({ valid: true, rule: "converse power of a point" });
      }
    });

    it("the shipped + research engines (without this rule) still cannot, even on G5", () => {
      const rz = realizations[0];
      const r = researchVerifyL({
        coords: rz.coords,
        bindings: rz.bindings ?? {},
        establishedFacts: cited,
        candidateFact: cycAYPZ,
        citedPremises: cited,
      });
      expect(r.valid).toBe(false);
    });
  });
});
