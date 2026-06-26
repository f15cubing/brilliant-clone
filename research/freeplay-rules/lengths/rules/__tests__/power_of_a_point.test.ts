import { describe, expect, it } from "vitest";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { dist, lineIntersect, type V } from "@/lib/freeplay/geom";
import { power_of_a_point } from "../power_of_a_point";
import { verifyL } from "../../verify";
import { eqratio, factHoldsL } from "../../dsl";
import { verifyWith, RULES } from "../../../harness";

/**
 * The power-of-a-point rule fires in BOTH standard configurations. We build a
 * generic (no symmetry) realization of each on a radius-5 circle centred at the
 * origin and check the rule one-step-derives the equal-product relation as a
 * ratio.
 */
const R = 5;
const O: V = [0, 0];
const deg = (d: number) => (d * Math.PI) / 180;
const onCircle = (d: number): V => [R * Math.cos(deg(d)), R * Math.sin(deg(d))];

// ---- config 1: intersecting chords (P INSIDE) -------------------------------
// Four points interleaved around the circle so chords AB and CD cross inside.
const A1 = onCircle(150);
const B1 = onCircle(20);
const C1 = onCircle(80);
const D1 = onCircle(-70);
const P1 = lineIntersect(A1, B1, C1, D1)!; // the chords meet here, inside

const chord: Coords = { A: A1, B: B1, C: C1, D: D1, P: P1 };
const ctxChord = { coords: chord, bindings: {}, points: Object.keys(chord) };

// ---- config 2: two secants from an EXTERNAL point (P OUTSIDE) ----------------
const P2: V = [11, 2]; // |P2| ≈ 11.18 > R, so P2 is outside the circle

/** The two intersections of the line through P at `angleDeg` with the circle. */
function secant(P: V, angleDeg: number): [V, V] {
  const d: V = [Math.cos(deg(angleDeg)), Math.sin(deg(angleDeg))];
  const b = 2 * (P[0] * d[0] + P[1] * d[1]);
  const c = P[0] * P[0] + P[1] * P[1] - R * R;
  const disc = b * b - 4 * c;
  const s = Math.sqrt(disc);
  const t1 = (-b - s) / 2; // nearer contact
  const t2 = (-b + s) / 2; // farther contact
  const at = (t: number): V => [P[0] + t * d[0], P[1] + t * d[1]];
  return [at(t1), at(t2)];
}

const [A2, B2] = secant(P2, 200); // secant P-A-B
const [C2, D2] = secant(P2, 178); // secant P-C-D
const secantCoords: Coords = { A: A2, B: B2, C: C2, D: D2, P: P2 };
const ctxSecant = { coords: secantCoords, bindings: {}, points: Object.keys(secantCoords) };

// ---- shared symbolic facts --------------------------------------------------
const cyc = rel("cyclic", ["A", "B", "C", "D"]);
const collAB = rel("coll", ["P", "A", "B"]);
const collCD = rel("coll", ["P", "C", "D"]);
const givens = [cyc, collAB, collCD];

// Target: PA/PC = PD/PB  (⇔ PA·PB = PC·PD).
const goal = eqratio("P", "A", "P", "C", "P", "D", "P", "B");
// Equivalent pairing the rule also emits.
const goalAlt = eqratio("P", "A", "P", "D", "P", "C", "P", "B");

