import { describe, expect, it } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import { factHoldsL, type LFact } from "@/lib/freeplay/lengths/dsl";
import {
  circumcenter,
  dist,
  lineCircleIntersect,
  type V,
} from "@/lib/freeplay/geom";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2024_g4 as puzzle } from "../puzzles/imo_shortlist_2024_g4";

/**
 * IMO Shortlist 2024 G4 — PQ ∥ AB (now CLOSED).
 *
 * We encode official Solution 3. Steps 1–2 are the directed-angle relations
 * ∠XCP = ∠QAB and ∠YDP = ∠QBA (rule "algebraic angle-chase"). Step 3 supplies
 * the previously missing concyclicity cyclic(P,C,X,Q) via the promoted rule
 * `two_circle_radical_axis` (the radical-axis / common-chord lemma), and step 4
 * finishes PQ ∥ AB with the shipped directed-angle chase. So `solutionReachesGoal`
 * is true and the final step is the contest goal.
 *
 * The end-to-end `verify()` of the radical-axis step (and therefore the full
 * replay) only passes once `two_circle_radical_axis` is registered in
 * `rules/index.ts` (`PROMOTED_RULES`); the other assertions are registration-
 * independent.
 */
describe("puzzle: imo-shortlist-2024-g4 (PQ ∥ AB)", () => {
  const { coords, given, goal, solution } = puzzle;
  const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

  it("every given holds numerically on the canonical coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords), JSON.stringify(g)).toBe(true);
  });

  it("the goal holds numerically on the canonical coordinates", () => {
    expect(factHoldsL(goal, coords)).toBe(true);
  });

  it("produces multiple independent generic realizations", () => {
    expect(realizations.length).toBeGreaterThan(1);
  });

  it("every given holds in every realization", () => {
    for (const r of realizations) {
      for (const g of given) {
        expect(factHoldsL(g, r.coords, r.bindings ?? {}), JSON.stringify(g)).toBe(true);
      }
    }
  });

  it("the goal holds in every realization", () => {
    for (const r of realizations) {
      expect(factHoldsL(goal, r.coords, r.bindings ?? {})).toBe(true);
    }
  });

  it("replays the verified chain across all realizations at once", () => {
    const established: LFact[] = [...given];
    for (const step of solution) {
      const result = verify({
        coords,
        bindings: puzzle.variables ?? {},
        establishedFacts: established,
        candidateFact: step.fact,
        citedPremises: step.premises,
        realizations,
      });
      expect(result, JSON.stringify(step.fact)).toEqual({ valid: true, rule: step.rule });
      established.push(step.fact);
    }
  });

  it("the final step is the contest goal para(P,Q,A,B)", () => {
    const last = solution[solution.length - 1];
    expect(last.fact).toEqual(goal);
  });

  it("each cited (non-collinearity) premise is load-bearing", () => {
    // The cyclic premise of each angle-chase step is the genuine reason; dropping
    // it must break the derivation. (Collinearities are free figure structure, so
    // they are intentionally not required — we only probe the cyclic premise.)
    const established: LFact[] = [...given];
    for (const step of solution) {
      const cyclicPremise = step.premises.find((p) => p.kind === "rel" && p.name === "cyclic");
      if (cyclicPremise) {
        const without = step.premises.filter((p) => p !== cyclicPremise);
        const result = verify({
          coords,
          bindings: puzzle.variables ?? {},
          establishedFacts: established,
          candidateFact: step.fact,
          citedPremises: without,
          realizations,
        });
        expect(result.valid, `${JSON.stringify(step.fact)} w/o its cyclic premise`).toBe(false);
      }
      established.push(step.fact);
    }
  });

  it("is shipped as a COMPLETE chain (solutionReachesGoal !== false)", () => {
    expect(puzzle.solutionReachesGoal).not.toBe(false);
  });

  it("CLOSED: cyclic(P,C,X,Q) is engine-derivable via two_circle_radical_axis", () => {
    // The radical-axis step (equivalently Solution 3's Q1 = Q). Requires the rule
    // `two_circle_radical_axis` registered in rules/index.ts (PROMOTED_RULES).
    const radicalPremises: LFact[] = [
      rel("cyclic", ["A", "B", "C", "X"]),
      rel("cyclic", ["A", "B", "D", "Y"]),
      rel("cong", ["P", "C", "P", "X"]),
      rel("cong", ["P", "D", "P", "Y"]),
      rel("para", ["A", "B", "C", "D"]),
      rel("coll", ["A", "X", "Q"]),
      rel("coll", ["B", "Y", "Q"]),
    ];
    const result = verify({
      coords,
      bindings: puzzle.variables ?? {},
      establishedFacts: [...given],
      candidateFact: rel("cyclic", ["P", "C", "X", "Q"]),
      citedPremises: radicalPremises,
      realizations,
    });
    expect(result).toEqual({ valid: true, rule: "two-circle radical axis" });
  });

  /**
   * Demonstration of Solution 3's lemma point Q1 = AX ∩ circle(P,C,X). The lemma
   * para(P,Q1,A,B) IS engine-verifiable (the full directed-angle chase) — but
   * ONLY once Q1's membership on circle (P,C,X) is granted as a premise. For the
   * contest's point Q = AX ∩ BY that membership is exactly the radical-axis gap,
   * and Q1 = Q numerically (so they cannot be two distinct, separated vertices —
   * which is why the shipped figure carries the single point Q).
   */
  describe("Solution 3 lemma point Q1 = AX ∩ circle(P,C,X)", () => {
    const { P, A, C, X, Q } = coords as Record<string, V>;
    const oPCX = circumcenter(P, C, X)!;
    const rPCX = dist(P, oPCX);
    const Q1 = lineCircleIntersect(A, X, oPCX, rPCX).filter((p) => dist(p, X) > 1e-6)[0];
    const withQ1 = { ...coords, Q1 };

    it("Q1 coincides with Q (so they cannot be distinct figure points)", () => {
      expect(dist(Q1, Q)).toBeLessThan(1e-6);
    });

    it("para(P,Q1,A,B) verifies via the directed-angle chase (rule from Solution 3)", () => {
      const lemmaGivens: LFact[] = [
        rel("cyclic", ["P", "C", "X", "Q1"]), // Q1 on circle (P,C,X)  [granted here]
        rel("cyclic", ["A", "B", "C", "X"]), // X on circumcircle of ABC
        rel("coll", ["A", "X", "Q1"]), // Q1 on line AX
        rel("coll", ["B", "C", "P"]), // P on line BC
      ];
      const result = verify({
        coords: withQ1,
        bindings: {},
        establishedFacts: lemmaGivens,
        candidateFact: rel("para", ["P", "Q1", "A", "B"]),
        citedPremises: lemmaGivens,
      });
      expect(result).toEqual({ valid: true, rule: "algebraic angle-chase" });
    });
  });
});
