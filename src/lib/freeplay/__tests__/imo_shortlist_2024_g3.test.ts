import { describe, expect, it } from "vitest";
import { rel, type LFact } from "@/lib/freeplay/dsl";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { sampleRealizations } from "@/lib/freeplay/realize";
import { verify } from "@/lib/freeplay/verify";
import { imo_shortlist_2024_g3 as puzzle } from "../puzzles/imo_shortlist_2024_g3";

/**
 * IMO Shortlist 2024 G3 (Belarus) — "KP, LQ, MD are concurrent".
 *
 * This puzzle ships a FAITHFUL/PARTIAL chain: the verified solution reaches part
 * (a) of the official Solution 2 — the two auxiliary circles (D,E,K,P) and
 * (C,D,Q,L) and the parallels KP ∥ MC and LQ ∥ ME — entirely inside the shipped
 * engine (directed-angle chase + "concyclic from equal directed angles").
 *
 * The final concurrency coll(L,Q,Z) (with Z = MD ∩ KP) is the radical-centre step
 * (official Solution 2c): it is now mechanized by the rule
 * `three_circle_radical_center` from the three circles (D,E,K,P), (C,D,Q,L) and
 * (K,L,P,Q). The remaining SECONDARY gap is its prerequisite cyclic(K,L,P,Q),
 * which reduces to the power-of-M fact ME·MK = MC·ML (equivalently KL ∥ AB) — a
 * length/radical relation the shipped engine cannot establish (it needs the
 * auxiliary tangent-intersection point X of Solution 2b). The last tests document
 * BOTH gaps; neither fact is injected as a hypothesis.
 */
describe("puzzle: imo-shortlist-2024-g3 (KP, LQ, MD concurrent)", () => {
  const { coords, given, goal, solution } = puzzle;
  const realizations = sampleRealizations(puzzle, 6, 0xc0ffee);

  it("every given holds numerically on the canonical coordinates", () => {
    for (const g of given) expect(factHoldsL(g, coords)).toBe(true);
  });

  it("the goal holds numerically on the canonical coordinates", () => {
    expect(factHoldsL(goal, coords)).toBe(true);
  });

  it("produces multiple valid realizations", () => {
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

  it("replays the verified solution chain across all realizations at once", () => {
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

  it("is shipped as a PARTIAL chain (solutionReachesGoal === false)", () => {
    expect(puzzle.solutionReachesGoal).toBe(false);
  });

  it("SECONDARY GAP: the prerequisite cyclic(K,L,P,Q) is true but not shipped-derivable", () => {
    // The third radical-centre circle (K,L,P,Q) holds in every realization but is
    // unreachable by the shipped engine from the established part-(a) chain: it
    // reduces to the power-of-M fact ME·MK = MC·ML (equivalently KL ∥ AB, or
    // C,E,K,L concyclic). The angle layer cannot reach it (line KL is
    // unconstrained by the cited facts); the length layer cannot establish the
    // power of M (the official Solution 2b uses the auxiliary tangent-
    // intersection point X). It is NOT injected as a hypothesis.
    const established: LFact[] = [...given, ...solution.map((s) => s.fact)];
    const cycKLPQ = rel("cyclic", ["K", "L", "P", "Q"]);
    expect(factHoldsL(cycKLPQ, coords)).toBe(true);
    for (const cand of [
      cycKLPQ,
      rel("para", ["K", "L", "A", "B"]), // KL ∥ AB
      rel("cyclic", ["C", "E", "K", "L"]), // C,E,K,L concyclic
    ]) {
      const r = verify({
        coords,
        bindings: {},
        establishedFacts: established,
        candidateFact: cand,
        citedPremises: established,
        realizations,
      });
      expect(r.valid).toBe(false);
    }
  });

  it("the goal coll(L,Q,Z) is blocked by the missing third circle (registration-stable)", () => {
    // The concurrency is the radical centre of THREE circles (D,E,K,P), (C,D,Q,L)
    // and (K,L,P,Q). The established chain proves only the first two; the third,
    // cyclic(K,L,P,Q), is the secondary gap above. Citing the two AVAILABLE
    // circles + the two anchoring colls cannot reach coll(L,Q,Z) — and this stays
    // true even after `three_circle_radical_center` is registered, since that rule
    // needs all THREE circles cited (so the puzzle remains a partial chain until
    // the cyclic(K,L,P,Q) prerequisite is itself closed).
    const established: LFact[] = [...given, ...solution.map((s) => s.fact)];
    const result = verify({
      coords,
      bindings: {},
      establishedFacts: established,
      candidateFact: goal, // coll(L, Q, Z)
      citedPremises: [
        rel("cyclic", ["D", "E", "K", "P"]),
        rel("cyclic", ["C", "D", "Q", "L"]),
        rel("coll", ["K", "P", "Z"]), // Z on KP
        rel("coll", ["M", "D", "Z"]), // Z on MD
      ],
      realizations,
    });
    expect(result).toEqual({ valid: false, reason: "unjustified" });
  });
});
