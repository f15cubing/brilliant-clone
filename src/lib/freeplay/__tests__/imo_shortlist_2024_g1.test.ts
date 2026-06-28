import { describe, expect, it } from "vitest";
import { factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2024_g1 as puzzle } from "../puzzles/imo_shortlist_2024_g1";

/**
 * IMO Shortlist 2024 G1 — the perpendicular bisectors of BC and EF meet on the
 * circumcircle of ABCD. We encode Solution 3 with the auxiliary point T = the
 * midpoint of arc BAC (so cyclic(A,B,C,T), cong(T,B,T,C) and the Miquel
 * concyclicity cyclic(E,F,P,T) are HYPOTHESES) and goal cong(T,E,T,F).
 *
 * The chain is now COMPLETE: after the verified Solution-3 core (directed-angle
 * included-angle equality, SAS CF = BE, P ∈ circle ABCD) two `concyclic_merge`
 * steps put T on circle BCP, and the promoted `spiral_similarity_center` rule
 * takes the final Miquel / spiral-similarity-centre step CF = BE ⇒ TE = TF, so
 * the puzzle ships with `solutionReachesGoal !== false`.
 */
describe("puzzle: imo-shortlist-2024-g1 (perp bisectors of BC, EF meet on circle)", () => {
  const { coords, given, goal, solution } = puzzle;
  const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

  it("every given holds numerically on the canonical coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords)).toBe(true);
  });

  it("the goal (TE = TF) holds numerically on the canonical coordinates", () => {
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

  it("replays the full Solution-3 chain through the shipped verifier across all realizations", () => {
    const established: LFact[] = [...given];
    for (const step of solution) {
      const result = verify({
        coords: puzzle.coords,
        bindings: puzzle.variables ?? {},
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
        realizations,
      });
      expect(result).toEqual({ valid: true, rule: step.rule });
      established.push(step.fact);
    }
  });

  it("the final solution step reaches the goal (TE = TF)", () => {
    const last = solution[solution.length - 1];
    expect(JSON.stringify(last.fact)).toBe(JSON.stringify(goal));
  });

  it("the puzzle is shipped as a complete chain (solutionReachesGoal !== false)", () => {
    expect(puzzle.solutionReachesGoal).not.toBe(false);
  });
});
