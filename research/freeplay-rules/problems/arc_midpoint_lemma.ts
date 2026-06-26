/**
 * PROBLEM — The arc-midpoint ("trillium") lemma: MB = MC.
 *
 * Source: classical olympiad lemma (the "incenter/arc-midpoint lemma", a.k.a. the
 *   trillium theorem). A ubiquitous building block in olympiad geometry; included
 *   as the easy, self-contained kernel MB = MC.
 *
 * Statement:
 *   Let ABC be a triangle inscribed in a circle, and let the bisector of ∠BAC
 *   meet the circle again at M (the midpoint of arc BC not containing A). Prove
 *   that MB = MC.
 *
 * WHICH PROOF WE ENCODE — inscribed angles + the angle bisector, then isosceles:
 *
 *   1.  ∠MBC = ∠MCB.
 *         Inscribed angles: ∠MBC = ∠MAC (chord MC) and ∠MCB = ∠MAB (chord MB);
 *         the bisector gives ∠MAB = ∠MAC, so ∠MBC = ∠MCB.
 *   2.  MB = MC.
 *         Triangle MBC has equal base angles, hence equal legs (isosceles).
 *
 * HOW IT MAPS ONTO THE ENGINE
 *   step 1  eqangle(M,B,C, M,C,B)  "algebraic angle-chase"
 *               [cyclic(A,B,C,M), eqangle(B,A,M,M,A,C)]
 *   step 2  cong(M,B,M,C)          "isosceles: equal base angles ⇒ equal sides"
 *               [eqangle(M,B,C,M,C,B)]
 *
 * Every step is replay-verified through the research harness; in step 1 both
 * premises (the concyclicity and the bisector equality) are load-bearing. The
 * only non-AR rule is the shipped `isosceles` (step 2).
 *
 * COORDINATES — the circumcircle is the unit circle; A, B, C sit at 100°, 205°,
 * 335° (scalene). M = 270° is the midpoint of arc BC not containing A, so AM
 * bisects ∠BAC. Every given and step fact is checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { rel } from "@/lib/freeplay/dsl";
import type { ResearchProblem } from "./types";

const deg = (d: number): V => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)];

const A = deg(100);
const B = deg(205);
const C = deg(335);
const M = deg(270); // midpoint of arc BC not containing A

const coords: Coords = { A, B, C, M };

const given = [
  rel("cyclic", ["A", "B", "C", "M"]), // A, B, C, M on the circumcircle
  rel("eqangle", ["B", "A", "M", "M", "A", "C"]), // AM bisects ∠BAC: ∠BAM = ∠MAC
];

const baseAngles = rel("eqangle", ["M", "B", "C", "M", "C", "B"]); // ∠MBC = ∠MCB
const goal = rel("cong", ["M", "B", "M", "C"]); // MB = MC

export const arc_midpoint_lemma: ResearchProblem = {
  id: "arc_midpoint_lemma",
  source: "Classical — arc-midpoint / incenter (trillium) lemma",
  statement:
    "The bisector of ∠BAC meets the circumcircle of triangle ABC again at M " +
    "(midpoint of arc BC not containing A). Prove MB = MC.",
  coords,
  given,
  goal,
  steps: [
    {
      fact: baseAngles,
      premises: given,
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠MBC = ∠MCB: inscribed angles give ∠MBC = ∠MAC and ∠MCB = ∠MAB, and the " +
        "bisector gives ∠MAB = ∠MAC.",
    },
    {
      fact: goal,
      premises: [baseAngles],
      expectRule: "isosceles: equal base angles ⇒ equal sides",
      humanReadable:
        "MB = MC: triangle MBC has equal base angles ∠MBC = ∠MCB, hence equal legs.",
    },
  ],
  exercises: [],
};
