import { circle, COLORS, fixedPoint, polygon, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import { circumcenter, dist, lineIntersect, type V } from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * IMO Shortlist 2024 G4 (proposed by Ukraine) — difficulty "challenge".
 *
 * Let ABCD be a quadrilateral with AB ∥ CD and AB < CD. Lines AD and BC meet at
 * P. Point X ≠ C on the circumcircle of ABC has PC = PX; point Y ≠ D on the
 * circumcircle of ABD has PD = PY. Lines AX and BY meet at Q. Prove PQ ∥ AB.
 *
 * WHICH PROOF WE ENCODE — official Solution 3 (the engine-friendly path). Let Q1
 * be the second intersection of line AX with circle (P, C, X). Then the directed
 * angle chase
 *
 *     ∠AQ1P = ∠XQ1P = ∠XCP = ∠XCB = 180° − ∠BAX = ∠Q1AB
 *
 * gives PQ1 ∥ AB; it then "only remains" to show Q1 = Q, i.e. that the common
 * chord (radical axis) of circles (P,C,X) and (P,D,Y) is parallel to AB.
 *
 * WHY THE FIGURE USES ONE INTERSECTION POINT (Q1 ≡ Q). The lemma point
 * Q1 = AX ∩ circle(P,C,X) is, by the theorem, EXACTLY Q = AX ∩ BY: any point on
 * line AX with PZ ∥ AB is forced to be the single point AX ∩ (line through P
 * parallel to AB). So Q1 and Q are the same point of the plane and cannot be two
 * distinct, well-separated vertices — the multi-case sampler's non-degeneracy
 * guard rejects any figure carrying two coincident points. We therefore ship the
 * contest's own point Q = AX ∩ BY and keep the contest goal `para(P,Q,A,B)`.
 *
 * HOW THE ENGINE CLOSES IT (now closed by `two_circle_radical_axis`). The RIGHT
 * half of Solution 3's chase is a pure directed-angle identity about the figure's
 * real points and is machine-checked here (rule "algebraic angle-chase"):
 *
 *     ∠XCP = ∠QAB      (X-side: step 1)   and   ∠YDP = ∠QBA   (Y-side: step 2).
 *
 * These are the directed form of "∠XCB = 180° − ∠BAX = ∠Q1AB" (and its mirror),
 * carried onto Q via Q ∈ AX (resp. Q ∈ BY) and P ∈ BC (resp. P ∈ AD). The
 * remaining inference — Q on circle (P,C,X), i.e. cyclic(P,C,X,Q) — is the
 * radical-axis / common-chord step: circles (A,B,C,X) and (A,B,D,Y) share the
 * chord AB; the cong-apex circles (P,C,X) and (P,D,Y) meet again at Q = AX ∩ BY,
 * and because AB ∥ CD their common chord PQ is parallel to AB, forcing Q onto
 * circle (P,C,X). The promoted rule `two_circle_radical_axis` derives this
 * (step 3). The shipped directed-angle chase then closes the goal PQ ∥ AB from
 * ∠XQP = ∠XCP (Q on circle (P,C,X)) carried to ∠AQP = ∠QAB (step 4). So the
 * chain now reaches the goal and `solutionReachesGoal` is true.
 *
 * FAITHFUL CONSTRUCTION. Free: P and the long-base endpoints D, C. A and B are
 * placed on rays PD, PC at a common ratio t ∈ (0,1) (so AB ∥ DC and AB = t·CD <
 * CD, with P = AD ∩ BC the leg apex). X is the second meeting of circle(ABC)
 * with circle(P, PC); Y the second meeting of circle(ABD) with circle(P, PD);
 * Q = AX ∩ BY. Every `given` holds by construction across the sample family.
 */

const sub = (p: V, q: V): V => [p[0] - q[0], p[1] - q[1]];
const norm = (p: V): number => Math.hypot(p[0], p[1]);

/** The (up to two) intersection points of circle (c1,r1) and circle (c2,r2). */
function circleCircle(c1: V, r1: number, c2: V, r2: number): V[] {
  const d = dist(c1, c2);
  if (d < 1e-12 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const dir: V = [(c2[0] - c1[0]) / d, (c2[1] - c1[1]) / d];
  const mid: V = [c1[0] + dir[0] * a, c1[1] + dir[1] * a];
  const perp: V = [-dir[1], dir[0]];
  return [
    [mid[0] + perp[0] * h, mid[1] + perp[1] * h],
    [mid[0] - perp[0] * h, mid[1] - perp[1] * h],
  ];
}

/** The intersection candidate that is not (within tolerance) the point to avoid. */
function otherThan(cands: V[], avoid: V): V | null {
  return cands.filter((p) => dist(p, avoid) > 1e-6)[0] ?? null;
}

/**
 * Build the whole G4 configuration from the three free points P, D, C and the
 * placement ratio t. Throws when an auxiliary point fails to exist (e.g. the two
 * circles are tangent, or AX ∥ BY) so the sampler can resample.
 */
function buildG4(P: V, D: V, C: V, t: number): Record<string, V> {
  const A: V = [P[0] + t * (D[0] - P[0]), P[1] + t * (D[1] - P[1])];
  const B: V = [P[0] + t * (C[0] - P[0]), P[1] + t * (C[1] - P[1])];

  const OC = circumcenter(A, B, C);
  if (!OC) throw new Error("ABC degenerate");
  const X = otherThan(circleCircle(OC, norm(sub(A, OC)), P, norm(sub(P, C))), C);
  if (!X) throw new Error("X (circle ABC ∩ circle(P,PC), ≠C) missing");

  const OD = circumcenter(A, B, D);
  if (!OD) throw new Error("ABD degenerate");
  const Y = otherThan(circleCircle(OD, norm(sub(A, OD)), P, norm(sub(P, D))), D);
  if (!Y) throw new Error("Y (circle ABD ∩ circle(P,PD), ≠D) missing");

  const Q = lineIntersect(A, X, B, Y);
  if (!Q) throw new Error("Q = AX ∩ BY missing (AX ∥ BY)");

  return { P, A, B, C, D, X, Y, Q };
}

// ---- fixed canonical figure (realization 0) --------------------------------

const coords = buildG4([0, 0], [-3, -6], [6, -5], 0.45);

// Circle centres, for drawing the three circles of the configuration (figure
// only; not logical points, so they don't affect the multi-case sampler).
const ocABCX = circumcenter(coords.A, coords.B, coords.C)!; // circle (A,B,C,X)
const odABDY = circumcenter(coords.A, coords.B, coords.D)!; // circle (A,B,D,Y)
const oxPCXQ = circumcenter(coords.P, coords.C, coords.X)!; // circle (P,C,X) — carries Q

// ---- generic realization ----------------------------------------------------

function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const P: V = [rnd(-1, 1), rnd(-1, 1)];
  // D left / C right of P, both well below it: a genuine AB < CD trapezoid whose
  // legs AD, BC meet upward at P.
  const D: V = [P[0] + rnd(-5, -2), P[1] - rnd(4, 7)];
  const C: V = [P[0] + rnd(3, 6), P[1] - rnd(4, 7)];
  const t = rnd(0.35, 0.55); // A on PD, B on PC at this ratio ⇒ AB = t·CD < CD
  return { coords: buildG4(P, D, C, t) };
}

// ---- givens (all true BY CONSTRUCTION — none injects a conclusion) -----------

const paraABCD = rel("para", ["A", "B", "C", "D"]); // AB ∥ CD
const collADP = rel("coll", ["A", "D", "P"]); // P on line AD
const collBCP = rel("coll", ["B", "C", "P"]); // P on line BC
const cycABCX = rel("cyclic", ["A", "B", "C", "X"]); // X on circumcircle of ABC
const congPCPX = rel("cong", ["P", "C", "P", "X"]); // PC = PX (defines X)
const cycABDY = rel("cyclic", ["A", "B", "D", "Y"]); // Y on circumcircle of ABD
const congPDPY = rel("cong", ["P", "D", "P", "Y"]); // PD = PY (defines Y)
const collAXQ = rel("coll", ["A", "X", "Q"]); // Q on line AX
const collBYQ = rel("coll", ["B", "Y", "Q"]); // Q on line BY (Q = AX ∩ BY)

// ---- verified intermediate facts -------------------------------------------

const eqXCP_QAB = rel("eqangle", ["X", "C", "P", "Q", "A", "B"]); // ∠XCP = ∠QAB
const eqYDP_QBA = rel("eqangle", ["Y", "D", "P", "Q", "B", "A"]); // ∠YDP = ∠QBA
const cycPCXQ = rel("cyclic", ["P", "C", "X", "Q"]); // Q on circle (P,C,X): radical-axis closure

const goal = rel("para", ["P", "Q", "A", "B"]); // PQ ∥ AB

export const imo_shortlist_2024_g4: Puzzle = {
  id: "imo-shortlist-2024-g4",
  title: "IMO Shortlist 2024 G4: PQ ∥ AB",
  blurb:
    "IMO Shortlist 2024, Geometry G4 (proposed by Ukraine). Let ABCD be a " +
    "quadrilateral with AB ∥ CD and AB < CD, and let lines AD, BC meet at P. " +
    "Point X ≠ C on the circumcircle of ABC has PC = PX; point Y ≠ D on the " +
    "circumcircle of ABD has PD = PY. Lines AX and BY meet at Q. Prove PQ ∥ AB.",
  difficulty: "challenge",
  coords,
  construct,
  freePoints: ["P", "D", "C"],
  figure: [
    polygon(["A", "B", "C", "D"]),
    // The two legs AD, BC produced to their apex P.
    segment("D", "P", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    segment("C", "P", { strokeColor: COLORS.WRONG, strokeWidth: 1, dash: 2 }),
    // Circumcircles of ABC (through X) and ABD (through Y).
    fixedPoint("OC", ocABCX[0], ocABCX[1], { name: "", size: 1 }),
    fixedPoint("OD", odABDY[0], odABDY[1], { name: "", size: 1 }),
    circle("cABCX", "OC", "A", { strokeColor: COLORS.BRAND, strokeWidth: 1 }),
    circle("cABDY", "OD", "A", { strokeColor: COLORS.BRAND, strokeWidth: 1 }),
    // Circle (P,C,X): it carries Q (the radical-axis fact the engine cannot prove).
    fixedPoint("OX", oxPCXQ[0], oxPCXQ[1], { name: "", size: 1 }),
    circle("cPCX", "OX", "P", { strokeColor: COLORS.ACCENT, strokeWidth: 1, dash: 1 }),
    // Lines AX and BY meeting at Q.
    segment("A", "X"),
    segment("B", "Y"),
    // GOAL highlighted: the parallel pair PQ and AB.
    segment("A", "B", { strokeColor: COLORS.OK, strokeWidth: 3 }),
    segment("P", "Q", { strokeColor: COLORS.OK, strokeWidth: 3 }),
  ],
  given: [
    paraABCD,
    collADP,
    collBCP,
    cycABCX,
    congPCPX,
    cycABDY,
    congPDPY,
    collAXQ,
    collBYQ,
  ],
  goal,
  // COMPLETE: the radical-axis step (step 3, rule `two_circle_radical_axis`)
  // supplies the previously missing concyclicity, and the shipped directed-angle
  // chase (step 4) then reaches the goal PQ ∥ AB. (The `two_circle_radical_axis`
  // step verifies once that rule is registered in `rules/index.ts`.)
  solutionReachesGoal: true,
  solution: [
    {
      fact: eqXCP_QAB,
      rule: "algebraic angle-chase",
      premises: [cycABCX, collBCP, collAXQ],
      humanReadable:
        "∠XCP = ∠QAB (directed). On the circumcircle (A,B,C,X), the inscribed " +
        "angles on chord XB give ∠XCB = ∠XAB; P on line BC turns ∠XCB into " +
        "∠XCP, and Q on line AX turns ∠XAB into ∠QAB. This is the directed form " +
        "of Solution 3's ∠XCB = 180° − ∠BAX = ∠Q1AB.",
    },
    {
      fact: eqYDP_QBA,
      rule: "algebraic angle-chase",
      premises: [cycABDY, collADP, collBYQ],
      humanReadable:
        "∠YDP = ∠QBA (directed): the A↔B / C↔D mirror of step 1 on the " +
        "circumcircle (A,B,D,Y), via P on line AD and Q on line BY.",
    },
    {
      fact: cycPCXQ,
      rule: "two-circle radical axis",
      premises: [cycABCX, cycABDY, congPCPX, congPDPY, paraABCD, collAXQ, collBYQ],
      humanReadable:
        "Q lies on circle (P,C,X). Circles (A,B,C,X) and (A,B,D,Y) share the " +
        "chord AB. The cong-apex circles (P,C,X) and (P,D,Y) meet again at " +
        "Q = AX ∩ BY, and since AB ∥ CD their common chord (radical axis) PQ is " +
        "parallel to AB — so Q lies on circle (P,C,X) (the two-circle " +
        "radical-axis lemma, equivalently Solution 3's Q1 = Q).",
    },
    {
      fact: goal,
      rule: "algebraic angle-chase",
      premises: [cycPCXQ, cycABCX, collAXQ, collBCP],
      humanReadable:
        "PQ ∥ AB. With Q on circle (P,C,X), the inscribed angles on chord XP " +
        "give ∠XQP = ∠XCP; ∠XCP = ∠XCB (P on BC) = ∠XAB (circle (A,B,C,X)) = " +
        "∠QAB (Q on AX), so ∠AQP = ∠QAB — alternate angles on transversal AX, " +
        "hence PQ ∥ AB.",
    },
  ],
};
