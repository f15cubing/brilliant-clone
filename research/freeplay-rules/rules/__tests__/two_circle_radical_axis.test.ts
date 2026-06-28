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
import { imo_shortlist_2024_g4 as puzzle } from "@/lib/freeplay/puzzles/imo_shortlist_2024_g4";
import { two_circle_radical_axis } from "../two_circle_radical_axis";
import { RULES, verifyWith } from "../../harness";

/**
 * Two-circle radical axis (research rule) — closes IMO 2024 Shortlist G4.
 *
 * The faithful figure is the puzzle's own canonical realization (and its sampled
 * generic realizations). Premises (all GIVEN by the puzzle):
 *   cyclic(A,B,C,X), cyclic(A,B,D,Y)  — the two circles sharing chord AB
 *   cong(P,C,P,X),   cong(P,D,P,Y)    — the two cong-apex circles ω₁, ω₂ at P
 *   para(A,B,C,D)                     — the shared-chord direction
 *   coll(A,X,Q),     coll(B,Y,Q)      — Q = AX ∩ BY
 *   ⇒ cyclic(P,C,X,Q)  (and the symmetric cyclic(P,D,Y,Q))
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

const goalCyc = rel("cyclic", ["P", "C", "X", "Q"]); // the gap
const goalCyc2 = rel("cyclic", ["P", "D", "Y", "Q"]); // the symmetric conclusion
const goalPara = rel("para", ["P", "Q", "A", "B"]); // the contest goal

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

/** Like the puzzle's buildG4 but A, B placed at SEPARATE ratios (tA ≠ tB ⇒ AB ∦ CD). */
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

