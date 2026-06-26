import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { midpoint_congruence } from "../rules/midpoint_congruence";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules. The shipped `verify()` uses the global
 * RULES (now including this rule), so isolation/soundness/minimality are checked
 * by calling `derive()` directly, plus one end-to-end `verify()`.
 *
 * Generic, non-symmetric figure:
 *   A = (0,0), B = (6,2), M = midpoint(AB) = (3,1).
 *   P is an unrelated extra point (NOT equidistant: MP ≠ MA).
 */
const coords: Coords = {
  A: [0, 0],
  B: [6, 2],
  M: [3, 1],
  P: [5, 9],
};

const midpMAB = rel("midp", ["M", "A", "B"]);
const goal = rel("cong", ["M", "A", "M", "B"]); // MA = MB

describe("midpoint gives equal halves (promoted rule)", () => {
  it("the rule alone derives MA = MB from midp(M,A,B)", () => {
    const out = midpoint_congruence.derive([midpMAB], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(out.some((f) => f.kind === "rel" && f.name === "cong")).toBe(true);
  });

  it("end-to-end: verify() accepts MA = MB citing exactly midp(M,A,B)", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [midpMAB],
      candidateFact: goal,
      citedPremises: [midpMAB],
    });
    expect(r).toEqual({ valid: true, rule: "midpoint gives equal halves" });
  });

  it("SOUNDNESS: does NOT emit/accept cong(M,A,M,P) when MP ≠ MA", () => {
    const bad = rel("cong", ["M", "A", "M", "P"]);

    const out = midpoint_congruence.derive([midpMAB], {
      coords,
      bindings: {},
      points: Object.keys(coords),
    });
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cong" &&
          JSON.stringify(f.points) === JSON.stringify(["M", "A", "M", "P"]),
      ),
    ).toBe(false);

    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [midpMAB],
      candidateFact: bad,
      citedPremises: [midpMAB],
    });
    expect(r.valid).toBe(false);
  });
});
