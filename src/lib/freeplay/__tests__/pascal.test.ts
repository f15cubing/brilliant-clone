import { describe, expect, it } from "vitest";
import { rel, canonicalKey, type Fact } from "@/lib/freeplay/dsl";
import { factHolds, type Coords } from "@/lib/freeplay/check";
import { isCollinear, lineIntersect, type V } from "@/lib/freeplay/geom";
import { pascal } from "../rules/pascal";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules.
 *
 * Six GENERIC points on the circle r=5 at angles 20°,75°,130°,200°,260°,320°.
 * Hexagon A..F = P1..P6. Opposite-side intersections:
 *   X = AB ∩ DE,  Y = BC ∩ EF,  Z = CD ∩ FA  — collinear (the Pascal line).
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

const cyc4 = rel("cyclic", ["P1", "P2", "P3", "P4"]);
const cyc5 = rel("cyclic", ["P1", "P2", "P3", "P5"]);
const cyc6 = rel("cyclic", ["P1", "P2", "P3", "P6"]);

const collABX = rel("coll", ["P1", "P2", "X"]);
const collDEX = rel("coll", ["P4", "P5", "X"]);
const collBCY = rel("coll", ["P2", "P3", "Y"]);
const collEFY = rel("coll", ["P5", "P6", "Y"]);
const collCDZ = rel("coll", ["P3", "P4", "Z"]);
const collFAZ = rel("coll", ["P6", "P1", "Z"]);

const cyclics = [cyc4, cyc5, cyc6];
const collDefs = [collABX, collDEX, collBCY, collEFY, collCDZ, collFAZ];
const premises: Fact[] = [...cyclics, ...collDefs];
const goal = rel("coll", ["X", "Y", "Z"]);

const ctx = () => ({ coords, bindings: {}, points: Object.keys(coords) });
const hasFact = (facts: Fact[], f: Fact) =>
  facts.some((g) => canonicalKey(g) === canonicalKey(f));

describe("Pascal's theorem (promoted rule)", () => {
  it("sanity: the figure is a faithful realization (all premises + goal hold)", () => {
    expect(isCollinear(X, Y, Z)).toBe(true);
    for (const f of premises) expect(factHolds(f, coords)).toBe(true);
    expect(factHolds(goal, coords)).toBe(true);
    const keys = new Set(
      Object.values(coords).map((v) => `${v[0].toFixed(6)},${v[1].toFixed(6)}`),
    );
    expect(keys.size).toBe(9);
  });

  it("the rule alone derives coll(X,Y,Z) from the cyclic + coll premises", () => {
    const out = pascal.derive(premises, ctx());
    expect(hasFact(out, goal)).toBe(true);
  });

  it("end-to-end: verify() accepts coll(X,Y,Z) citing the 3 cyclic + 6 coll premises", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: premises,
      candidateFact: goal,
      citedPremises: premises,
    });
    expect(r).toEqual({ valid: true, rule: "Pascal's theorem" });
  });

  it("MINIMALITY: dropping ANY single pinning cyclic fact ⇒ coll(X,Y,Z) not derived", () => {
    for (let i = 0; i < cyclics.length; i++) {
      const cited = [...cyclics.filter((_, k) => k !== i), ...collDefs];
      const out = pascal.derive(cited, ctx());
      expect(hasFact(out, goal)).toBe(false);
    }
  });

  it("MINIMALITY: dropping ANY single defining coll fact ⇒ coll(X,Y,Z) not derived", () => {
    for (let i = 0; i < collDefs.length; i++) {
      const cited = [...cyclics, ...collDefs.filter((_, k) => k !== i)];
      const out = pascal.derive(cited, ctx());
      expect(hasFact(out, goal)).toBe(false);
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
    for (const f of out) {
      if (f.kind === "rel" && f.name === "coll") {
        expect(factHolds(f, badCoords)).toBe(true);
      }
    }
  });
});
