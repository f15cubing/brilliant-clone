/**
 * PROBLEM — JBMO Shortlist 2015 G1 (proposed by Montenegro).
 *
 * Source: Junior Balkan Mathematical Olympiad 2015 Shortlist, Geometry G1.
 *
 * Statement:
 *   Triangle ABC is inscribed in a circle, and the tangent t to the circle at the
 *   vertex C is drawn. A line p parallel to t meets the lines BC and AC at the
 *   points D and E, respectively. Prove that A, B, D, E lie on one circle.
 *
 * WHICH PROOF WE ENCODE — the tangent-chord angle chase.
 *
 *   1.  ∠BAE = ∠BDE.
 *         The tangent–chord angle between t and chord CB equals the inscribed
 *         angle ∠BAC (tangent–chord = inscribed angle, which the engine gets from
 *         the circle's equal radii OA = OB = OC together with t ⟂ OC). Transport
 *         it along p ∥ t and along the lines CA (through E) and CB (through D):
 *         ∠BAE (= ∠BAC, E on line CA) equals ∠BDE (the copy of the tangent–chord
 *         angle cut off by p at D).
 *   2.  A, B, D, E concyclic — converse of the inscribed angle: A and D see the
 *         segment BE under equal angles, so they lie on one circle with B and E.
 *
 * HOW IT MAPS ONTO THE ENGINE
 *   step 1  eqangle(B,A,E, B,D,E)  "algebraic angle-chase"
 *             [cong(O,A,O,B), cong(O,B,O,C), cong(O,A,O,C),
 *              perp(O,C,C,T), coll(B,C,D), coll(A,C,E), para(D,E,C,T)]
 *   step 2  cyclic(A,B,D,E)        "converse of inscribed angle"  [step1]
 *
 * The tangent is encoded faithfully as perp(O,C,C,T): O is the circumcenter
 * (cong(O,A,O,B) = cong(O,B,O,C) = cong(O,A,O,C)), T is a point on the tangent at
 * C, and the tangent is perpendicular to the radius OC. Every step is replay-
 * verified through the research harness, and in step 1 all seven cited premises
 * are load-bearing (the verifier's minimality check passes). The non-AR rule is
 * the shipped `converse_inscribed` (step 2); the tangent-chord identity is the AR
 * table (step 1), driven by the equal radii and the perpendicular.
 *
 * COORDINATES — a faithful generic realization. The circumcircle is the unit
 * circle, O = (0,0); A, B, C sit at 130°, 210°, 0° (scalene). The tangent at
 * C = (1,0) is the vertical line x = 1, so T = (1,1) is a tangent point. The
 * parallel line p is the vertical line x = 1.6, meeting line CB at D and line CA
 * at E (both beyond C on the respective lines). Every given and step fact is
 * checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { rel } from "@/lib/freeplay/dsl";
import type { ResearchProblem } from "./types";

const deg = (d: number): V => [Math.cos((d * Math.PI) / 180), Math.sin((d * Math.PI) / 180)];
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const cross = (p: V, q: V): number => p[0] * q[1] - p[1] * q[0];

/** Intersection of line ab with line cd. */
function meet(a: V, b: V, c: V, d: V): V {
  const r = sub(b, a);
  const s = sub(d, c);
  const t = cross(sub(c, a), s) / cross(r, s);
  return add(a, mul(r, t));
}

const O: V = [0, 0];
const A = deg(130);
const B = deg(210);
const C: V = [1, 0]; // tangent at C is the vertical line x = 1
const T: V = [1, 1]; // a point on the tangent at C
const PK = 1.6; // the parallel line p: x = 1.6
const D = meet([PK, -5], [PK, 5], B, C); // p ∩ line CB
const E = meet([PK, -5], [PK, 5], A, C); // p ∩ line CA

const coords: Coords = { O, A, B, C, T, D, E };

const given = [
  // O is the circumcenter of ABC: equal radii.
  rel("cong", ["O", "A", "O", "B"]),
  rel("cong", ["O", "B", "O", "C"]),
  rel("cong", ["O", "A", "O", "C"]),
  // t is the tangent at C: perpendicular to the radius OC (T on t).
  rel("perp", ["O", "C", "C", "T"]),
  // D on line CB, E on line CA.
  rel("coll", ["B", "C", "D"]),
  rel("coll", ["A", "C", "E"]),
  // p (line DE) is parallel to the tangent t (line CT).
  rel("para", ["D", "E", "C", "T"]),
];

const feeder = rel("eqangle", ["B", "A", "E", "B", "D", "E"]); // ∠BAE = ∠BDE
const goal = rel("cyclic", ["A", "B", "D", "E"]); // A, B, D, E concyclic

export const jbmo_shortlist_2015_g1: ResearchProblem = {
  id: "jbmo_shortlist_2015_g1",
  source: "JBMO Shortlist 2015 G1 (proposed by Montenegro)",
  statement:
    "Triangle ABC is inscribed in a circle; t is the tangent at C. A line p " +
    "parallel to t meets lines BC and AC at D and E. Prove A, B, D, E are concyclic.",
  coords,
  given,
  goal,
  steps: [
    {
      fact: feeder,
      premises: given,
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠BAE = ∠BDE: the tangent-chord angle between t and chord CB equals the " +
        "inscribed angle ∠BAC (from OA = OB = OC and t ⟂ OC); carry it along " +
        "p ∥ t and the lines CA (through E) and CB (through D).",
    },
    {
      fact: goal,
      premises: [feeder],
      expectRule: "converse of inscribed angle",
      humanReadable:
        "A, B, D, E concyclic: A and D see segment BE under equal angles " +
        "(∠BAE = ∠BDE), so they lie on one circle through B and E.",
    },
  ],
  exercises: [],
};
