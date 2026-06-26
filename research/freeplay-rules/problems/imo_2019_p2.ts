/**
 * PROBLEM — IMO 2019, Problem 2.
 *
 * Source: International Mathematical Olympiad 2019, Problem 2.
 *
 * Statement:
 *   In triangle ABC, point A1 lies on BC and B1 lies on CA. Let P, Q be points on
 *   segments AA1, BB1 respectively such that PQ ∥ AB. Let P1 be on line PB1 (with
 *   B1 strictly between P and P1) such that ∠PP1C = ∠BAC, and let Q1 be on line
 *   QA1 (with A1 strictly between Q and Q1) such that ∠CQ1Q = ∠CBA. Prove that
 *   P, P1, Q, Q1 are concyclic.
 *
 * Auxiliary points (pre-drawn so the projective step can be invoked):
 *   A2 = QA1 ∩ AC,  B2 = PB1 ∩ BC.
 *
 * WHICH PROOF WE ENCODE — the Pappus + auxiliary-circles solution.
 *   1  A2B2 ∥ AB              Pappus on (A,P,A1) and (B,Q,B1) with PQ∩AB at ∞.
 *   2  A2B2 ∥ PQ              transitivity of parallels (AR).
 *   3  cyclic(C,Q1,B2,A2)     ∠CB2A2 = ∠CBA (= ∠CQ1Q) with A2 on line QQ1:
 *                             the DIRECTED inscribed-angle converse over chord
 *                             CA2 (apexes B2, Q1 on OPPOSITE sides — supplementary
 *                             undirected, so the shipped converse_inscribed cannot
 *                             fire; closed by `concyclic_from_directed_angles`).
 *   4  cyclic(C,P1,B2,A2)     mirror of step 3 on the A-side.
 *   5  cyclic(P1,Q1,B2,A2)    concyclic_merge: steps 3,4 share C,B2,A2.
 *   6  cyclic(P,P1,Q,Q1)      DIRECTED inscribed-angle converse again: with the
 *                             circle (P1,Q1,A2,B2) known, P on line P1B2, Q on
 *                             line Q1A2 and PQ ∥ A2B2 give the chord {P,Q1} split
 *                             whose legs all lie on KNOWN lines — entailed by AR,
 *                             emitted by `concyclic_from_directed_angles`.
 *
 * STATUS — SOLVED END-TO-END (Batch 8). The genuinely new move is the directed
 * converse of the inscribed-angle theorem: every circle in this problem is an
 * opposite-side (supplementary) configuration unreachable by the undirected
 * shipped `converse_inscribed`, and AR proves the angle identity but cannot emit
 * a `cyclic`. `concyclic_from_directed_angles` bridges exactly that gap.
 */
import { rel } from "@/lib/freeplay/dsl";
import { buildImo2019p2Config } from "@/lib/freeplay/puzzles/imo2019p2Config";
import type { ResearchProblem } from "./types";

const { coords } = buildImo2019p2Config();

const given = [
  rel("coll", ["B", "A1", "B2", "C"]), // line BC
  rel("coll", ["A", "B1", "A2", "C"]), // line CA
  rel("coll", ["A", "P", "A1"]), // line AA1
  rel("coll", ["B", "Q", "B1"]), // line BB1
  rel("coll", ["P", "B1", "P1", "B2"]), // line PB1 (P1 beyond B1)
  rel("coll", ["Q", "A1", "Q1", "A2"]), // line QA1 (Q1 beyond A1)
  rel("para", ["P", "Q", "A", "B"]), // PQ ∥ AB
  rel("eqangle", ["P", "P1", "C", "B", "A", "C"]), // ∠PP1C = ∠BAC
  rel("eqangle", ["C", "Q1", "Q", "C", "B", "A"]), // ∠CQ1Q = ∠CBA
];

const paraA2B2AB = rel("para", ["A2", "B2", "A", "B"]);
const paraA2B2PQ = rel("para", ["A2", "B2", "P", "Q"]);
const cycCQ1 = rel("cyclic", ["C", "Q1", "B2", "A2"]);
const cycCP1 = rel("cyclic", ["C", "P1", "B2", "A2"]);
const cycMerged = rel("cyclic", ["P1", "Q1", "B2", "A2"]);
const goal = rel("cyclic", ["P", "P1", "Q", "Q1"]);

