/**
 * PROBLEM — IMO 2018, Problem 1.
 *
 * Source: International Mathematical Olympiad 2018, Problem 1 (proposed by
 *   Silouanos Brazitikos, Vangelis Psyxas, Michael Sarantis, Greece).
 *
 * Statement:
 *   Let Γ be the circumcircle of acute triangle ABC. Points D and E lie on
 *   segments AB and AC respectively such that AD = AE. The perpendicular
 *   bisectors of BD and CE intersect the minor arcs AB and AC of Γ at points F
 *   and G respectively. Prove that lines DE and FG are parallel (or are the same
 *   line).
 *
 * WHICH PROOF WE ENCODE — the "angle-chase + Reim" solution (IMO Shortlist
 * second solution). Let FD and GE meet Γ again at X and Y. The crux:
 *
 *     ∠AXD = ∠AXF      (X, D, F collinear: lines XD and XF coincide)
 *           = ∠ABF      (inscribed angles on chord AF, apexes X and B)
 *           = ∠DBF      (D on AB: lines BD and BA coincide)
 *           = ∠FDB      (isosceles △FBD, since FB = FD)
 *           = ∠XDA      (X,D,F and A,D,B collinear: both lines coincide)
 *
 *   so △AXD is isosceles with AX = AD; analogously AY = AE. With AD = AE this
 *   gives AX = AD = AE = AY, i.e. D, E, X, Y lie on a circle centred at A.
 *   Finally Reim's theorem on circle (DEXY) and circle Γ (FGXY), with the two
 *   secants X–D–F and Y–E–G, yields DE ∥ FG.
 *
 * HOW IT MAPS ONTO THE ENGINE
 *   step 1  eqangle(A,X,D, A,D,X)   the boxed directed-angle chase
 *             cited: cyclic(A,B,F,X) [inscribed_angle], coll(F,D,X),
 *                    coll(A,D,B), cong(F,B,F,D) [isosceles_converse]
 *             → "algebraic angle-chase" (inscribed_angle + isosceles_converse
 *               DD facts, closed by the AR directed-angle table)
 *   step 2  cong(A,X,A,D)           shipped `isosceles` (equal base angles ⇒ sides)
 *   step 3  eqangle(A,Y,E, A,E,Y)   mirror of step 1 on the C-side
 *   step 4  cong(A,Y,A,E)           shipped `isosceles`
 *   step 5  cyclic(D,E,X,Y)         `concyclic_equal_radii` (Batch 7)
 *   step 6  para(D,E,F,G)           Reim's theorem (AR), once (DEXY) is known
 *
 * STATUS — SOLVED END-TO-END (Batch 7).
 *   This problem originally stalled at step 5: from AX = AD, AY = AE, AD = AE
 *   (three `cong` facts sharing centre A) the canonical finish needs
 *   cyclic(D,E,X,Y) — "points equidistant from a common centre are concyclic".
 *   No shipped rule made a `cyclic` from `cong`s (`converse_inscribed` needs
 *   equal-ANGLE data; the AR table is angles-only). The research rule
 *   `concyclic_equal_radii` (the circle-producing dual of `perp_bisector`)
 *   closes exactly this step, after which Reim's theorem (AR) finishes DE ∥ FG.
 *   All six steps now verify and the goal is reached.
 *
 * COORDINATES — a faithful generic realization built by construction (not pasted
 * decimals): Γ is the unit circle; A,B,C at 102°,213°,331° (scalene, acute:
 * ∠A≈59°, ∠B≈65.5°, ∠C≈55.5°); D,E placed on AB,AC at equal distance 0.55 from
 * A; F,G the perpendicular-bisector intersections on the correct minor arcs;
 * X,Y the second intersections of FD,GE with Γ. Every given and step fact is
 * checked numerically in the test.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { V } from "@/lib/freeplay/geom";
import { rel } from "@/lib/freeplay/dsl";
import type { ResearchProblem } from "./types";

// ---- construction helpers (plain geometry, faithful to the statement) --------

const R = 1;
const deg = (d: number): number => (d * Math.PI) / 180;
const onCircle = (d: number): V => [R * Math.cos(deg(d)), R * Math.sin(deg(d))];

const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const add = (p: V, q: V): V => [p[0] + q[0], p[1] + q[1]];
const mul = (p: V, s: number): V => [p[0] * s, p[1] * s];
const dot = (p: V, q: V): number => p[0] * q[0] + p[1] * q[1];
const norm = (p: V): number => Math.hypot(p[0], p[1]);
const dist = (p: V, q: V): number => norm(sub(p, q));
const unit = (p: V): V => mul(p, 1 / norm(p));
const ang = (p: V): number => ((Math.atan2(p[1], p[0]) * 180) / Math.PI + 360) % 360;

/** Up to two intersections of the line through `p` with direction `dir` and Γ. */
function lineCircle(p: V, dir: V): V[] {
  const d = unit(dir);
  const b = 2 * dot(p, d);
  const c = dot(p, p) - R * R;
  const disc = b * b - 4 * c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  return [add(p, mul(d, (-b + sq) / 2)), add(p, mul(d, (-b - sq) / 2))];
}

