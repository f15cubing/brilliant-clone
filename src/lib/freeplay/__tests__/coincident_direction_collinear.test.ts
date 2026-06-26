import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { coincident_direction_collinear } from "../rules/coincident_direction_collinear";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules — the para(X,A,X,B) ⇒ coll(X,A,B) bridge.
 *
 * Generic collinear configuration: X is the shared pivot, A and B on the SAME
 * line through X (XA ∥ XB), with A,B on OPPOSITE sides of X (X between A,B).
 *   X = (1,1), A = (3,5), B = (-1,-3) = X - (XA). P, Q are unrelated controls.
 */
const coords: Coords = {
  X: [1, 1],
  A: [3, 5],
  B: [-1, -3],
  P: [6, 1],
  Q: [2, -4],
};

const para = rel("para", ["X", "A", "X", "B"]); // XA ∥ XB (share X)
const goal = rel("coll", ["X", "A", "B"]); // ⇒ X, A, B collinear

const ctx = { coords, bindings: {}, points: Object.keys(coords) };

describe("coincident direction ⇒ collinear (promoted rule)", () => {
  it("the rule alone derives coll(X,A,B) from para(X,A,X,B)", () => {
    const out = coincident_direction_collinear.derive([para], ctx);
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "coll" &&
          [...f.points].sort().join("") === "ABX",
      ),
    ).toBe(true);
  });

  it("recognizes the pivot regardless of para ordering (para is symmetric)", () => {
    for (const p of [
      rel("para", ["X", "A", "X", "B"]),
      rel("para", ["A", "X", "X", "B"]),
      rel("para", ["X", "A", "B", "X"]),
      rel("para", ["A", "X", "B", "X"]),
      rel("para", ["X", "B", "X", "A"]),
    ]) {
      const out = coincident_direction_collinear.derive([p], ctx);
      expect(
        out.some(
          (f) =>
            f.kind === "rel" &&
            f.name === "coll" &&
            [...f.points].sort().join("") === "ABX",
        ),
        JSON.stringify(p),
      ).toBe(true);
    }
  });

  it("end-to-end: verify() accepts coll(X,A,B) citing exactly para(X,A,X,B)", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [para],
      candidateFact: goal,
      citedPremises: [para],
    });
    expect(r).toEqual({
      valid: true,
      rule: "coincident direction ⇒ collinear",
    });
  });

  it("MINIMALITY: with no cited para, the rule emits nothing", () => {
    const out = coincident_direction_collinear.derive([], ctx);
    expect(out.length).toBe(0);
  });

  it("SOUNDNESS: two DISTINCT parallel segments (no shared endpoint) emit nothing", () => {
    const distinct: Coords = {
      C: [0, 0],
      D: [2, 1],
      E: [0, 2],
      F: [2, 3], // EF ∥ CD direction, but C,D,E,F not collinear
    };
    const dctx = { coords: distinct, bindings: {}, points: Object.keys(distinct) };
    const out = coincident_direction_collinear.derive(
      [rel("para", ["C", "D", "E", "F"])],
      dctx,
    );
    expect(out.length).toBe(0);
  });

  it("SOUNDNESS: when the pivoted points are NOT collinear, no coll, step rejected", () => {
    const triangle: Coords = {
      X: [0, 0],
      A: [4, 0],
      B: [0, 3], // right angle at X — not collinear
    };
    const tctx = { coords: triangle, bindings: {}, points: Object.keys(triangle) };

    const out = coincident_direction_collinear.derive(
      [rel("para", ["X", "A", "X", "B"])],
      tctx,
    );
    expect(out.some((f) => f.kind === "rel" && f.name === "coll")).toBe(false);

    const r = verify({
      coords: triangle,
      bindings: {},
      establishedFacts: [rel("para", ["X", "A", "X", "B"])],
      candidateFact: rel("coll", ["X", "A", "B"]),
      citedPremises: [rel("para", ["X", "A", "X", "B"])],
    });
    expect(r.valid).toBe(false);
  });
});
