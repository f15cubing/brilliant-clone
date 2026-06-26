/**
 * PROBLEM — IMO Shortlist 2010 G1 (proposed by Christopher Bradley, United
 * Kingdom).
 *
 * Source: 51st IMO 2010 Shortlist, Geometry Problem G1.
 *
 * Statement:
 *   Let ABC be an acute triangle with D, E, F the feet of the altitudes lying
 *   on BC, CA, AB respectively. One of the intersection points of the line EF
 *   and the circumcircle is P. The lines BP and DF meet at Q. Prove AP = AQ.
 *
 * WHICH PROOF WE ENCODE — the official "Solution 1" angle chase (the AQPF
 * cyclic-quadrilateral solution). Writing γ = ∠BCA:
 *
 *   1.  ∠APQ = ∠ACB.
 *         Q lies on line BP, so ∠APQ = ∠APB; and on the circumcircle (A,B,C,P)
 *         the inscribed angle ∠APB equals ∠ACB (chord AB).
 *   2.  ∠AFQ = ∠ACB.
 *         Q lies on line DF, so ∠AFQ = ∠AFD; on the pedal circle (A,F,D,C)
 *         (right angles ∠AFC = ∠ADC = 90°) the inscribed angle ∠AFD equals
 *         ∠ACD, and D on BC gives ∠ACD = ∠ACB.
 *   3.  ∠APQ = ∠AFQ        (transitivity of 1 and 2).
 *   4.  A, P, F, Q concyclic — converse of the inscribed angle: P and F see the
 *         segment AQ under equal angles, so they lie on a circle through A, Q.
 *   5.  ∠AQP = ∠ACB.
 *         On circle (A,P,F,Q) the inscribed angle ∠AQP equals ∠AFP; F on AB and
 *         P on EF turn ∠AFP into ∠BFE, and on the pedal circle (B,C,E,F) that
 *         equals ∠BCE = ∠BCA.
 *   6.  ∠APQ = ∠AQP        (transitivity of 1 and 5): triangle APQ has equal
 *         base angles.
 *   7.  AP = AQ            (isosceles: equal base angles ⇒ equal sides).
 *
 * HOW IT MAPS ONTO THE ENGINE
 *   step 1  eqangle(A,P,Q, A,C,B)   "algebraic angle-chase"   [cyclic(A,B,C,P), coll(B,P,Q)]
 *   step 2  eqangle(A,F,Q, A,C,B)   "algebraic angle-chase"   [cyclic(A,F,D,C), coll(D,F,Q), coll(B,D,C)]
 *   step 3  eqangle(A,P,Q, A,F,Q)   "algebraic angle-chase"   [step1, step2]
 *   step 4  cyclic(A,P,F,Q)         "converse of inscribed angle"  [step3]
 *   step 5  eqangle(A,Q,P, A,C,B)   "algebraic angle-chase"   [cyclic(A,P,F,Q),
 *                                       coll(A,F,B), coll(E,F,P), cyclic(B,C,E,F), coll(C,E,A)]
 *   step 6  eqangle(A,P,Q, A,Q,P)   "algebraic angle-chase"   [step1, step5]
 *   step 7  cong(A,P,A,Q)           "isosceles: equal base angles ⇒ equal sides"  [step6]
 *
 * Every step is replay-verified through the research harness, and every cited
 * premise is load-bearing (the verifier's minimality check passes). The only
 * non-AR rule is the shipped `converse_inscribed` (step 4) and the shipped
 * `isosceles` (step 7) — everything else is the directed-angle table.
 *
 * COORDINATES — a faithful generic realization built by construction: the
 * circumcircle is the unit circle with A, B, C at 110°, 205°, 340° (acute,
 * scalene: ∠A = 67.5°, ∠B = 65°, ∠C = 47.5°). D, E, F are the feet of the
 * altitudes; P is the intersection of line EF with the circumcircle taken so the
 * configuration is the one in Solution 1's Case 1; Q = BP ∩ DF. Every given and
 * step fact is checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { rel } from "@/lib/freeplay/dsl";
import type { ResearchProblem } from "./types";

// ---- construction helpers (plain geometry, faithful to the statement) --------

const deg = (d: number): number => (d * Math.PI) / 180;
const onCircle = (d: number): V => [Math.cos(deg(d)), Math.sin(deg(d))];
const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];
const cross = (p: V, q: V): number => p[0] * q[1] - p[1] * q[0];

/** Foot of the perpendicular from P onto line UW. */
function foot(P: V, U: V, W: V): V {
  const d = sub(W, U);
  const t = dot(sub(P, U), d) / dot(d, d);
  return add(U, mul(d, t));
}

/** Intersections of the line through `p` with direction `dir` and the unit circle. */
function lineUnitCircle(p: V, dir: V): V[] {
  const a = dot(dir, dir);
  const b = 2 * dot(p, dir);
  const c = dot(p, p) - 1;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  return [add(p, mul(dir, (-b + sq) / (2 * a))), add(p, mul(dir, (-b - sq) / (2 * a)))];
}

/** Intersection of line AB with line CD. */
function meet(a: V, b: V, c: V, d: V): V {
  const r = sub(b, a);
  const s = sub(d, c);
  const t = cross(sub(c, a), s) / cross(r, s);
  return add(a, mul(r, t));
}