/** Where the perpendicular bisector of UV meets Γ (0–2 points). */
function perpBisectorCircle(U: V, V_: V): V[] {
  const mid = mul(add(U, V_), 0.5);
  const uv = sub(V_, U);
  return lineCircle(mid, [-uv[1], uv[0]]);
}

/** Pick the candidate on the SHORT arc from `p1deg` to `p2deg` (the minor arc). */
function pickArc(cands: V[], p1deg: number, p2deg: number): V {
  let lo = ((p1deg % 360) + 360) % 360;
  const hi = ((p2deg % 360) + 360) % 360;
  let len = ((hi - lo) + 360) % 360;
  if (len > 180) {
    lo = hi;
    len = 360 - len;
  }
  const inShort = (x: number) => ((x - lo + 360) % 360) <= len + 1e-9;
  return cands.find((P) => inShort(ang(P))) ?? cands[0];
}

const aDeg = 102, bDeg = 213, cDeg = 331, tAD = 0.55;

const A = onCircle(aDeg);
const B = onCircle(bDeg);
const C = onCircle(cDeg);
const D = add(A, mul(unit(sub(B, A)), tAD)); // on AB, AD = 0.55
const E = add(A, mul(unit(sub(C, A)), tAD)); // on AC, AE = 0.55
const F = pickArc(perpBisectorCircle(B, D), aDeg, bDeg); // perp bis BD ∩ minor arc AB
const G = pickArc(perpBisectorCircle(C, E), aDeg, cDeg); // perp bis CE ∩ minor arc AC
const X = lineCircle(F, sub(D, F)).filter((P) => dist(P, F) > 1e-6)[0]; // FD ∩ Γ again
const Y = lineCircle(G, sub(E, G)).filter((P) => dist(P, G) > 1e-6)[0]; // GE ∩ Γ again

const coords: Coords = { A, B, C, D, E, F, G, X, Y };

// ---- givens / goal / proof --------------------------------------------------

const given = [
  rel("cong", ["A", "D", "A", "E"]), // AD = AE
  rel("cong", ["F", "B", "F", "D"]), // F on perpendicular bisector of BD
  rel("cong", ["G", "C", "G", "E"]), // G on perpendicular bisector of CE
  rel("coll", ["A", "D", "B"]), // D on segment AB
  rel("coll", ["A", "E", "C"]), // E on segment AC
  rel("coll", ["F", "D", "X"]), // X = second meet of line FD with Γ
  rel("coll", ["G", "E", "Y"]), // Y = second meet of line GE with Γ
  rel("cyclic", ["A", "B", "F", "X"]), // A,B,F,X on Γ
  rel("cyclic", ["A", "C", "G", "Y"]), // A,C,G,Y on Γ
  rel("cyclic", ["F", "G", "X", "Y"]), // F,G,X,Y on Γ
];

