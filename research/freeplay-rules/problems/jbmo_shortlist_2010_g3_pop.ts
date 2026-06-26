/**
 * PROBLEM — (reduced from) JBMO Shortlist 2010 G3.
 *
 * Source: Junior Balkan Mathematical Olympiad 2010 Shortlist, Geometry G3
 *   (reduced to its load-bearing length lemma).
 *
 * Full G3 statement:
 *   Let ABC be an acute triangle. A circle ω1 passes through B and C and meets the
 *   sides AB and AC at D and E, respectively. Let ω2 be the circumcircle of ADE.
 *   Prove that O1O2 equals the circumradius of ABC.
 *
 * WHAT WE ENCODE — the lemma every solution of G3 turns on: the four points
 * B, C, E, D are concyclic (they lie on ω1), so A is an external point with two
 * secants A–D–B and A–E–C, and the power of A gives
 *
 *   AD · AB = AE · AC,   equivalently   AD/AE = AC/AB.
 *
 * (From this, ADE and ACB are antiparallel/similar, which is exactly the step that
 * powers the O1O2 = R conclusion. The final O1O2 = R needs explicit lengths of
 * centers, which is outside the engine's length subsystem; we therefore reduce to
 * the verifiable power-of-a-point core, per the "(reduced from) …" convention.)
 *
 * HOW IT MAPS ONTO THE ENGINE — a SINGLE deduction in the length subsystem:
 *   eqratio(A,D,A,E,A,C,A,B)   "power of a point"
 *       [cyclic(B,C,D,E), coll(A,D,B), coll(A,E,C)]
 *
 * The shipped `power_of_a_point` LRule recovers A as the point shared by the two
 * collinearities, checks B,C,D,E concyclic and the unsigned power equality
 * |AD|·|AB| = |AE|·|AC| (valid for an EXTERNAL point with two secants), and emits
 * the ratio. Replayed through `researchVerifyL`; every premise is load-bearing.
 *
 * COORDINATES — ω1 is the circle of radius 2 centered at the origin. A = (0, 3.6)
 * sits OUTSIDE ω1; two secants from A (with deliberately different directions, so
 * triangle ABC is scalene) cut ω1 at D (near) & B (far) and at E (near) & C (far),
 * with D strictly between A and B and E strictly between A and C. Every given and
 * step fact is checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, type EqRatio } from "../lengths/dsl";
import type { LResearchProblem } from "./power_of_a_point";

const R = 2;
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];

/** The two intersections of the ray from `A` in direction `dir` with circle (O,R). */
function lineCircle(A: V, dir: V): [V, V] {
  const a = dot(dir, dir);
  const b = 2 * dot(A, dir);
  const c = dot(A, A) - R * R;
  const sq = Math.sqrt(b * b - 4 * a * c);
  const t1 = (-b - sq) / (2 * a); // nearer A (smaller |t| with A outside)
  const t2 = (-b + sq) / (2 * a);
  return [add(A, mul(dir, t1)), add(A, mul(dir, t2))];
}

const A: V = [0, 3.6];
const [D, B] = lineCircle(A, [-1, -3.6]); // secant 1: D near, B far
const [E, C] = lineCircle(A, [1.5, -2.8]); // secant 2: E near, C far

const coords: Coords = { A, B, C, D, E };

const given: Fact[] = [
  rel("cyclic", ["B", "C", "D", "E"]), // ω1 through B, C, D, E
  rel("coll", ["A", "D", "B"]), // secant A–D–B
  rel("coll", ["A", "E", "C"]), // secant A–E–C
];

const goal: EqRatio = eqratio("A", "D", "A", "E", "A", "C", "A", "B"); // AD/AE = AC/AB

export const jbmo_shortlist_2010_g3_pop: LResearchProblem = {
  id: "jbmo_shortlist_2010_g3_pop",
  source: "(reduced from) JBMO Shortlist 2010 G3 — power of a point",
  statement:
    "A circle ω1 through B and C meets sides AB, AC of triangle ABC at D, E. " +
    "Prove AD·AB = AE·AC (equivalently AD/AE = AC/AB).",
  coords,
  given,
  goal,
  steps: [
    {
      fact: goal,
      premises: given,
      expectRule: "power of a point",
      humanReadable:
        "A is an external point with secants A–D–B and A–E–C of the circle " +
        "(B,C,D,E); its power gives AD·AB = AE·AC, i.e. AD/AE = AC/AB.",
    },
  ],
  exercises: ["power_of_a_point"],
};
