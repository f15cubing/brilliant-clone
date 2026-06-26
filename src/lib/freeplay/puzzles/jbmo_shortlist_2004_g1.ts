import { COLORS, angleMark, circle, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import { dist, type V } from "@/lib/freeplay/geom";
import type { Puzzle } from "@/lib/freeplay/types";

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

// Faithful generic realization (from the contest configuration). C1 and C2 pass
// through A and B (centers on the perpendicular bisector of AB); C is the circle
// of radius rC < AB centered at A.
const A: V = [0, 0];
const B: V = [0, 2];
const O1: V = [-1.3, 1]; // center of C1
const O2: V = [1.1, 1]; // center of C2
const R1 = dist(O1, A);
const R2 = dist(O2, A);
const rC = 0.9; // radius of C, < AB = 2

const [M, P] = circleCircle(A, rC, O1, R1); // C ∩ C1
const [N, Q] = circleCircle(A, rC, O2, R2); // C ∩ C2

/**
 * JBMO Shortlist 2004 G1 (core).
 *
 * Two circles C1, C2 meet at A, B. A circle C centered at A meets C1 at M, P and
 * C2 at N, Q. Prove ∠MBQ = ∠NBP. M, P, N, Q are equidistant from A (radii of C),
 * so triangles AMP and ANQ are isosceles; an inscribed-angle chase on C1 and C2
 * then collapses the difference.
 */
export const jbmoShortlist2004G1: Puzzle = {
  id: "jbmo_shortlist_2004_g1",
  title: "JBMO SL 2004 G1: ∠MBQ = ∠NBP",
  blurb:
    "JBMO Shortlist 2004 G1. Two circles C1 and C2 intersect at points A and B. " +
    "A circle C centered at A meets C1 at M and P and meets C2 at N and Q, with N " +
    "and Q on opposite sides of line MP and AB > AM. Prove that ∠MBQ = ∠NBP.",
  difficulty: "core",
  coords: { A, B, M, P, N, Q, O1, O2 },
  figure: [
    circle("C1", "O1", "A", { strokeColor: COLORS.BRAND, strokeWidth: 1 }),
    circle("C2", "O2", "A", { strokeColor: COLORS.BRAND, strokeWidth: 1 }),
    circle("C", "A", "M", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    // The common chord / radical axis AB.
    segment("A", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 1.6 }),
    // The four rays from B forming the two angles in the goal.
    segment("B", "M"),
    segment("B", "P"),
    segment("B", "N"),
    segment("B", "Q"),
    // The goal: the two equal angles ∠MBQ and ∠NBP.
    angleMark("M", "B", "Q", { fillColor: COLORS.OK, strokeColor: COLORS.OK }),
    angleMark("N", "B", "P", { fillColor: COLORS.OK, strokeColor: COLORS.OK }),
  ],
  given: [
    rel("cyclic", ["A", "B", "M", "P"]), // C1 through A, B, M, P
    rel("cyclic", ["A", "B", "N", "Q"]), // C2 through A, B, N, Q
    rel("cong", ["A", "M", "A", "P"]), // M, P on circle C centered at A
    rel("cong", ["A", "N", "A", "Q"]), // N, Q on circle C centered at A
  ],
  goal: rel("eqangle", ["M", "B", "Q", "N", "B", "P"]),
  solution: [
    {
      fact: rel("eqangle", ["A", "M", "P", "A", "P", "M"]),
      rule: "isosceles: equal sides ⇒ equal base angles",
      premises: [rel("cong", ["A", "M", "A", "P"])],
      humanReadable:
        "∠AMP = ∠APM: M and P are on circle C centered at A, so AM = AP and " +
        "triangle AMP is isosceles with equal base angles.",
    },
    {
      fact: rel("eqangle", ["A", "N", "Q", "A", "Q", "N"]),
      rule: "isosceles: equal sides ⇒ equal base angles",
      premises: [rel("cong", ["A", "N", "A", "Q"])],
      humanReadable:
        "∠ANQ = ∠AQN: N and Q are on circle C centered at A, so AN = AQ and " +
        "triangle ANQ is isosceles with equal base angles.",
    },
    {
      fact: rel("eqangle", ["M", "B", "Q", "N", "B", "P"]),
      rule: "algebraic angle-chase",
      premises: [
        rel("cyclic", ["A", "B", "M", "P"]),
        rel("cyclic", ["A", "B", "N", "Q"]),
        rel("eqangle", ["A", "M", "P", "A", "P", "M"]),
        rel("eqangle", ["A", "N", "Q", "A", "Q", "N"]),
      ],
      humanReadable:
        "∠MBQ = ∠NBP: split both angles through BA and rewrite each half with the " +
        "inscribed angles of C1 = (A,B,M,P) and C2 = (A,B,N,Q); the isosceles base-" +
        "angle equalities ∠AMP = ∠APM and ∠ANQ = ∠AQN cancel the difference.",
    },
  ],
};