const eqAXD = rel("eqangle", ["A", "X", "D", "A", "D", "X"]); // ∠AXD = ∠ADX
const eqAYE = rel("eqangle", ["A", "Y", "E", "A", "E", "Y"]); // ∠AYE = ∠AEY
const congAXAD = rel("cong", ["A", "X", "A", "D"]); // AX = AD
const congAYAE = rel("cong", ["A", "Y", "A", "E"]); // AY = AE
const cyclicDEXY = rel("cyclic", ["D", "E", "X", "Y"]); // D,E,X,Y concyclic (centre A)
const goal = rel("para", ["D", "E", "F", "G"]); // DE ∥ FG

export const imo_2018_p1: ResearchProblem = {
  id: "imo_2018_p1",
  source: "IMO 2018, Problem 1",
  statement:
    "Γ is the circumcircle of acute triangle ABC; D on AB and E on AC with " +
    "AD = AE. The perpendicular bisectors of BD and CE meet minor arcs AB and " +
    "AC of Γ at F and G. Prove DE ∥ FG. (Auxiliary: X = FD∩Γ, Y = GE∩Γ.)",
  coords,
  given,
  goal,
  steps: [
    {
      fact: eqAXD,
      premises: [
        rel("cyclic", ["A", "B", "F", "X"]),
        rel("coll", ["F", "D", "X"]),
        rel("coll", ["A", "D", "B"]),
        rel("cong", ["F", "B", "F", "D"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "∠AXD = ∠AXF = ∠ABF = ∠DBF = ∠FDB = ∠XDA: inscribed angle on chord AF " +
        "(apexes X,B), the two collinearities XDF and ADB, and the isosceles " +
        "△FBD (FB = FD), chained by the directed-angle table.",
    },
    {
      fact: congAXAD,
      premises: [eqAXD],
      expectRule: "isosceles: equal base angles ⇒ equal sides",
      humanReadable:
        "△AXD has equal base angles ∠AXD = ∠ADX, hence equal legs AX = AD.",
    },
    {
      fact: eqAYE,
      premises: [
        rel("cyclic", ["A", "C", "G", "Y"]),
        rel("coll", ["G", "E", "Y"]),
        rel("coll", ["A", "E", "C"]),
        rel("cong", ["G", "C", "G", "E"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "Mirror of step 1 on the C-side: ∠AYE = ∠AYG = ∠ACG = ∠ECG = ∠GEC = " +
        "∠YEA, via inscribed angle on chord AG and the isosceles △GCE (GC = GE).",
    },
    {
      fact: congAYAE,
      premises: [eqAYE],
      expectRule: "isosceles: equal base angles ⇒ equal sides",
      humanReadable:
        "△AYE has equal base angles ∠AYE = ∠AEY, hence equal legs AY = AE.",
    },
    {
      // Closed by the Batch 7 rule `concyclic_equal_radii`: four points
      // equidistant from A (AX = AD = AE = AY) are concyclic.
      fact: cyclicDEXY,
      premises: [congAXAD, congAYAE, rel("cong", ["A", "D", "A", "E"])],
      expectRule: "equal radii ⇒ concyclic",
      humanReadable:
        "AX = AD = AE = AY, so D, E, X, Y lie on one circle centred at A " +
        "(equal radii ⇒ concyclic).",
    },
    {
      // Reim's theorem via AR, finishing the problem now that cyclic(D,E,X,Y)
      // is established by the previous step.
      fact: goal,
      premises: [
        cyclicDEXY,
        rel("cyclic", ["F", "G", "X", "Y"]),
        rel("coll", ["F", "D", "X"]),
        rel("coll", ["G", "E", "Y"]),
      ],
      expectRule: "algebraic angle-chase",
      humanReadable:
        "Reim on circle (DEXY) and Γ (FGXY) with secants X–D–F and Y–E–G: " +
        "DE ∥ FG.",
    },
  ],
  exercises: ["isosceles_converse"],
};