export const imo_2019_p2: ResearchProblem = {
  id: "imo_2019_p2",
  source: "IMO 2019, Problem 2",
  statement:
    "Triangle ABC; A1 on BC, B1 on CA; P on AA1, Q on BB1 with PQ ∥ AB. P1 on " +
    "PB1 (beyond B1) with ∠PP1C = ∠BAC; Q1 on QA1 (beyond A1) with ∠CQ1Q = " +
    "∠CBA. Prove P, P1, Q, Q1 concyclic. (Auxiliary: A2 = QA1∩AC, B2 = PB1∩BC.)",
  coords,
  given,
  goal,
  steps: [
    {
      fact: paraA2B2AB,
      premises: [
        rel("coll", ["A", "P", "A1"]),
        rel("coll", ["B", "Q", "B1"]),
        rel("para", ["P", "Q", "A", "B"]),
      ],
      expectRule: "Pappus's theorem",
      humanReadable:
        "Pappus on lines (A,P,A1) and (B,Q,B1): PB1∩BA1 = B2, A1Q∩AB1 = A2, and " +
        "PQ∩AB is at infinity (PQ∥AB), so A2B2 ∥ AB.",
    },
    {
      fact: paraA2B2PQ,
      premises: [paraA2B2AB, rel("para", ["P", "Q", "A", "B"])],
      expectRule: "algebraic angle-chase",
      humanReadable: "A2B2 ∥ PQ, transitively, since both are parallel to AB.",
    },
    {
      fact: cycCQ1,
      premises: [
        rel("eqangle", ["C", "Q1", "Q", "C", "B", "A"]),
        paraA2B2AB,
        rel("coll", ["B", "A1", "B2", "C"]),
        rel("coll", ["Q", "A1", "Q1", "A2"]),
      ],
      expectRule: "concyclic from equal directed angles",
      humanReadable:
        "C, Q1, B2, A2 concyclic: ∠CB2A2 = ∠CBA (A2B2∥AB, B2 on BC) and ∠CQ1Q = " +
        "∠CBA (given), and A2 lies on line QQ1, so over chord CA2 the apexes B2, " +
        "Q1 see equal DIRECTED angles (supplementary undirected).",
    },
    {
      fact: cycCP1,
      premises: [
        rel("eqangle", ["P", "P1", "C", "B", "A", "C"]),
        paraA2B2AB,
        rel("coll", ["A", "B1", "A2", "C"]),
        rel("coll", ["P", "B1", "P1", "B2"]),
      ],
      expectRule: "concyclic from equal directed angles",
      humanReadable:
        "C, P1, B2, A2 concyclic: mirror of the previous step on the A-side, with " +
        "∠CA2B2 = ∠BAC = ∠PP1C and B2 on line PP1.",
    },
    {
      fact: cycMerged,
      premises: [cycCQ1, cycCP1],
      expectRule: "same circle (3 shared points)",
      humanReadable:
        "P1, Q1, B2, A2 concyclic: the two circles (C,Q1,B2,A2) and (C,P1,B2,A2) " +
        "share the non-collinear triple C, B2, A2, hence are the same circle.",
    },
    {
      fact: goal,
      premises: [
        cycMerged,
        paraA2B2PQ,
        rel("coll", ["P", "B1", "P1", "B2"]),
        rel("coll", ["Q", "A1", "Q1", "A2"]),
      ],
      expectRule: "concyclic from equal directed angles",
      humanReadable:
        "P, P1, Q, Q1 concyclic: on circle (P1,Q1,A2,B2), with P on line P1B2, Q " +
        "on line Q1A2 and PQ ∥ A2B2, the chord {P,Q1} is seen by apexes P1, Q " +
        "under equal DIRECTED angles (∠(P1P,P1Q1) = ∠(QP,QQ1)), all legs along " +
        "known lines — the Reim/directed inscribed-angle finish.",
    },
  ],
  exercises: ["concyclic_from_directed_angles"],
};
