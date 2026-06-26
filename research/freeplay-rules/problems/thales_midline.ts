/**
 * PROBLEM — Thales' intercept theorem (the "parallel-line-ratio" lemma).
 *
 * Source: classical Euclidean geometry — Thales' (basic proportionality /
 * intercept) theorem, the side-splitter lemma that underlies countless
 * olympiad ratio chases (e.g. it is the engine behind menelaus/ceva-style
 * length arguments and trapezoid-diagonal lemmas).
 *
 *   Two lines parallel to the base BC of triangle ABC cut the sides of the
 *   apex angle A: the first meets AB at D and AC at E (DE ∥ BC), the second
 *   meets AB at F and AC at G (FG ∥ BC). Then the two parallels divide the
 *   transversals AB and AC in the SAME ratio to each other:
 *
 *        AD / AF = AE / AG.
 *
 * WHY THIS NEEDS THE NEW RULE (load-bearing check).
 * The goal is an `eqratio` — a length/ratio fact that is NOT in the shipped
 * DSL at all, and the angle AR has no length table, so the shipped engine
 * cannot even state the goal, let alone prove it. The proof genuinely needs
 * the basic-proportionality theorem twice (once per parallel cut), then a
 * pure ratio fusion:
 *
 *   Givens: coll(A,D,B), coll(A,F,B)        — D, F on side AB
 *           coll(A,E,C), coll(A,G,C)        — E, G on side AC
 *           para(D,E,B,C), para(F,G,B,C)    — both cuts ∥ base BC
 *
 *   1. eqratio(A,D,A,B,A,E,A,C)   — AD/AB = AE/AC
 *        `thales_basic_proportionality` on the cut DE: apex A, inner D/E,
 *        base B/C, with DE ∥ BC. Reported rule: "basic proportionality theorem".
 *   2. eqratio(A,F,A,B,A,G,A,C)   — AF/AB = AG/AC
 *        `thales_basic_proportionality` on the cut FG (apex A, inner F/G,
 *        base B/C). Reported rule: "basic proportionality theorem".
 *   3. eqratio(A,D,A,F,A,E,A,G)   — AD/AF = AE/AG
 *        The two proportions are FUSED by the length AR: over log-lengths the
 *        goal equals (step 1) − (step 2), since the shared base ratio
 *        logAB / logAC cancels. Reported rule: "algebraic length-chase".
 *
 * So the KEY steps fire `thales_basic_proportionality`, and the ratio fusion
 * is a genuine `LengthAR` deduction (the cancellation of the AB/AC terms).
 *
 * COORDINATES — a faithful, generic (scalene), NON-degenerate realization with
 * exact integer points. Triangle A=(0,0), B=(12,0), C=(4,8) (three distinct
 * side lengths). The first cut is at parameter t=1/4 along the sides
 * (D=(3,0), E=(1,2)); the second at t=3/4 (F=(9,0), G=(3,6)). Equal parameters
 * on the two sides make each cut exactly parallel to BC, and both inner points
 * land strictly between the vertices. Every given/step fact is checked
 * numerically in the companion test.
 */
import type { Coords } from "@/lib/freeplay/check";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, type EqRatio } from "../lengths/dsl";
import type { LResearchProblem } from "./power_of_a_point";

// ---- generic configuration (exact integer coordinates) ----------------------

const A: [number, number] = [0, 0];
const B: [number, number] = [12, 0];
const C: [number, number] = [4, 8];
const D: [number, number] = [3, 0]; // A + (1/4)(B−A)
const E: [number, number] = [1, 2]; // A + (1/4)(C−A)
const F: [number, number] = [9, 0]; // A + (3/4)(B−A)
const G: [number, number] = [3, 6]; // A + (3/4)(C−A)

const coords: Coords = { A, B, C, D, E, F, G };

// ---- givens, goal, proof ----------------------------------------------------

const given: Fact[] = [
  rel("coll", ["A", "D", "B"]),
  rel("coll", ["A", "F", "B"]),
  rel("coll", ["A", "E", "C"]),
  rel("coll", ["A", "G", "C"]),
  rel("para", ["D", "E", "B", "C"]),
  rel("para", ["F", "G", "B", "C"]),
];

// Cut DE premises (apex A, inner D/E, base B/C).
const collADB = rel("coll", ["A", "D", "B"]);
const collAEC = rel("coll", ["A", "E", "C"]);
const paraDEBC = rel("para", ["D", "E", "B", "C"]);
// Cut FG premises.
const collAFB = rel("coll", ["A", "F", "B"]);
const collAGC = rel("coll", ["A", "G", "C"]);
const paraFGBC = rel("para", ["F", "G", "B", "C"]);

const step1: EqRatio = eqratio("A", "D", "A", "B", "A", "E", "A", "C"); // AD/AB = AE/AC
const step2: EqRatio = eqratio("A", "F", "A", "B", "A", "G", "A", "C"); // AF/AB = AG/AC

const goal: EqRatio = eqratio("A", "D", "A", "F", "A", "E", "A", "G"); // AD/AF = AE/AG

export const thales_midline: LResearchProblem = {
  id: "thales_midline",
  source:
    "Classical Euclidean geometry — Thales' intercept (basic proportionality) " +
    "theorem: two lines parallel to a triangle's base cut the sides proportionally",
  statement:
    "In triangle ABC, a line through D∈AB and E∈AC is parallel to BC, and a " +
    "second line through F∈AB and G∈AC is also parallel to BC. Prove " +
    "AD/AF = AE/AG (the two parallels divide the sides AB and AC in the same " +
    "ratio to each other).",
  coords,
  given,
  goal,
  steps: [
    {
      fact: step1,
      premises: [collADB, collAEC, paraDEBC],
      expectRule: "basic proportionality theorem",
      humanReadable:
        "Cut DE ∥ BC splits the apex-A sides proportionally: AD/AB = AE/AC " +
        "(basic proportionality theorem on triangle ABC).",
    },
    {
      fact: step2,
      premises: [collAFB, collAGC, paraFGBC],
      expectRule: "basic proportionality theorem",
      humanReadable:
        "Cut FG ∥ BC splits the same sides proportionally: AF/AB = AG/AC " +
        "(basic proportionality theorem on triangle ABC).",
    },
    {
      fact: goal,
      premises: [step1, step2],
      expectRule: "algebraic length-chase",
      humanReadable:
        "Dividing the two proportions cancels the common AB/AC ratio, leaving " +
        "AD/AF = AE/AG (length AR fuses the two ratio facts).",
    },
  ],
  exercises: ["thales_basic_proportionality"],
};
