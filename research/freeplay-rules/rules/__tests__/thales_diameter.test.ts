import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { factHolds } from "@/lib/freeplay/check";
import { angleDeg, dist, type V } from "@/lib/freeplay/geom";
import { thales_diameter } from "../thales_diameter";
import { verifyWith, researchVerify, RULES } from "../../harness";

/**
 * Generic semicircle: circle of radius 5 centred at O, BC a diameter, A a third
 * point of the circle (NOT symmetric — ∠ chosen at 1.1 rad). Rotated by 0.4 rad
 * so nothing is axis-aligned. Then ∠BAC = 90°.
 */
const TH = 0.4;
const rot = (p: V): V => [
  p[0] * Math.cos(TH) - p[1] * Math.sin(TH),
  p[0] * Math.sin(TH) + p[1] * Math.cos(TH),
];
const O = rot([0, 0]);
const B = rot([-5, 0]);
const C = rot([5, 0]);
const A = rot([5 * Math.cos(1.1), 5 * Math.sin(1.1)]);

const coords: Coords = { O, A, B, C };
const ctx = { coords, bindings: {}, points: Object.keys(coords) };

const diam = rel("midp", ["O", "B", "C"]); // BC is a diameter (O its midpoint)
const onCirc = rel("cong", ["O", "A", "O", "B"]); // A on the circle
const givens: Fact[] = [diam, onCirc];
const goal = rel("perp", ["A", "B", "A", "C"]); // ∠BAC = 90°

describe("Thales: diameter subtends a right angle (research rule)", () => {
  it("realizes the givens and the right angle", () => {
    expect(factHolds(diam, coords)).toBe(true);
    expect(factHolds(onCirc, coords)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
    expect(angleDeg(B, A, C)).toBeCloseTo(90, 6);
    // generic: triangle is scalene (A not the apex of an isosceles right triangle)
    expect(Math.abs(dist(A, B) - dist(A, C))).toBeGreaterThan(1e-2);
  });

  it("derive emits perp(A,B,A,C)", () => {
    const out = thales_diameter.derive(givens, ctx);
    expect(out.some((f) => JSON.stringify(f) === JSON.stringify(goal))).toBe(true);
  });

  it("verifies the right angle in ONE step citing the diameter + on-circle facts", () => {
    const r = verifyWith([thales_diameter], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "Thales (diameter subtends a right angle)" });
  });

  it("MINIMALITY: dropping the diameter (midp) → not valid (perp still true in coords)", () => {
    // Critical soundness proof: even though ∠BAC = 90° numerically, with only the
    // on-circle cong cited the rule must NOT emit — it never reads the angle off
    // the figure in place of the missing diameter premise.
    expect(factHolds(goal, coords)).toBe(true);
    const r = verifyWith([thales_diameter], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: [onCirc],
    });
    expect(r.valid).toBe(false);
  });

  it("MINIMALITY: dropping the on-circle cong → not valid (perp still true in coords)", () => {
    const r = verifyWith([thales_diameter], {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: [diam],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: BC not a diameter (O not its midpoint) → no emit, step rejected", () => {
    // Slide C so O is no longer the midpoint of BC: BC is a chord, not a diameter,
    // and ∠BAC ≠ 90°. The cited midp is now numerically false; the rule is silent.
    const Cbad: V = rot([2.5, 0]);
    const bad: Coords = { O, A, B, C: Cbad };
    expect(factHolds(diam, bad)).toBe(false); // O not midpoint of B,Cbad
    expect(Math.abs(angleDeg(B, A, Cbad) - 90)).toBeGreaterThan(1); // not a right angle
    const out = thales_diameter.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.length).toBe(0);
    const r = verifyWith([thales_diameter], {
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: A not on the circle (cong false) → no emit, step rejected", () => {
    // Pull A off the circle along OA: |OA| ≠ |OB|, ∠BAC ≠ 90°.
    const Abad: V = [O[0] + 1.3 * (A[0] - O[0]), O[1] + 1.3 * (A[1] - O[1])];
    const bad: Coords = { O, A: Abad, B, C };
    expect(factHolds(onCirc, bad)).toBe(false);
    expect(Math.abs(angleDeg(B, Abad, C) - 90)).toBeGreaterThan(1);
    const out = thales_diameter.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.length).toBe(0);
    const r = verifyWith([thales_diameter], {
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("PROMOTED: the shipped engine alone now derives the right angle", () => {
    // This rule has been promoted into the shipped engine (PROMOTED_RULES), so
    // the gap it closed is now closed end-to-end: `verifyWith(RULES, …)` (which
    // imports the shipped RULES) derives ∠BAC = 90° directly. (Before promotion
    // this asserted neither the shipped engine nor the research rules could.)
    const shipped = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(shipped).toEqual({
      valid: true,
      rule: "Thales (diameter subtends a right angle)",
    });
    const research = researchVerify({
      coords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(research.valid).toBe(true);
  });
});
