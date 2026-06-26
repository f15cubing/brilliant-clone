import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { dist, type V } from "@/lib/freeplay/geom";
import { tangent_secant_power } from "../lengths/rules/tangent_secant_power";
import { eqratio, factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules/lengths — the tangent–secant power of a
 * point. From an external point M whose segment MA is tangent to a circle
 * (centre O) at A, and a secant M-B-R of that circle, MA² = MB·MR. Emitted as a
 * ratio so it lands in the shipped length subsystem; exercised end-to-end via
 * the shipped `verify()` (which composes the RATIO_RULES at the verify layer).
 *
 * Generic tangent–secant realization on a radius-5 circle centred at O.
 *   O=(0,0), A=(3,4) on the circle; tangent at A ⟂ OA; M=(-5,10) on that tangent
 *   (MA=10); the secant through M meets the circle at B=(5,0) and R=(0,5), with
 *   M,B,R collinear. Then MA²=100=MB·MR (MB=√200, MR=√50). We rotate the whole
 *   figure by 0.3 rad so no point is axis-aligned (avoids accidental symmetry).
 */
const TH = 0.3;
const rot = (p: V): V => [
  p[0] * Math.cos(TH) - p[1] * Math.sin(TH),
  p[0] * Math.sin(TH) + p[1] * Math.cos(TH),
];
const O = rot([0, 0]);
const A = rot([3, 4]);
const M = rot([-5, 10]);
const B = rot([5, 0]);
const R = rot([0, 5]);

const coords: Coords = { O, A, M, B, R };

const congB = rel("cong", ["O", "A", "O", "B"]); // B on circle
const congR = rel("cong", ["O", "A", "O", "R"]); // R on circle
const tangent = rel("perp", ["O", "A", "A", "M"]); // MA tangent at A
const secant = rel("coll", ["M", "B", "R"]); // secant M-B-R
const givens: Fact[] = [congB, congR, tangent, secant];

const ctx = { coords, bindings: {}, points: Object.keys(coords) };

// Target: MA/MB = MR/MA  (⇔ MA² = MB·MR). The equivalent pairing MA/MR = MB/MA
// is the SAME fact up to the proportion's symmetries (so the rule emits one).
const goal = eqratio("M", "A", "M", "B", "M", "R", "M", "A");
const goalAlt = eqratio("M", "A", "M", "R", "M", "B", "M", "A");

describe("tangent-secant power (promoted length rule)", () => {
  it("realizes the givens and the tangent-secant power ratio", () => {
    expect(factHoldsL(congB, coords)).toBe(true);
    expect(factHoldsL(congR, coords)).toBe(true);
    expect(factHoldsL(tangent, coords)).toBe(true);
    expect(factHoldsL(secant, coords)).toBe(true);
    expect(factHoldsL(goal, coords)).toBe(true);
    // MA² = MB·MR numerically
    const ma = dist(M, A);
    expect(ma * ma).toBeCloseTo(dist(M, B) * dist(M, R), 6);
    // generic: the three segments from M are pairwise distinct
    const ls = [dist(M, A), dist(M, B), dist(M, R)];
    for (let i = 0; i < ls.length; i++)
      for (let j = i + 1; j < ls.length; j++)
        expect(Math.abs(ls[i] - ls[j])).toBeGreaterThan(1e-3);
  });

  it("derive emits the power ratio (one canonical fact)", () => {
    const out = tangent_secant_power.derive(givens, ctx);
    expect(out.length).toBeGreaterThanOrEqual(1);
    expect(out.every((f) => f.kind === "eqratio")).toBe(true);
    expect(out.every((f) => factHoldsL(f, coords))).toBe(true);
    expect(out.some((f) => JSON.stringify(f) === JSON.stringify(goal))).toBe(true);
  });

  it("verifies MA/MB = MR/MA in ONE step citing both congs, the tangent perp, and the secant", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "tangent-secant power" });
  });

  it("the equivalent pairing MA/MR = MB/MA verifies too (same fact up to symmetry)", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goalAlt,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "tangent-secant power" });
  });

  it("MINIMALITY: dropping ANY of the four premises → not valid", () => {
    const drop = (cited: Fact[]) =>
      verify({
        coords,
        bindings: {},
        establishedFacts: givens,
        candidateFact: goal,
        citedPremises: cited,
      });
    expect(drop([congR, tangent, secant]).valid).toBe(false); // no cong(O,A,O,B)
    expect(drop([congB, tangent, secant]).valid).toBe(false); // no cong(O,A,O,R)
    expect(drop([congB, congR, secant]).valid).toBe(false); // no tangent perp
    expect(drop([congB, congR, tangent]).valid).toBe(false); // no secant coll
  });

  it("SOUNDNESS: M not on the tangent (perp false) → no emit, step rejected", () => {
    // Slide M off the tangent line at A (keep everything else). Now OA is NOT ⟂ AM
    // and the power identity fails, so the rule must stay silent.
    const Mbad: V = [M[0] + 1.5, M[1] - 0.7];
    const bad: Coords = { O, A, M: Mbad, B, R };
    expect(factHoldsL(tangent, bad)).toBe(false); // not tangent anymore
    const out = tangent_secant_power.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.length).toBe(0);
    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: a secant endpoint OFF the circle (cong false) → no emit, step rejected", () => {
    // Push R outward along the secant so it leaves the circle: B,R no longer
    // both on the circle, MA² ≠ MB·MR.
    const Rbad: V = [M[0] + 1.6 * (R[0] - M[0]), M[1] + 1.6 * (R[1] - M[1])];
    const bad: Coords = { O, A, M, B, R: Rbad };
    expect(factHoldsL(congR, bad)).toBe(false); // R off circle
    expect(factHoldsL(secant, bad)).toBe(true); // still collinear with M,B
    expect(factHoldsL(goal, bad)).toBe(false); // power ratio false
    const out = tangent_secant_power.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.length).toBe(0);
    const r = verify({
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });
});
