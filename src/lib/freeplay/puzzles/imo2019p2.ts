import { COLORS, polygon, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import type { Puzzle } from "@/lib/freeplay/types";
import { buildImo2019p2Config } from "./imo2019p2Config";

const { coords } = buildImo2019p2Config();

/**
 * IMO 2019 Problem 2 (challenge / stress test).
 *
 * Triangle ABC; A1 on BC, B1 on CA. P on AA1, Q on BB1 with PQ ∥ AB. P1 on ray
 * PB1 beyond B1 with ∠PP1C = ∠BAC; Q1 on ray QA1 beyond A1 with ∠CQ1Q = ∠CBA.
 * Prove P1, Q1, P, Q are concyclic.
 *
 * Auxiliary points A2 = QA1 ∩ AC and B2 = PB1 ∩ BC are pre-drawn so the learner
 * can invoke Pappus.
 *
 * Reference solution (kept for the future hint system):
 *   • Let P2, Q2 be the second meets of B1P and A1Q (with the circle); the angle
 *     conditions are equivalent to P2AP1C and Q2BQ1C concyclic.
 *   • PQP1Q1 concyclic ⇔ P1Q1P2Q2 concyclic (Reim), or by the two angles.
 *   • Pappus on (P,A1,A) and (B,B1,Q): PB1∩BA1 = B2, PQ∩AB = ∞ (PQ∥AB),
 *     A1Q∩B1A = A2 ⇒ A2B2 ∥ AB.
 *   • Then A2B2∥AB ⇒ ∠A2B2C = ∠CQ1A2 = ∠CBA ⇒ CQ1B2A2 concyclic (and likewise
 *     CP1B2A2), which chains to PQP1Q1 concyclic.
 */
export const imo2019p2: Puzzle = {
  id: "imo-2019-p2",
  title: "IMO 2019 P2: P, P₁, Q, Q₁ concyclic",
  blurb:
    "A1 on BC, B1 on CA; P on AA1, Q on BB1 with PQ ∥ AB. P1 on ray PB1 beyond B1 with ∠PP1C = ∠BAC; Q1 on ray QA1 beyond A1 with ∠CQ1Q = ∠CBA. Prove P1, Q1, P, Q are concyclic. (You may use Pappus freely; A2 = QA1∩AC and B2 = PB1∩BC are provided.)",
  difficulty: "challenge",
  coords,
  figure: [
    polygon(["A", "B", "C"]),
    segment("A", "A1", { strokeColor: COLORS.ACCENT, strokeWidth: 1.2 }),
    segment("B", "B1", { strokeColor: COLORS.ACCENT, strokeWidth: 1.2 }),
    segment("P", "Q", { strokeColor: COLORS.OK, strokeWidth: 1.5 }),
    segment("P", "P1", { strokeColor: COLORS.BRAND, strokeWidth: 1.2, dash: 2 }),
    segment("Q", "Q1", { strokeColor: COLORS.BRAND, strokeWidth: 1.2, dash: 2 }),
    segment("A2", "B2", { strokeColor: COLORS.WRONG, strokeWidth: 1.2, dash: 1 }),
  ],
  given: [
    // Each line is stated once, with ALL its points (A2 = QA1∩AC, B2 = PB1∩BC).
    rel("coll", ["B", "A1", "B2", "C"]), // line BC
    rel("coll", ["A", "B1", "A2", "C"]), // line CA
    rel("coll", ["A", "P", "A1"]), // line AA1
    rel("coll", ["B", "Q", "B1"]), // line BB1
    rel("coll", ["P", "B1", "P1", "B2"]), // line PB1 (P1 beyond B1)
    rel("coll", ["Q", "A1", "Q1", "A2"]), // line QA1 (Q1 beyond A1)
    // hypotheses
    rel("para", ["P", "Q", "A", "B"]),
    rel("eqangle", ["P", "P1", "C", "B", "A", "C"]), // ∠PP1C = ∠BAC
    rel("eqangle", ["C", "Q1", "Q", "C", "B", "A"]), // ∠CQ1Q = ∠CBA
  ],
  goal: rel("cyclic", ["P", "P1", "Q", "Q1"]),
  // The full machine-checkable chain needs more rules (Reim / converse inscribed
  // angle / parallel⇒equal angles); the verified prefix below establishes the
  // key projective step.
  solutionReachesGoal: false,
  solution: [
    {
      fact: rel("para", ["A2", "B2", "A", "B"]),
      rule: "Pappus's theorem",
      premises: [
        rel("coll", ["A", "P", "A1"]),
        rel("coll", ["B", "Q", "B1"]),
        rel("para", ["P", "Q", "A", "B"]),
      ],
      humanReadable:
        "Pappus on lines (A,P,A1) and (B,Q,B1): PB1∩BA1 = B2, A1Q∩AB1 = A2, and PQ∩AB lies at infinity since PQ∥AB; the three are collinear, so A2B2 ∥ AB.",
    },
  ],
};