const A = onCircle(110);
const B = onCircle(205);
const C = onCircle(340);
const D = foot(A, B, C); // foot of the altitude from A on BC
const E = foot(B, C, A); // foot of the altitude from B on CA
const F = foot(C, A, B); // foot of the altitude from C on AB
const P = lineUnitCircle(E, sub(F, E))[0]; // EF ∩ circumcircle (Solution 1 Case 1)
const Q = meet(B, P, D, F); // BP ∩ DF

const coords: Coords = { A, B, C, D, E, F, P, Q };

// ---- givens / goal / proof --------------------------------------------------

const given = [
  // The circumcircle of ABC carries P.
  rel("cyclic", ["A", "B", "C", "P"]),
  // Feet of the altitudes: D on BC, E on CA, F on AB, with the right angles.
  rel("coll", ["B", "D", "C"]),
  rel("coll", ["C", "E", "A"]),
  rel("coll", ["A", "F", "B"]),
  rel("perp", ["A", "D", "B", "C"]),
  rel("perp", ["B", "E", "C", "A"]),
  rel("perp", ["C", "F", "A", "B"]),
  // Pedal circles from those right angles: (A,F,D,C) since ∠AFC = ∠ADC = 90°,
  // and (B,C,E,F) since ∠BEC = ∠BFC = 90°.
  rel("cyclic", ["A", "F", "D", "C"]),
  rel("cyclic", ["B", "C", "E", "F"]),
  // P on line EF; Q on line BP and on line DF.
  rel("coll", ["E", "F", "P"]),
  rel("coll", ["B", "P", "Q"]),
  rel("coll", ["D", "F", "Q"]),
];

const eqAPQ_ACB = rel("eqangle", ["A", "P", "Q", "A", "C", "B"]); // ∠APQ = ∠ACB
const eqAFQ_ACB = rel("eqangle", ["A", "F", "Q", "A", "C", "B"]); // ∠AFQ = ∠ACB
const eqAPQ_AFQ = rel("eqangle", ["A", "P", "Q", "A", "F", "Q"]); // ∠APQ = ∠AFQ
const cycAPFQ = rel("cyclic", ["A", "P", "F", "Q"]); // A,P,F,Q concyclic
const eqAQP_ACB = rel("eqangle", ["A", "Q", "P", "A", "C", "B"]); // ∠AQP = ∠ACB
const baseAngles = rel("eqangle", ["A", "P", "Q", "A", "Q", "P"]); // ∠APQ = ∠AQP
const goal = rel("cong", ["A", "P", "A", "Q"]); // AP = AQ

export const imo_shortlist_2010_g1: ResearchProblem = {
  id: "imo_shortlist_2010_g1",
  source: "IMO Shortlist 2010 G1 (proposed by United Kingdom)",
  statement:
    "Let ABC be an acute triangle with D, E, F the feet of the altitudes on " +
    "BC, CA, AB. P is an intersection of line EF with the circumcircle, and " +
    "Q = BP ∩ DF. Prove AP = AQ.",
  coords,
  given,
  goal,
  steps: [
    {
      fact: eqAPQ_ACB,
      premises: [rel("cyclic", ["A", "B", "C", "P"]), rel("coll", ["B", "P", "Q"])],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠APQ = ∠ACB: Q is on line BP, so ∠APQ = ∠APB, and on the circumcircle " +
        "(A,B,C,P) the inscribed angle ∠APB on chord AB equals ∠ACB.",
    },
    {
      fact: eqAFQ_ACB,
      premises: [
        rel("cyclic", ["A", "F", "D", "C"]),
        rel("coll", ["D", "F", "Q"]),
        rel("coll", ["B", "D", "C"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠AFQ = ∠ACB: Q is on line DF, so ∠AFQ = ∠AFD; on the pedal circle " +
        "(A,F,D,C) the inscribed angle ∠AFD equals ∠ACD, and D on BC gives " +
        "∠ACD = ∠ACB.",
    },
    {
      fact: eqAPQ_AFQ,
      premises: [eqAPQ_ACB, eqAFQ_ACB],
      expectRule: "algebraic angle-chase",
      humanReadable: "∠APQ = ∠AFQ, by transitivity of the previous two equalities.",
    },
    {
      fact: cycAPFQ,
      premises: [eqAPQ_AFQ],
      expectRule: "converse of inscribed angle",
      humanReadable:
        "A, P, F, Q are concyclic: P and F see segment AQ under equal angles " +
        "(∠APQ = ∠AFQ), so they lie on one circle through A and Q.",
    },
    {
      fact: eqAQP_ACB,
      premises: [
        cycAPFQ,
        rel("coll", ["A", "F", "B"]),
        rel("coll", ["E", "F", "P"]),
        rel("cyclic", ["B", "C", "E", "F"]),
        rel("coll", ["C", "E", "A"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠AQP = ∠ACB: on circle (A,P,F,Q) ∠AQP = ∠AFP; F on AB and P on EF make " +
        "∠AFP = ∠BFE, and on the pedal circle (B,C,E,F) ∠BFE = ∠BCE = ∠BCA.",
    },
    {
      fact: baseAngles,
      premises: [eqAPQ_ACB, eqAQP_ACB],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠APQ = ∠AQP: both equal ∠ACB, so triangle APQ has equal base angles.",
    },
    {
      fact: goal,
      premises: [baseAngles],
      expectRule: "isosceles: equal base angles ⇒ equal sides",
      humanReadable:
        "AP = AQ: triangle APQ has equal base angles ∠APQ = ∠AQP, hence equal " +
        "legs AP and AQ.",
    },
  ],
  exercises: [],
};