describe("two-circle radical axis (research rule)", () => {
  it("sanity: the canonical figure is faithful (every premise + conclusion holds; a decoy is false)", () => {
    for (const f of premises) expect(factHolds(f, coords), canonicalKey(f)).toBe(true);
    expect(factHolds(goalCyc, coords)).toBe(true);
    expect(factHolds(goalCyc2, coords)).toBe(true);
    expect(factHolds(goalPara, coords)).toBe(true);
    // Q is NOT on circle (P,D,X) — a generic non-conclusion of the configuration.
    expect(factHolds(rel("cyclic", ["P", "D", "X", "Q"]), coords)).toBe(false);
    // Non-degenerate: the eight logical points are pairwise distinct.
    const ids = ["P", "A", "B", "C", "D", "X", "Y", "Q"];
    const keys = new Set(ids.map((id) => `${coords[id][0].toFixed(6)},${coords[id][1].toFixed(6)}`));
    expect(keys.size).toBe(8);
  });

  it("the rule alone derives cyclic(P,C,X,Q) AND the symmetric cyclic(P,D,Y,Q)", () => {
    const out = two_circle_radical_axis.derive(premises, ctxOf(coords));
    expect(hasFact(out, goalCyc)).toBe(true);
    expect(hasFact(out, goalCyc2)).toBe(true);
  });

  it("verifies in isolation citing exactly the 2 cyclic + 2 cong + para + 2 coll premises", () => {
    const r = verifyWith([...RULES, two_circle_radical_axis], {
      coords,
      bindings: {},
      establishedFacts: premises,
      candidateFact: goalCyc,
      citedPremises: premises,
    });
    expect(r).toEqual({ valid: true, rule: "two-circle radical axis" });
  });

  it("MINIMALITY: dropping any of the 2 cyclic / 2 cong / para premises ⇒ not valid", () => {
    const necessary = [cycABCX, cycABDY, congPCPX, congPDPY, paraABCD];
    for (const drop of necessary) {
      const cited = premises.filter((f) => f !== drop);
      const r = verifyWith([...RULES, two_circle_radical_axis], {
        coords,
        bindings: {},
        establishedFacts: premises,
        candidateFact: goalCyc,
        citedPremises: cited,
      });
      expect(r.valid, `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("MINIMALITY: dropping either defining coll (A,X,Q) / (B,Y,Q) ⇒ not valid", () => {
    for (const drop of [collAXQ, collBYQ]) {
      const cited = premises.filter((f) => f !== drop);
      const r = verifyWith([...RULES, two_circle_radical_axis], {
        coords,
        bindings: {},
        establishedFacts: premises,
        candidateFact: goalCyc,
        citedPremises: cited,
      });
      expect(r.valid, `dropped ${canonicalKey(drop)}`).toBe(false);
    }
  });

  it("SOUNDNESS A: an X' on Γ₁ with PC ≠ PX' makes cyclic(P,C,X',Q') false ⇒ not emitted", () => {
    const { P, A, B, C, Y } = coords as Record<string, V>;
    const OC = circumcenter(A, B, C)!;
    const Xbad = rotate(C, OC, 37); // still on circle (A,B,C), but PC ≠ PXbad
    const Qbad = lineIntersect(A, Xbad, B, Y)!;
    const bad: Coords = { ...coords, X: Xbad, Q: Qbad };

    expect(factHolds(cycABCX, bad)).toBe(true); // Γ₁ membership preserved
    expect(factHolds(congPCPX, bad)).toBe(false); // apex condition broken
    expect(factHolds(goalCyc, bad)).toBe(false); // conclusion now false

    const out = two_circle_radical_axis.derive(premises, ctxOf(bad));
    expect(hasFact(out, goalCyc)).toBe(false);
    for (const f of out) expect(factHolds(f, bad), canonicalKey(f)).toBe(true); // never a false cyclic
  });

  it("SOUNDNESS B: breaking AB ∥ CD (two placement ratios) makes cyclic(P,C,X,Q) false ⇒ not emitted", () => {
    const bad = buildG4two([0, 0], [-3, -6], [6, -5], 0.4, 0.55);

    expect(factHolds(cycABCX, bad)).toBe(true);
    expect(factHolds(cycABDY, bad)).toBe(true);
    expect(factHolds(congPCPX, bad)).toBe(true);
    expect(factHolds(congPDPY, bad)).toBe(true);
    expect(factHolds(paraABCD, bad)).toBe(false); // AB ∦ CD
    expect(factHolds(goalCyc, bad)).toBe(false); // conclusion now false

    const out = two_circle_radical_axis.derive(premises, ctxOf(bad));
    expect(hasFact(out, goalCyc)).toBe(false);
    for (const f of out) expect(factHolds(f, bad), canonicalKey(f)).toBe(true);
  });

  it("GAP: the shipped engine alone cannot derive cyclic(P,C,X,Q)", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: premises,
      candidateFact: goalCyc,
      citedPremises: premises,
    });
    expect(r.valid).toBe(false);
  });

  describe("CLOSURE: reaches the contest goal para(P,Q,A,B) across realizations", () => {
    const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);
    const rulesWith = [...RULES, two_circle_radical_axis];
    // Step B: the in-engine directed-angle chase that finishes the proof.
    const paraPrems: Fact[] = [goalCyc, cycABCX, collAXQ, collBCP];
    const establishedForPara: Fact[] = [...premises, goalCyc, collBCP];

    it("samples several independent generic realizations", () => {
      expect(realizations.length).toBeGreaterThan(1);
    });

    it("step A — cyclic(P,C,X,Q) verifies via the rule in EVERY realization (and NOT without it)", () => {
      for (const r of realizations) {
        const withRule = verifyWith(rulesWith, {
          coords: r.coords,
          bindings: r.bindings ?? {},
          establishedFacts: premises,
          candidateFact: goalCyc,
          citedPremises: premises,
        });
        expect(withRule).toEqual({ valid: true, rule: "two-circle radical axis" });

        const withoutRule = verifyWith(RULES, {
          coords: r.coords,
          bindings: r.bindings ?? {},
          establishedFacts: premises,
          candidateFact: goalCyc,
          citedPremises: premises,
        });
        expect(withoutRule.valid).toBe(false);
      }
    });

    it("step B — para(P,Q,A,B) then verifies via the angle chase in EVERY realization", () => {
      for (const r of realizations) {
        const res = verifyWith(rulesWith, {
          coords: r.coords,
          bindings: r.bindings ?? {},
          establishedFacts: establishedForPara,
          candidateFact: goalPara,
          citedPremises: paraPrems,
        });
        expect(res).toEqual({ valid: true, rule: "algebraic angle-chase" });
      }
    });
  });
});
