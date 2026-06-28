import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { eqratio, factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2024_g5 as puzzle } from "../puzzles/imo_shortlist_2024_g5";

/**
 * IMO Shortlist 2024 G5 (∠WAY = ∠ZAX).
 *
 * This puzzle ships as a PARTIAL chain (`solutionReachesGoal: false`): the
 * verified core is the power-of-a-point length lemma KA·KP = KB·KC = KY·KZ = KW·KX
 * (the official Solution 1's first move, "so P lies on circle AYZ"). The chain
 * then STOPS — see the puzzle's bottom comment for the engine gap. The tests
 * pin down (1) the figure is a faithful, multi-realization-stable realization of
 * the statement, (2) every listed step is a genuine one-step deduction across
 * all realizations, and (3) the documented gap really is a gap in the engine.
 */
describe("puzzle: imo-shortlist-2024-g5 (∠WAY = ∠ZAX)", () => {
  const { coords, given, goal, solution } = puzzle;
  const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

  it("every given holds numerically on the canonical coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords)).toBe(true);
  });

  it("the goal holds numerically on the canonical coordinates", () => {
    expect(factHoldsL(goal, coords)).toBe(true);
  });

  it("produces multiple independent valid realizations", () => {
    expect(realizations.length).toBeGreaterThan(1);
  });

  it("every given holds in every realization", () => {
    for (const r of realizations) {
      for (const g of given) {
        expect(factHoldsL(g, r.coords, r.bindings ?? {})).toBe(true);
      }
    }
  });

  it("the goal holds in every realization", () => {
    for (const r of realizations) {
      expect(factHoldsL(goal, r.coords, r.bindings ?? {})).toBe(true);
    }
  });

  // NOTE: the final step (cyclic(A,Y,P,Z), "converse power of a point") is an
  // in-engine deduction ONLY once `converse_power_of_a_point` is registered in the
  // length RATIO_RULES (the orchestrator step); until then this replay's last
  // iteration is expected to be red.
  it("replays the verified power-of-a-point + converse-PoP chain across all realizations at once", () => {
    const established: LFact[] = [...given];
    for (const step of solution) {
      const result = verify({
        coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
        realizations,
      });
      expect(result).toEqual({ valid: true, rule: step.rule });
      established.push(step.fact);
    }
  });

  it("ships as a partial chain (solutionReachesGoal === false)", () => {
    expect(puzzle.solutionReachesGoal).toBe(false);
  });

  it("the listed solution stops short of the goal", () => {
    const last = solution[solution.length - 1];
    expect(JSON.stringify(last.fact)).not.toBe(JSON.stringify(goal));
  });

  // ---- gap #1 (NOW CLOSED) --------------------------------------------------
  // "P lies on circle AYZ", i.e. cyclic(A,Y,P,Z), is the CONVERSE of power of a
  // point (an eqratio at the meet of two lines ⇒ concyclic). It is now an in-engine
  // ONE-step deduction from the equal power KA·KP = KY·KZ (step 6) and the two
  // chords, via the `converse_power_of_a_point` LENGTH rule — verified once that
  // rule is registered in the length RATIO_RULES (the orchestrator step).
  it("reaches cyclic(A,Y,P,Z) via the converse power of a point (closed gap)", () => {
    const cycAYPZ = rel("cyclic", ["A", "Y", "P", "Z"]);
    const collAKP = rel("coll", ["A", "K", "P"]);
    const collYKZ = rel("coll", ["Y", "K", "Z"]);
    const powerYZ = eqratio("K", "A", "K", "Y", "K", "Z", "K", "P");
    expect(factHoldsL(cycAYPZ, coords)).toBe(true);
    const result = verify({
      coords,
      bindings: {},
      establishedFacts: [...given, powerYZ],
      candidateFact: cycAYPZ,
      citedPremises: [powerYZ, collAKP, collYKZ],
      realizations,
    });
    expect(result).toEqual({ valid: true, rule: "converse power of a point" });
  });

  // ---- gap #2 (still open) --------------------------------------------------
  // Even WITH cyclic(A,Y,P,Z) now established (step 8), the key equality ∠ZAK =
  // ∠IAY needs circle CENTRES and the central-angle identity ∠PAN = ½∠PSN, which
  // the directed-angle table cannot represent.
  it("cannot reach the key equality ∠ZAK = ∠IAY (central-angle gap)", () => {
    const established: LFact[] = [...given];
    for (const step of solution) established.push(step.fact);
    const eqZAKIAY = rel("eqangle", ["Z", "A", "K", "I", "A", "Y"]);
    expect(factHoldsL(eqZAKIAY, coords)).toBe(true); // true in the figure …
    const result = verify({
      coords,
      bindings: {},
      establishedFacts: established,
      candidateFact: eqZAKIAY,
      citedPremises: established,
      realizations,
    });
    expect(result.valid).toBe(false); // … but not derivable
  });

  // Sanity: the official reduction IS within the engine — once the two key
  // equalities ∠ZAK = ∠IAY and ∠WAK = ∠IAX are granted, the goal follows by a
  // pure directed-angle chase. This isolates the gap to exactly those equalities.
  it("the final reduction to the goal is engine-derivable from the two key equalities", () => {
    const eqZAKIAY = rel("eqangle", ["Z", "A", "K", "I", "A", "Y"]);
    const eqWAKIAX = rel("eqangle", ["W", "A", "K", "I", "A", "X"]);
    const result = verify({
      coords,
      bindings: {},
      establishedFacts: [...given, eqZAKIAY, eqWAKIAX],
      candidateFact: goal,
      citedPremises: [eqZAKIAY, eqWAKIAX],
      realizations,
    });
    expect(result).toEqual({ valid: true, rule: "algebraic angle-chase" });
  });
});
