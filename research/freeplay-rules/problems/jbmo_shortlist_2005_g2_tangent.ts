/**
 * PROBLEM — (reduced from) JBMO Shortlist 2005 G2 (ROM) — tangent-segment power.
 *
 * Source: Junior Balkan Mathematical Olympiad 2005 Shortlist, Geometry G2
 *   (reduced to its load-bearing tangent-power lemma).
 *
 * Full G2 statement:
 *   Let ABC be an acute triangle inscribed in a circle k. The tangent from A to k
 *   meets line BC at P. Let M be the midpoint of AP and R the second intersection
 *   of k with line BM. Line PR meets k again at S (≠ R). Prove that AP ∥ CS.
 *
 * WHAT WE ENCODE — the lemma every solution of G2 turns on. Because AP is tangent
 * to k at A and M lies on AP, the segment MA is the tangent length from M; the
 * line BM is a secant of k meeting it at B and R. The power of M gives
 *
 *   MA² = MB · MR,   equivalently   MA/MB = MR/MA.
 *
 * (From this — together with M the midpoint of AP, so MA = MP — one gets
 * MP² = MB·MR, i.e. MP tangent to the circle (BPR), which is the step that powers
 * the final AP ∥ CS. That last parallel needs the midpoint's factor-2 length
 * identity MA = MP, which the log-length subsystem cannot express without a
 * constant generator; we therefore reduce to the verifiable tangent-power core,
 * per the "(reduced from) …" convention used by `jbmo_shortlist_2010_g3_pop`.)
 *
 * HOW IT MAPS ONTO THE ENGINE — a SINGLE deduction in the length subsystem:
 *   eqratio(M,A,M,B,M,R,M,A)   "tangent-secant power"
 *       [cong(O,A,O,B), cong(O,A,O,R), perp(O,A,A,M), coll(M,B,R)]
 *
 * The new `tangent_secant_power` LRule recovers O (centre), A (tangent point),
 * M (external point) from the `perp`, checks B,R are equidistant-from-O-as-A
 * (the two `cong`s), that MA ⟂ OA (tangent), that M,B,R are collinear with B,R on
 * one ray from M (secant, M external), and that MA² = MB·MR, then emits the ratio.
 * Replayed through `researchVerifyL`; every premise is load-bearing.
 *
 * COORDINATES — k is the circle of radius 5 centred at O. A = (3,4) lies on k; the
 * tangent at A is ⟂ OA, and M sits on that tangent (MA = 9, so M is external). A
 * secant from M cuts k at B (near) and R (far); B,R are genuinely on k and
 * collinear with M. The whole figure is rotated by 0.2 rad so nothing is
 * axis-aligned. Every given and the goal are re-checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { rel, type Fact } from "@/lib/freeplay/dsl";
import { eqratio, type EqRatio } from "../lengths/dsl";
import type { LResearchProblem } from "./power_of_a_point";

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

const coords: Coords = { O, A, M, B, R };

const given: Fact[] = [
  rel("cong", ["O", "A", "O", "B"]), // B on k
  rel("cong", ["O", "A", "O", "R"]), // R on k
  rel("perp", ["O", "A", "A", "M"]), // MA tangent at A (OA ⟂ AM)
  rel("coll", ["M", "B", "R"]), // secant M-B-R
];

const goal: EqRatio = eqratio("M", "A", "M", "B", "M", "R", "M", "A"); // MA/MB = MR/MA

export const jbmo_shortlist_2005_g2_tangent: LResearchProblem = {
  id: "jbmo_shortlist_2005_g2_tangent",
  source: "(reduced from) JBMO Shortlist 2005 G2 — tangent-segment power",
  statement:
    "AP is tangent to circle k (centre O) at A; M lies on AP (the midpoint of AP " +
    "in the full problem); line BM meets k at B and R. Prove MA² = MB·MR " +
    "(equivalently MA/MB = MR/MA).",
  coords,
  given,
  goal,
  steps: [
    {
      fact: goal,
      premises: given,
      expectRule: "tangent-secant power",
      humanReadable:
        "MA is the tangent length from the external point M (MA ⟂ OA), and M-B-R " +
        "is a secant of k; the power of M gives MA² = MB·MR, i.e. MA/MB = MR/MA.",
    },
  ],
  exercises: ["tangent_secant_power"],
};
