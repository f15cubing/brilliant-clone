import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import { cong_transitivity } from "../rules/cong_transitivity";
import { verify } from "@/lib/freeplay/verify";

/**
 * Promoted from research/freeplay-rules. Isolation/soundness/minimality are
 * checked at the `derive()` level; one end-to-end `verify()` exercises the rule
 * inside the global RULES.
 *
 * Circumcenter-style figure: O is equidistant (√13) from A, B, C, but the
 * triangle ABC is scalene and O is a generic interior point.
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

describe("equal segments chain — congruence transitivity (promoted rule)", () => {
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
          JSON.stringify([...f.points].sort()) ===
            JSON.stringify([...goal.points].sort()),
      ),
    ).toBe(true);
  });

  it("end-to-end: verify() accepts OB = OC citing exactly the two cong facts", () => {
    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [congOAOB, congOAOC],
      candidateFact: goal,
      citedPremises: [congOAOB, congOAOC],
    });
    expect(r).toEqual({ valid: true, rule: "equal segments chain" });
  });

  it("MINIMALITY: dropping either cong premise ⇒ derive emits nothing", () => {
    const dropFirst = cong_transitivity.derive([congOAOC], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(dropFirst.length).toBe(0);

    const dropSecond = cong_transitivity.derive([congOAOB], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(dropSecond.length).toBe(0);
  });

  it("SOUNDNESS: two cong facts that share NO segment emit nothing", () => {
    const congCACB = rel("cong", ["C", "A", "C", "B"]);
    const out = cong_transitivity.derive([congOAOB, congCACB], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(out.length).toBe(0);
  });

  it("SOUNDNESS: never emits a false conclusion (coordinate guard)", () => {
    // cong(O,A,O,D) is NOT realized (|OD| ≠ |OA|); chaining would suggest the
    // false |OB| = |OD|. The numeric guard keeps the rule silent.
    const congOAOD = rel("cong", ["O", "A", "O", "D"]);
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

    const r = verify({
      coords,
      bindings: {},
      establishedFacts: [congOAOB, congOAOD],
      candidateFact: falseGoal,
      citedPremises: [congOAOB, congOAOD],
    });
    expect(r.valid).toBe(false);
  });

  it("SOUNDNESS: never restates a cited premise as a new deduction", () => {
    const out = cong_transitivity.derive([congOAOB, congOAOB], {
      coords,
      bindings: {},
      points: points(),
    });
    expect(out.length).toBe(0);
  });
});
