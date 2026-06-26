import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { coincident_direction_collinear } from "../coincident_direction_collinear";
import { verifyWith, RULES, RESEARCH_RULES } from "../../harness";

/**
 * Generic collinear configuration: X is the shared pivot, A and B lie on the
 * SAME line through X (so XA ∥ XB). Coordinates are off-axis and irrational-free
 * but non-degenerate; A and B sit on OPPOSITE sides of X so the figure also
 * exercises the "X between A and B" case (the direction-only `para`/`coll`
 * checks are sign-agnostic). P, Q are unrelated points to keep the figure
 * generic and to provide a non-collinear control.
 *
 *   X = (1, 1),  A = (3, 5),  B = (-1, -3)
 *   XA = (2, 4),  XB = (-2, -4) = -1 · XA  → parallel & collinear (X between A,B)
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

describe("coincident direction ⇒ collinear (research rule)", () => {
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
      rel("para", ["X", "B", "X", "A"]), // segments swapped
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

  it("verifies in isolation citing exactly para(X,A,X,B)", () => {
    const r = verifyWith([coincident_direction_collinear], {
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

  it("MINIMALITY: with no cited para, the step is not valid", () => {
    const r = verifyWith([coincident_direction_collinear], {
      coords,
      bindings: {},
      establishedFacts: [para],
      candidateFact: goal,
      citedPremises: [],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: two DISTINCT parallel segments (no shared endpoint) emit nothing", () => {
    // A genuine pair of parallel but distinct segments: CD ∥ EF, all four points
    // distinct and the four are NOT collinear (two separate parallel lines).
    // Collinearity must NOT be concluded.
    const distinct: Coords = {
      C: [0, 0],
      D: [2, 1],
      E: [0, 2],
      F: [2, 3], // EF = (2,1) = CD direction, but C,D,E,F not collinear
    };
    const dctx = { coords: distinct, bindings: {}, points: Object.keys(distinct) };
    const out = coincident_direction_collinear.derive(
      [rel("para", ["C", "D", "E", "F"])],
      dctx,
    );
    expect(out.length).toBe(0);
  });

  it("SOUNDNESS: when the pivoted points are NOT collinear, the rule emits no coll and the step is rejected", () => {
    // X, A, B form a real (non-degenerate) triangle: XA and XB are NOT parallel,
    // so coll(X,A,B) is false. Feeding a (false) para must not produce coll.
    const triangle: Coords = {
      X: [0, 0],
      A: [4, 0],
      B: [0, 3], // right angle at X — definitely not collinear
    };
    const tctx = { coords: triangle, bindings: {}, points: Object.keys(triangle) };

    // The coordinate guard suppresses emission even if a (numerically false)
    // para is somehow cited.
    const out = coincident_direction_collinear.derive(
      [rel("para", ["X", "A", "X", "B"])],
      tctx,
    );
    expect(out.some((f) => f.kind === "rel" && f.name === "coll")).toBe(false);

    // And the verifier rejects the step outright (numeric-truth gate: neither the
    // premise para nor the candidate coll holds in a triangle).
    const r = verifyWith([coincident_direction_collinear], {
      coords: triangle,
      bindings: {},
      establishedFacts: [rel("para", ["X", "A", "X", "B"])],
      candidateFact: rel("coll", ["X", "A", "B"]),
      citedPremises: [rel("para", ["X", "A", "X", "B"])],
    });
    expect(r.valid).toBe(false);
  });

  it("PROMOTED: the shipped engine now bridges para(X,A,X,B) to coll(X,A,B)", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [para],
      candidateFact: goal,
      citedPremises: [para],
    });
    // This rule has been promoted into the shipped engine
    // (src/lib/freeplay/rules/), so RULES now performs the para→coll bridge
    // directly. Regression guard that the promotion stayed wired.
    expect(r.valid).toBe(true);
  });

  it("PROMOTED: the full rule set (shipped + research) now proves it via the promoted rule", () => {
    const r = verifyWith([...RULES, ...RESEARCH_RULES], {
      coords,
      bindings: {},
      establishedFacts: [para],
      candidateFact: goal,
      citedPremises: [para],
    });
    // The bridge rule now ships inside RULES (src/lib/freeplay/rules/), so the
    // combined set proves the step. Regression guard that the promotion stayed
    // wired.
    expect(r.valid).toBe(true);
  });
});
