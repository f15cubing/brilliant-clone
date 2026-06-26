import { describe, expect, it } from "vitest";
import { rel, canonicalKey, type Fact } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { isCollinear, lineIntersect, type V } from "@/lib/freeplay/geom";
import { pascal } from "../pascal";
import { verifyWith, RULES } from "../../harness";

/**
 * Six GENERIC (non-symmetric) points on the circle of radius 5 centered at the
 * origin, at angles 20°,75°,130°,200°,260°,320°. Hexagon A..F = P1..P6.
 * Opposite-side intersections (computed with line intersections):
 *   X = AB ∩ DE,  Y = BC ∩ EF,  Z = CD ∩ FA.
 * Pascal's theorem ⇒ X, Y, Z are collinear (asserted numerically below).
 */
const R = 5;
const ANGLES = [20, 75, 130, 200, 260, 320];
const circlePt = (deg: number): V => {
  const r = (deg * Math.PI) / 180;
  return [R * Math.cos(r), R * Math.sin(r)];
};
const [p1, p2, p3, p4, p5, p6] = ANGLES.map(circlePt);

const X = lineIntersect(p1, p2, p4, p5)!; // AB ∩ DE
const Y = lineIntersect(p2, p3, p5, p6)!; // BC ∩ EF
const Z = lineIntersect(p3, p4, p6, p1)!; // CD ∩ FA

const coords: Coords = {
  P1: p1, P2: p2, P3: p3, P4: p4, P5: p5, P6: p6,
  X, Y, Z,
};

// "Six on one circle": three cyclic facts sharing the non-collinear triple
// P1,P2,P3 — they pin one common circle covering P1..P6 (à la concyclic_merge).
const cyc4 = rel("cyclic", ["P1", "P2", "P3", "P4"]);
const cyc5 = rel("cyclic", ["P1", "P2", "P3", "P5"]);
const cyc6 = rel("cyclic", ["P1", "P2", "P3", "P6"]);

// `coll` facts that DEFINE each opposite-side intersection on both side-lines.
const collABX = rel("coll", ["P1", "P2", "X"]); // X on line AB
const collDEX = rel("coll", ["P4", "P5", "X"]); // X on line DE
const collBCY = rel("coll", ["P2", "P3", "Y"]); // Y on line BC
const collEFY = rel("coll", ["P5", "P6", "Y"]); // Y on line EF
const collCDZ = rel("coll", ["P3", "P4", "Z"]); // Z on line CD
const collFAZ = rel("coll", ["P6", "P1", "Z"]); // Z on line FA

const cyclics = [cyc4, cyc5, cyc6];
const collDefs = [collABX, collDEX, collBCY, collEFY, collCDZ, collFAZ];
const premises: Fact[] = [...cyclics, ...collDefs];
const goal = rel("coll", ["X", "Y", "Z"]);

const ctx = () => ({ coords, bindings: {}, points: Object.keys(coords) });
const hasFact = (facts: Fact[], f: Fact) =>
  facts.some((g) => canonicalKey(g) === canonicalKey(f));

describe("Pascal's theorem (research rule)", () => {
  it("sanity: the figure is a faithful realization (all premises + goal hold numerically)", () => {
    // X, Y, Z are genuinely collinear (the Pascal line).
    expect(isCollinear(X, Y, Z)).toBe(true);
    for (const f of premises) expect(factHolds(f, coords)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
    // The six points are pairwise distinct and the named intersections are
    // distinct from them and each other (non-degenerate figure).
    const keys = new Set(Object.values(coords).map((v) => `${v[0].toFixed(6)},${v[1].toFixed(6)}`));
    expect(keys.size).toBe(9);
  });

  it("the rule alone derives coll(X,Y,Z) from the cyclic + coll premises", () => {
    const out = pascal.derive(premises, ctx());
    expect(hasFact(out, goal)).toBe(true);
  });

  it("verifies in isolation citing exactly the 3 cyclic + 6 coll premises", () => {
    const r = verifyWith([pascal], {
      coords,
      bindings: {},
      establishedFacts: premises,
      candidateFact: goal,
      citedPremises: premises,
    });
    expect(r).toEqual({ valid: true, rule: "Pascal's theorem" });
  });

  it("MINIMALITY: dropping ANY single pinning cyclic fact ⇒ not valid", () => {
    for (let i = 0; i < cyclics.length; i++) {
      const cited = [...cyclics.filter((_, k) => k !== i), ...collDefs];
      const r = verifyWith([pascal], {
        coords,
        bindings: {},
        establishedFacts: premises,
        candidateFact: goal,
        citedPremises: cited,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("MINIMALITY: dropping ANY single defining coll fact ⇒ not valid", () => {
    for (let i = 0; i < collDefs.length; i++) {
      const cited = [...cyclics, ...collDefs.filter((_, k) => k !== i)];
      const r = verifyWith([pascal], {
        coords,
        bindings: {},
        establishedFacts: premises,
        candidateFact: goal,
        citedPremises: cited,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("SOUNDNESS: only 5 points pinned to one circle (drop cyc6) ⇒ rule does not fire", () => {
    const out = pascal.derive([cyc4, cyc5, ...collDefs], ctx());
    expect(hasFact(out, goal)).toBe(false);
  });

  it("SOUNDNESS: every emitted coll is numerically collinear (no false coll ever)", () => {
    const out = pascal.derive(premises, ctx());
    for (const f of out) {
      if (f.kind === "rel" && f.name === "coll") {
        expect(factHolds(f, coords)).toBe(true);
      }
    }
  });

  it("SOUNDNESS: a non-collinear named triple is never emitted", () => {
    // W = AB ∩ CD is the intersection of NON-opposite sides; {W,Y,Z} is NOT
    // collinear. Even if those coll facts are cited, the rule must not emit it.
    const W = lineIntersect(p1, p2, p3, p4)!; // AB ∩ CD (adjacent sides)
    const badCoords: Coords = { ...coords, W };
    expect(isCollinear(W, Y, Z)).toBe(false);
    const badColls = [
      rel("coll", ["P1", "P2", "W"]),
      rel("coll", ["P3", "P4", "W"]),
      ...collDefs,
    ];
    const out = pascal.derive([...cyclics, ...badColls], {
      coords: badCoords,
      bindings: {},
      points: Object.keys(badCoords),
    });
    const badGoal = rel("coll", ["W", "Y", "Z"]);
    expect(hasFact(out, badGoal)).toBe(false);
    // And no emitted coll is ever numerically false.
    for (const f of out) {
      if (f.kind === "rel" && f.name === "coll") {
        expect(factHolds(f, badCoords)).toBe(true);
      }
    }
  });

  it("PROMOTED: the shipped engine now proves coll(X,Y,Z)", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: premises,
      candidateFact: goal,
      citedPremises: premises,
    });
    // This rule has been promoted into the shipped engine
    // (src/lib/freeplay/rules/), so RULES now proves the collinearity directly.
    // Regression guard that the promotion stayed wired.
    expect(r.valid).toBe(true);
  });
});
