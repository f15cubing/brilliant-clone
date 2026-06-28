import { describe, expect, it } from "vitest";
import { canonicalKey, rel, type Fact } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import {
  circumcenter,
  dist,
  lerp,
  lineIntersect,
  rotate,
  sub,
  type V,
} from "@/lib/freeplay/geom";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2024_g4 as puzzle } from "@/lib/freeplay/puzzles/imo_shortlist_2024_g4";
import { two_circle_radical_axis } from "../rules/two_circle_radical_axis";

/**
 * Two-circle radical axis (promoted from research/freeplay-rules) — closes IMO
 * 2024 Shortlist G4.
 *
 * NOTE: the end-to-end `verify()` assertions only pass once the orchestrator has
 * registered this rule in `src/lib/freeplay/rules/index.ts` (`PROMOTED_RULES`).
 * The `derive`-level checks (isolation, soundness, minimality) and the granted
 * angle-chase finish are registration-independent and pass immediately.
 */

const coords = puzzle.coords as Coords;

const cycABCX = rel("cyclic", ["A", "B", "C", "X"]);
const cycABDY = rel("cyclic", ["A", "B", "D", "Y"]);
const congPCPX = rel("cong", ["P", "C", "P", "X"]);
const congPDPY = rel("cong", ["P", "D", "P", "Y"]);
const paraABCD = rel("para", ["A", "B", "C", "D"]);
const collAXQ = rel("coll", ["A", "X", "Q"]);
const collBYQ = rel("coll", ["B", "Y", "Q"]);
const collBCP = rel("coll", ["B", "C", "P"]);

const premises: Fact[] = [
  cycABCX,
  cycABDY,
  congPCPX,
  congPDPY,
  paraABCD,
  collAXQ,
  collBYQ,
];

const goalCyc = rel("cyclic", ["P", "C", "X", "Q"]);
const goalCyc2 = rel("cyclic", ["P", "D", "Y", "Q"]);
const goalPara = rel("para", ["P", "Q", "A", "B"]);

const ctxOf = (c: Coords) => ({ coords: c, bindings: {}, points: Object.keys(c) });
const hasFact = (facts: Fact[], f: Fact) =>
  facts.some((g) => canonicalKey(g) === canonicalKey(f));

