import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { cong_transitivity } from "../cong_transitivity";
import { verifyWith, RULES } from "../../harness";

/**
 * Circumcenter-style figure: O is equidistant (√13) from A, B, C, but the
 * triangle ABC is scalene and O is a generic interior point, so there is no
 * accidental symmetry to make a wrong conclusion look true.
 *
 *   O = (3,2);  A = (0,0), B = (6,0), C = (1,5)   — all at distance √13 from O.
 *   D = (10,10) is a generic extra point at a DIFFERENT distance from O.
 */
const coords: Coords = {
  O: [3, 2],
  A: [0, 0],
  B: [6, 0],
  C: [1, 5],
  D: [10, 10],
};

const congOAOB = rel("cong", ["O", "A", "O", "B"]); // |OA| = |OB|
const congOAOC = rel("cong", ["O", "A", "O", "C"]); // |OA| = |OC|
const goal = rel("cong", ["O", "B", "O", "C"]); // ⇒ |OB| = |OC|

const points = () => Object.keys(coords);

describe("equal segments chain — congruence transitivity (research rule)", () => {
  it("the rule alone chains the shared segment OA to derive OB = OC", () => {
    const out = cong_transitivity.derive([congOAOB, congOAOC], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cong" &&
          // canonical: segments {O,B} and {O,C}
          new Set(f.points.slice(0, 2)).size === 2,
      ),
    ).toBe(true);
    // Specifically derives the OB = OC fact (order-independent).
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cong" &&
          JSON.stringify([...f.points].sort()) ===
            JSON.stringify([...goal.points].sort()),
      ),
    ).toBe(true);
  });

  it("verifies in isolation citing exactly the two cong facts", () => {
    const r = verifyWith([cong_transitivity], {
      coords,
      bindings: {},
      establishedFacts: [congOAOB, congOAOC],
      candidateFact: goal,
      citedPremises: [congOAOB, congOAOC],
    });
    expect(r).toEqual({ valid: true, rule: "equal segments chain" });
  });

  it("MINIMALITY: dropping either cong premise makes the step invalid", () => {
    const dropFirst = verifyWith([cong_transitivity], {
      coords,
      bindings: {},
      establishedFacts: [congOAOB, congOAOC],
      candidateFact: goal,
      citedPremises: [congOAOC],
    });
    expect(dropFirst.valid).toBe(false);

    const dropSecond = verifyWith([cong_transitivity], {
      coords,
      bindings: {},
      establishedFacts: [congOAOB, congOAOC],
      candidateFact: goal,
      citedPremises: [congOAOB],
    });
    expect(dropSecond.valid).toBe(false);
  });

  it("SOUNDNESS: two cong facts that share NO segment emit nothing", () => {
    // {O,A}={O,B} and {C,A}={C,B}: they share no common segment, only points.
    const congCACB = rel("cong", ["C", "A", "C", "B"]); // |CA| vs |CB| (different)
    const out = cong_transitivity.derive([congOAOB, congCACB], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(out.length).toBe(0);
  });

  it("SOUNDNESS: never emits a false conclusion (coordinate guard)", () => {
    // A cited cong that is NOT realized in the figure: cong(O,A,O,D) but
    // |OD| ≠ |OA|. Chaining on the shared OA would suggest |OB| = |OD|, which is
    // false. The numeric guard must keep the rule silent on that pair.
    const congOAOD = rel("cong", ["O", "A", "O", "D"]); // false in coords
    const falseGoal = rel("cong", ["O", "B", "O", "D"]);

    const out = cong_transitivity.derive([congOAOB, congOAOD], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(
      out.some(
        (f) =>
          f.kind === "rel" &&
          f.name === "cong" &&
          JSON.stringify([...f.points].sort()) ===
            JSON.stringify([...falseGoal.points].sort()),
      ),
    ).toBe(false);

    // And the verifier rejects the step outright (candidate is numerically false).
    const r = verifyWith([cong_transitivity], {
      coords,
      bindings: {},
      establishedFacts: [congOAOB, congOAOD],
      candidateFact: falseGoal,
      citedPremises: [congOAOB, congOAOD],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: never restates a cited premise as a new deduction", () => {
    // Citing the SAME cong twice can only re-derive the cited fact, which is
    // forbidden — the rule must not present a premise back as a conclusion.
    const out = cong_transitivity.derive([congOAOB, congOAOB], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(out.length).toBe(0);
  });

  it("GAP: the shipped engine does NOT prove OB = OC from the two congs", () => {
    const r = verifyWith(RULES, {
      coords,
      bindings: {},
      establishedFacts: [congOAOB, congOAOC],
      candidateFact: goal,
      citedPremises: [congOAOB, congOAOC],
    });
    // No length table in AR and no cong-chaining DD rule ships, so this is a
    // genuine gap. If it ever flips to valid, the rule would be redundant.
    expect(r.valid).toBe(false);
  });
});