describe("power of a point (research length rule)", () => {
  it("CHORDS config realizes the givens and the power ratio (P strictly inside)", () => {
    expect(dist(O, P1)).toBeLessThan(R); // P inside
    expect(factHoldsL(cyc, chord)).toBe(true);
    expect(factHoldsL(collAB, chord)).toBe(true);
    expect(factHoldsL(collCD, chord)).toBe(true);
    expect(factHoldsL(goal, chord)).toBe(true);
    // unsigned power equality PA·PB = PC·PD holds
    expect(dist(P1, A1) * dist(P1, B1)).toBeCloseTo(dist(P1, C1) * dist(P1, D1), 6);
    // generic figure: all four chord half-lengths distinct (no accidental symmetry)
    const ls = [dist(P1, A1), dist(P1, B1), dist(P1, C1), dist(P1, D1)];
    for (let i = 0; i < ls.length; i++)
      for (let j = i + 1; j < ls.length; j++)
        expect(Math.abs(ls[i] - ls[j])).toBeGreaterThan(1e-3);
  });

  it("SECANTS config realizes the givens and the power ratio (P strictly outside)", () => {
    expect(dist(O, P2)).toBeGreaterThan(R); // P outside
    expect(factHoldsL(cyc, secantCoords)).toBe(true);
    expect(factHoldsL(collAB, secantCoords)).toBe(true);
    expect(factHoldsL(collCD, secantCoords)).toBe(true);
    expect(factHoldsL(goal, secantCoords)).toBe(true);
    expect(dist(P2, A2) * dist(P2, B2)).toBeCloseTo(dist(P2, C2) * dist(P2, D2), 6);
  });

  it("derive emits the expected eqratio in the CHORDS config", () => {
    const out = power_of_a_point.derive(givens, ctxChord);
    expect(out.every((f) => f.kind === "eqratio")).toBe(true);
    expect(out.some((f) => factHoldsL(f, chord) && JSON.stringify(f) === JSON.stringify(goal))).toBe(true);
    expect(out.some((f) => JSON.stringify(f) === JSON.stringify(goalAlt))).toBe(true);
  });

  it("derive emits the expected eqratio in the SECANTS config", () => {
    const out = power_of_a_point.derive(givens, ctxSecant);
    expect(out.some((f) => JSON.stringify(f) === JSON.stringify(goal))).toBe(true);
    expect(out.every((f) => factHoldsL(f, secantCoords))).toBe(true);
  });

  it("verifies PA/PC = PD/PB in ONE step (CHORDS) citing cyclic + both collinearities", () => {
    const r = verifyL([power_of_a_point], {
      coords: chord,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "power of a point" });
  });

  it("verifies PA/PC = PD/PB in ONE step (SECANTS) citing cyclic + both collinearities", () => {
    const r = verifyL([power_of_a_point], {
      coords: secantCoords,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r).toEqual({ valid: true, rule: "power of a point" });
  });

  it("MINIMALITY: dropping cyclic or either collinearity → not valid", () => {
    const drop = (cited: Fact[]) =>
      verifyL([power_of_a_point], {
        coords: chord,
        bindings: {},
        establishedFacts: givens,
        candidateFact: goal,
        citedPremises: cited,
      });
    expect(drop([collAB, collCD]).valid).toBe(false); // no cyclic
    expect(drop([cyc, collCD]).valid).toBe(false); // no coll(P,A,B)
    expect(drop([cyc, collAB]).valid).toBe(false); // no coll(P,C,D)
  });

  it("SOUNDNESS: four points NOT concyclic → no emit, step rejected", () => {
    // Slide D outward along line CD (still collinear with P and C) so it leaves
    // the circle: the quadruple is no longer concyclic.
    const Dbad: V = [P1[0] + 1.4 * (D1[0] - P1[0]), P1[1] + 1.4 * (D1[1] - P1[1])];
    const bad: Coords = { A: A1, B: B1, C: C1, D: Dbad, P: P1 };
    expect(factHoldsL(cyc, bad)).toBe(false); // not concyclic
    expect(factHoldsL(collCD, bad)).toBe(true); // P,C,D still collinear
    expect(factHoldsL(goal, bad)).toBe(false); // power ratio is false

    const out = power_of_a_point.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.length).toBe(0);

    const r = verifyL([power_of_a_point], {
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: P not actually on a chord → no emit, step rejected", () => {
    // Move P off the two chords (keep the four concyclic points). The cited
    // collinearities are now FALSE, and the rule's on-line guard stays silent.
    const Pbad: V = [P1[0] + 0.6, P1[1] + 0.8];
    const bad: Coords = { A: A1, B: B1, C: C1, D: D1, P: Pbad };
    expect(factHoldsL(cyc, bad)).toBe(true); // still concyclic
    expect(factHoldsL(collAB, bad)).toBe(false); // P no longer on AB

    const out = power_of_a_point.derive(givens, {
      coords: bad,
      bindings: {},
      points: Object.keys(bad),
    });
    expect(out.length).toBe(0);

    const r = verifyL([power_of_a_point], {
      coords: bad,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });

  it("GAP: the shipped engine (RULES) cannot validate the power ratio", () => {
    // `eqratio` is not in the shipped DSL and AR is angles-only, so the shipped
    // verifier cannot establish this ratio from cyclic + the two collinearities.
    const r = verifyWith(RULES, {
      coords: chord,
      bindings: {},
      establishedFacts: givens,
      candidateFact: goal as unknown as Fact,
      citedPremises: givens,
    });
    expect(r.valid).toBe(false);
  });
});