// ---- a builder that can BREAK the AB ∥ CD hypothesis (two placement ratios) --
const norm = (p: V): number => Math.hypot(p[0], p[1]);
function circleCircle(c1: V, r1: number, c2: V, r2: number): V[] {
  const d = dist(c1, c2);
  if (d < 1e-12 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const dir: V = [(c2[0] - c1[0]) / d, (c2[1] - c1[1]) / d];
  const mid: V = [c1[0] + dir[0] * a, c1[1] + dir[1] * a];
  const perp: V = [-dir[1], dir[0]];
  return [
    [mid[0] + perp[0] * h, mid[1] + perp[1] * h],
    [mid[0] - perp[0] * h, mid[1] - perp[1] * h],
  ];
}
const otherThan = (cands: V[], avoid: V): V | null =>
  cands.filter((p) => dist(p, avoid) > 1e-6)[0] ?? null;
function buildG4two(P: V, D: V, C: V, tA: number, tB: number): Coords {
  const A = lerp(P, D, tA);
  const B = lerp(P, C, tB);
  const OC = circumcenter(A, B, C)!;
  const X = otherThan(circleCircle(OC, norm(sub(A, OC)), P, norm(sub(P, C))), C)!;
  const OD = circumcenter(A, B, D)!;
  const Y = otherThan(circleCircle(OD, norm(sub(A, OD)), P, norm(sub(P, D))), D)!;
  const Q = lineIntersect(A, X, B, Y)!;
  return { P, A, B, C, D, X, Y, Q };
}

describe("two-circle radical axis (promoted rule)", () => {
  it("GIVENS: every premise and the conclusion are realized in the canonical figure", () => {
    for (const f of premises) expect(factHolds(f, coords), canonicalKey(f)).toBe(true);
    expect(factHolds(goalCyc, coords)).toBe(true);
    expect(factHolds(goalCyc2, coords)).toBe(true);
    expect(factHolds(goalPara, coords)).toBe(true);
    expect(factHolds(rel("cyclic", ["P", "D", "X", "Q"]), coords)).toBe(false); // decoy
  });

  it("DERIVE: emits cyclic(P,C,X,Q) AND the symmetric cyclic(P,D,Y,Q)", () => {
    const out = two_circle_radical_axis.derive(premises, ctxOf(coords));
    expect(hasFact(out, goalCyc)).toBe(true);
    expect(hasFact(out, goalCyc2)).toBe(true);
  });

  it("MINIMALITY (derive): dropping any of the 2 cyclic / 2 cong / para premises ⇒ not emitted", () => {
    for (const drop of [cycABCX, cycABDY, congPCPX, congPDPY, paraABCD]) {
      const cited = premises.filter((f) => f !== drop);
      const out = two_circle_radical_axis.derive(cited, ctxOf(coords));
      expect(hasFact(out, goalCyc), `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("MINIMALITY (derive): dropping either defining coll (A,X,Q)/(B,Y,Q) ⇒ not emitted", () => {
    for (const drop of [collAXQ, collBYQ]) {
      const cited = premises.filter((f) => f !== drop);
      const out = two_circle_radical_axis.derive(cited, ctxOf(coords));
      expect(hasFact(out, goalCyc), `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("SOUNDNESS A: X' on Γ₁ with PC ≠ PX' ⇒ cyclic(P,C,X',Q') false and never emitted", () => {
    const { A, B, C, Y } = coords as Record<string, V>;
    const OC = circumcenter(A, B, C)!;
    const Xbad = rotate(C, OC, 37);
    const Qbad = lineIntersect(A, Xbad, B, Y)!;
    const bad: Coords = { ...coords, X: Xbad, Q: Qbad };
    expect(factHolds(cycABCX, bad)).toBe(true);
    expect(factHolds(congPCPX, bad)).toBe(false);
    expect(factHolds(goalCyc, bad)).toBe(false);
    const out = two_circle_radical_axis.derive(premises, ctxOf(bad));
    expect(hasFact(out, goalCyc)).toBe(false);
    for (const f of out) expect(factHolds(f, bad), canonicalKey(f)).toBe(true);
  });

  it("SOUNDNESS B: breaking AB ∥ CD ⇒ cyclic(P,C,X,Q) false and never emitted", () => {
    const bad = buildG4two([0, 0], [-3, -6], [6, -5], 0.4, 0.55);
    expect(factHolds(paraABCD, bad)).toBe(false);
    expect(factHolds(goalCyc, bad)).toBe(false);
    const out = two_circle_radical_axis.derive(premises, ctxOf(bad));
    expect(hasFact(out, goalCyc)).toBe(false);
    for (const f of out) expect(factHolds(f, bad), canonicalKey(f)).toBe(true);
  });

  it("ANGLE CHASE: granting cyclic(P,C,X,Q), the goal para(P,Q,A,B) is already engine-derivable", () => {
    // Registration-independent: this is the shipped directed-angle finish.
    const established: Fact[] = [...premises, goalCyc, collBCP];
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: established,
      candidateFact: goalPara,
      citedPremises: [goalCyc, cycABCX, collAXQ, collBCP],
    });
    expect(r).toEqual({ valid: true, rule: "algebraic angle-chase" });
  });

  // ---- Registration regression guard (green once added to PROMOTED_RULES) ----
  describe("end-to-end via shipped verify() [requires registration in PROMOTED_RULES]", () => {
    const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

    it("verify() proves cyclic(P,C,X,Q) via this rule across realizations", () => {
      for (const r of realizations) {
        const res = verify({
          coords: r.coords,
          bindings: r.bindings ?? {},
          establishedFacts: premises,
          candidateFact: goalCyc,
          citedPremises: premises,
          realizations,
        });
        expect(res).toEqual({ valid: true, rule: "two-circle radical axis" });
        break; // multi-case is already enforced by `realizations`
      }
    });

    it("verify() then reaches the goal para(P,Q,A,B) across realizations", () => {
      const established: Fact[] = [...premises, goalCyc, collBCP];
      const res = verify({
        coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: goalPara,
        citedPremises: [goalCyc, cycABCX, collAXQ, collBCP],
        realizations,
      });
      expect(res).toEqual({ valid: true, rule: "algebraic angle-chase" });
    });
  });
});
