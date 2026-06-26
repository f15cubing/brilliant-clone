import { angleMark, circle, COLORS, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import type { V } from "@/lib/freeplay/geom";
import { eqratio } from "@/lib/freeplay/lengths/dsl";
import type { Puzzle } from "@/lib/freeplay/types";

/**
 * JBMO Shortlist 2005 G2 — tangent-segment power (difficulty "core").
 *
 * Full G2 statement: let ABC be an acute triangle inscribed in a circle k. The
 * tangent from A to k meets line BC at P; M is the midpoint of AP and R the
 * second intersection of k with line BM; line PR meets k again at S. Prove
 * AP ∥ CS.
 *
 * We ship the load-bearing tangent-power LEMMA every solution of G2 turns on.
 * Because AP is tangent to k at A and M lies on AP, MA is the tangent length
 * from M, and line BM is a secant of k meeting it at B and R. The power of the
 * external point M gives
 *
 *   MA² = MB · MR,   equivalently   MA/MB = MR/MA.
 *
 * (From this, with MA = MP since M is the midpoint of AP, one gets MP² = MB·MR,
 * i.e. MP tangent to circle (BPR) — the step powering the final AP ∥ CS. That
 * last parallel needs the midpoint's factor-2 length identity MA = MP, which the
 * log-length subsystem cannot express; we therefore reduce to the verifiable
 * tangent-power core, per the "(reduced from) …" convention.)
 *
 * Single shipped deduction in the length subsystem:
 *   eqratio(M,A,M,B,M,R,M,A)   "tangent-secant power"
 *       [cong(O,A,O,B), cong(O,A,O,R), perp(O,A,A,M), coll(M,B,R)]
 *
 * COORDINATES — k is the radius-5 circle centred at O. A = (3,4) lies on k; the
 * tangent at A is ⟂ OA, and M sits on that tangent (MA = 9, so M is external). A
 * secant from M cuts k at B (near) and R (far); B,R are genuinely on k and
 * collinear with M. The whole figure is rotated by 0.2 rad so nothing is
 * axis-aligned. Re-verified end-to-end against the shipped verify() in the test.
 */
const RHO = 5;
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];
const TH = 0.2;
const rot = (p: V): V => [
  p[0] * Math.cos(TH) - p[1] * Math.sin(TH),
  p[0] * Math.sin(TH) + p[1] * Math.cos(TH),
];

/** The two intersections of the line through `Q` in direction `dir` with k=(O,RHO). */
function lineCircle(Q: V, dir: V): [V, V] {
  const a = dot(dir, dir);
  const b = 2 * dot(Q, dir);
  const c = dot(Q, Q) - RHO * RHO;
  const sq = Math.sqrt(b * b - 4 * a * c);
  const t1 = (-b - sq) / (2 * a);
  const t2 = (-b + sq) / (2 * a);
  return [add(Q, mul(dir, t1)), add(Q, mul(dir, t2))];
}

const Oraw: V = [0, 0];
const Araw: V = [3, 4]; // on k
const tan: V = [-4 / 5, 3 / 5]; // unit tangent at A (⟂ OA)
const Mraw: V = add(Araw, mul(tan, 9)); // M on the tangent, MA = 9 (external)
// Secant from M toward the circle; B is the near contact, R the far one.
const [Braw, Rraw] = lineCircle(Mraw, [4.2, -9.4]);

const O = rot(Oraw);
const A = rot(Araw);
const M = rot(Mraw);
const B = rot(Braw);
const R = rot(Rraw);

const coords = { O, A, M, B, R };

const congB = rel("cong", ["O", "A", "O", "B"]); // B on k
const congR = rel("cong", ["O", "A", "O", "R"]); // R on k
const tangent = rel("perp", ["O", "A", "A", "M"]); // MA tangent at A (OA ⟂ AM)
const secant = rel("coll", ["M", "B", "R"]); // secant M-B-R
// GOAL — MA/MB = MR/MA (⇔ MA² = MB·MR, the power of the external point M).
const goal = eqratio("M", "A", "M", "B", "M", "R", "M", "A");

export const jbmo_shortlist_2005_g2: Puzzle = {
  id: "jbmo-shortlist-2005-g2",
  title: "JBMO Shortlist 2005 G2: tangent-segment power",
  blurb:
    "JBMO Shortlist 2005, Geometry G2 (reduced to its load-bearing tangent " +
    "lemma). AP is tangent to circle k (centre O) at A, and M lies on AP (the " +
    "midpoint of AP in the full problem); line BM meets k a second time at R. " +
    "Prove MA² = MB·MR (equivalently MA/MB = MR/MA).",
  difficulty: "core",
  coords,
  figure: [
    // The circle k (A, B, R lie on it) drawn through A about its centre O.
    circle("k", "O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 1.5 }),
    // The radius OA: the tangent MA is perpendicular to it at A.
    segment("O", "A", { strokeColor: COLORS.WRONG, dash: 2, strokeWidth: 1.5 }),
    // The right angle at A marking the tangency OA ⟂ AM.
    angleMark("O", "A", "M", { radius: 0.55 }),
    // The secant M–B–R (full length MR in accent; the near piece MB on top).
    segment("M", "R", { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 }),
    segment("M", "B", { strokeColor: COLORS.WRONG, strokeWidth: 3 }),
    // GOAL: the tangent length MA (its square equals MB·MR), highlighted last.
    segment("M", "A", { strokeColor: COLORS.OK, strokeWidth: 3.5 }),
  ],
  given: [congB, congR, tangent, secant],
  goal,
  solutionReachesGoal: true,
  solution: [
    {
      fact: goal,
      rule: "tangent-secant power",
      premises: [congB, congR, tangent, secant],
      humanReadable:
        "MA is the tangent length from the external point M (MA ⟂ OA), and " +
        "M–B–R is a secant of k; the power of M gives MA² = MB·MR, i.e. " +
        "MA/MB = MR/MA.",
    },
  ],
};
