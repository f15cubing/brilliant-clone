import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { dist, lineIntersect, type V } from "@/lib/freeplay/geom";
import { converse_power_of_a_point } from "../lengths/rules/converse_power_of_a_point";
import { RATIO_RULES } from "../lengths/rules";
import { verify } from "../verify";
import { eqratio, factHoldsL, type LFact } from "../lengths/dsl";

/**
 * Converse power of a point (promoted length rule).
 *
 * The rule's LOGIC is exercised directly via `derive` (these tests are green
 * regardless of registration). The end-to-end `verify` integration goes green
 * once the orchestrator appends `converse_power_of_a_point` to the length
 * `RATIO_RULES` registry (`lengths/rules/index.ts`) — until then the shipped
 * `verify()` does not know the rule, so the integration test is expected to be
 * red. (We do NOT edit the registry here.)
 */
const R = 5;
const O: V = [0, 0];
const deg = (d: number) => (d * Math.PI) / 180;
const onCircle = (d: number): V => [R * Math.cos(deg(d)), R * Math.sin(deg(d))];

// Figure A — intersecting chords, K strictly INSIDE (the G5 configuration).
const A = onCircle(150);
const P = onCircle(20);
const Y = onCircle(80);
const Z = onCircle(-70);
const K = lineIntersect(A, P, Y, Z)!;
const chord: Coords = { A, P, Y, Z, K };
const ctxChord = { coords: chord, bindings: {}, points: Object.keys(chord) };

// Figure B — two secants from an EXTERNAL K (positive control).
const Ksec: V = [11, 2];
function secant(Pt: V, angleDeg: number): [V, V] {
  const d: V = [Math.cos(deg(angleDeg)), Math.sin(deg(angleDeg))];
  const b = 2 * (Pt[0] * d[0] + Pt[1] * d[1]);
  const c = Pt[0] * Pt[0] + Pt[1] * Pt[1] - R * R;
  const s = Math.sqrt(b * b - 4 * c);
  const at = (t: number): V => [Pt[0] + t * d[0], Pt[1] + t * d[1]];
  return [at((-b - s) / 2), at((-b + s) / 2)];
}
const [As, Ps] = secant(Ksec, 200);
const [Ys, Zs] = secant(Ksec, 178);
const secantCoords: Coords = { A: As, P: Ps, Y: Ys, Z: Zs, K: Ksec };
const ctxSecant = { coords: secantCoords, bindings: {}, points: Object.keys(secantCoords) };

// Figure C — MIXED config: K between A,P but outside Y,Z. Equal UNSIGNED
// products (8 = 8, ratio 1.25) but opposite SIGNED powers ⇒ NOT concyclic.
const dirM: V = [Math.cos(deg(50)), Math.sin(deg(50))];
const mixed: Coords = {
  A: [-2, 0],
  P: [4, 0],
  Y: [1.6 * dirM[0], 1.6 * dirM[1]],
  Z: [5 * dirM[0], 5 * dirM[1]],
  K: [0, 0],
};
const ctxMixed = { coords: mixed, bindings: {}, points: Object.keys(mixed) };

const ratio = eqratio("K", "A", "K", "Y", "K", "Z", "K", "P"); // KA·KP = KY·KZ
const collKAP = rel("coll", ["K", "A", "P"]);
const collKYZ = rel("coll", ["K", "Y", "Z"]);
const cyc = rel("cyclic", ["A", "Y", "P", "Z"]);
const cols = [collKAP, collKYZ];
const givens = [ratio, collKAP, collKYZ];

describe("converse power of a point (length rule logic)", () => {
  it("Figure A is a faithful generic intersecting-chords realization", () => {
    expect(dist(O, K)).toBeLessThan(R);
    expect(factHoldsL(ratio, chord)).toBe(true);
    expect(factHoldsL(collKAP, chord)).toBe(true);
    expect(factHoldsL(collKYZ, chord)).toBe(true);
    expect(factHoldsL(cyc, chord)).toBe(true);
    const ls = [dist(K, A), dist(K, P), dist(K, Y), dist(K, Z)];
    for (let i = 0; i < ls.length; i++)
      for (let j = i + 1; j < ls.length; j++)
        expect(Math.abs(ls[i] - ls[j])).toBeGreaterThan(1e-3);
  });

  it("FIRES IN ISOLATION (chords): derive emits cyclic(A,Y,P,Z) when the ratio is cited", () => {
    const out = converse_power_of_a_point.derive(cols, { ...ctxChord, citedRatios: [ratio] });
    expect(out.length).toBe(1);
    expect(out[0]).toEqual(cyc);
  });

  it("POSITIVE CONTROL (secants): derive also fires from an external K", () => {
    expect(dist(O, Ksec)).toBeGreaterThan(R);
    const out = converse_power_of_a_point.derive(cols, { ...ctxSecant, citedRatios: [ratio] });
    expect(out.length).toBe(1);
    expect(out[0]).toEqual(cyc);
  });

  it("MINIMALITY: dropping the cited ratio ⇒ no emit", () => {
    const out = converse_power_of_a_point.derive(cols, { ...ctxChord, citedRatios: [] });
    expect(out.length).toBe(0);
  });

  it("MINIMALITY: dropping either collinearity ⇒ no emit", () => {
    expect(
      converse_power_of_a_point.derive([collKYZ], { ...ctxChord, citedRatios: [ratio] }).length,
    ).toBe(0);
    expect(
      converse_power_of_a_point.derive([collKAP], { ...ctxChord, citedRatios: [ratio] }).length,
    ).toBe(0);
  });

  it("SOUNDNESS-NEGATIVE (mixed config): equal unsigned products but NOT concyclic ⇒ no emit", () => {
    expect(factHoldsL(ratio, mixed)).toBe(true);
    expect(factHoldsL(cyc, mixed)).toBe(false);
    const out = converse_power_of_a_point.derive(cols, { ...ctxMixed, citedRatios: [ratio] });
    expect(out.length).toBe(0);
  });
});

describe("converse power of a point (verify integration — needs RATIO_RULES registration)", () => {
  const registered = RATIO_RULES.some((r) => r.id === converse_power_of_a_point.id);

  it(`is${registered ? "" : " NOT yet"} registered in RATIO_RULES`, () => {
    // Documents the orchestrator step. Once the rule is appended to
    // lengths/rules/index.ts, this flips to true and the verify test below passes.
    expect(typeof registered).toBe("boolean");
  });

  it("verifies cyclic(A,Y,P,Z) in ONE step as 'converse power of a point' (after registration)", () => {
    const r = verify({
      coords: chord,
      bindings: {},
      establishedFacts: givens,
      candidateFact: cyc,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "converse power of a point" });
  });

  it("MINIMALITY via verify: dropping the ratio or a collinearity ⇒ not valid (after registration)", () => {
    const drop = (cited: LFact[]) =>
      verify({
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
});
