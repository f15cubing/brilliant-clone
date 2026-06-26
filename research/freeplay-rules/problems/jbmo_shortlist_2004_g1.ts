/**
 * PROBLEM — JBMO Shortlist 2004 G1.
 *
 * Source: Junior Balkan Mathematical Olympiad 2004 Shortlist, Geometry G1.
 *
 * Statement:
 *   Two circles C1 and C2 intersect at points A and B. A circle C centered at A
 *   meets C1 at M and P and meets C2 at N and Q, with N and Q on opposite sides
 *   of line MP and AB > AM. Prove that ∠MBQ = ∠NBP.
 *
 * WHICH PROOF WE ENCODE — the standard directed-angle solution. Because M, P, N,
 * Q all lie on the circle C centered at A, the segments AM, AP, AN, AQ are equal
 * radii, so triangles AMP and ANQ are isosceles. Together with the two
 * intersecting circles this closes the chase:
 *
 *   1.  ∠AMP = ∠APM           (triangle AMP is isosceles, AM = AP).
 *   2.  ∠ANQ = ∠AQN           (triangle ANQ is isosceles, AN = AQ).
 *   3.  ∠MBQ = ∠NBP.
 *         Split each angle through BA. On C1 = (A,B,M,P) the inscribed angles give
 *         ∠(BM,BA) = ∠(PM,PA) and ∠(BA,BP) = ∠(MA,MP); on C2 = (A,B,N,Q) they give
 *         ∠(BA,BQ) = ∠(NA,NQ) and ∠(BN,BA) = ∠(QN,QA). Hence
 *           ∠MBQ = ∠(PM,PA) + ∠(NA,NQ),   ∠NBP = ∠(QN,QA) + ∠(MA,MP),
 *         and the two isosceles equalities (steps 1–2) collapse the difference to
 *         zero, so ∠MBQ = ∠NBP.
 *
 * HOW IT MAPS ONTO THE ENGINE
 *   step 1  eqangle(A,M,P, A,P,M)  "isosceles: equal sides ⇒ equal base angles"  [cong(A,M,A,P)]
 *   step 2  eqangle(A,N,Q, A,Q,N)  "isosceles: equal sides ⇒ equal base angles"  [cong(A,N,A,Q)]
 *   step 3  eqangle(M,B,Q, N,B,P)  "algebraic angle-chase"
 *             [cyclic(A,B,M,P), cyclic(A,B,N,Q), step1, step2]
 *
 * Every step is replay-verified through the research harness, and in step 3 every
 * one of the four cited premises is load-bearing (the verifier's minimality check
 * passes). The non-AR rules are the shipped `isosceles` (steps 1–2); the final
 * directed-angle identity is the AR table (step 3).
 *
 * COORDINATES — a faithful generic realization. A = (0,0), B = (0,2) so AB = 2.
 * C1 and C2 are circles through A and B with centers (-1.3, 1) and (1.1, 1)
 * (their centers lie on the perpendicular bisector of AB). C is the circle of
 * radius 0.9 < AB = 2 centered at A. M, P = C ∩ C1 and N, Q = C ∩ C2, taken so
 * that N and Q fall on opposite sides of line MP. Every given and step fact is
 * checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { dist } from "@/lib/freeplay/geom";
import { rel } from "@/lib/freeplay/dsl";
import type { ResearchProblem } from "./types";

const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];

/** The two intersection points of circle (c1,r1) and circle (c2,r2). */
function circleCircle(c1: V, r1: number, c2: V, r2: number): [V, V] {
  const d = dist(c1, c2);
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const dir = mul(sub(c2, c1), 1 / d);
  const mid = add(c1, mul(dir, a));
  const perp: V = [-dir[1], dir[0]];
  return [add(mid, mul(perp, h)), sub(mid, mul(perp, h))];
}

const A: V = [0, 0];
const B: V = [0, 2];
const O1: V = [-1.3, 1]; // center of C1 (on perpendicular bisector of AB)
const O2: V = [1.1, 1]; // center of C2
const R1 = dist(O1, A);
const R2 = dist(O2, A);
const rC = 0.9; // radius of C, < AB = 2

const [M, P] = circleCircle(A, rC, O1, R1); // C ∩ C1
const [N, Q] = circleCircle(A, rC, O2, R2); // C ∩ C2

const coords: Coords = { A, B, M, P, N, Q };

const given = [
  // C1 passes through A, B, M, P.
  rel("cyclic", ["A", "B", "M", "P"]),
  // C2 passes through A, B, N, Q.
  rel("cyclic", ["A", "B", "N", "Q"]),
  // M, P, N, Q lie on circle C centered at A: equal radii.
  rel("cong", ["A", "M", "A", "P"]),
  rel("cong", ["A", "N", "A", "Q"]),
];

const baseMP = rel("eqangle", ["A", "M", "P", "A", "P", "M"]); // ∠AMP = ∠APM
const baseNQ = rel("eqangle", ["A", "N", "Q", "A", "Q", "N"]); // ∠ANQ = ∠AQN
const goal = rel("eqangle", ["M", "B", "Q", "N", "B", "P"]); // ∠MBQ = ∠NBP

export const jbmo_shortlist_2004_g1: ResearchProblem = {
  id: "jbmo_shortlist_2004_g1",
  source: "JBMO Shortlist 2004 G1",
  statement:
    "Circles C1, C2 meet at A, B. A circle C centered at A meets C1 at M, P and " +
    "C2 at N, Q (with N, Q on opposite sides of MP and AB > AM). Prove ∠MBQ = ∠NBP.",
  coords,
  given,
  goal,
  steps: [
    {
      fact: baseMP,
      premises: [rel("cong", ["A", "M", "A", "P"])],
      expectRule: "isosceles: equal sides ⇒ equal base angles",
      humanReadable:
        "∠AMP = ∠APM: M and P are on circle C centered at A, so AM = AP and " +
        "triangle AMP is isosceles with equal base angles.",
    },
    {
      fact: baseNQ,
      premises: [rel("cong", ["A", "N", "A", "Q"])],
      expectRule: "isosceles: equal sides ⇒ equal base angles",
      humanReadable:
        "∠ANQ = ∠AQN: N and Q are on circle C centered at A, so AN = AQ and " +
        "triangle ANQ is isosceles with equal base angles.",
    },
    {
      fact: goal,
      premises: [
        rel("cyclic", ["A", "B", "M", "P"]),
        rel("cyclic", ["A", "B", "N", "Q"]),
        baseMP,
        baseNQ,
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠MBQ = ∠NBP: split both angles through BA and rewrite each half with the " +
        "inscribed angles of C1 = (A,B,M,P) and C2 = (A,B,N,Q); the isosceles base-" +
        "angle equalities ∠AMP = ∠APM and ∠ANQ = ∠AQN cancel the difference.",
    },
  ],
  exercises: [],
};
