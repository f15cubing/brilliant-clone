import { COLORS, circle, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import {
  add,
  circumcenter,
  dist,
  midpoint,
  pointOnCircleAtAngle,
  sameSideOfLine,
  scale,
  sub,
  unit,
  type V,
} from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

// Circumcircle is centered at the origin; scale the unit circle up for a legible
// board. Uniform scaling preserves cyclic / cong / eqangle, so every given,
// goal, and step still holds exactly (asserted in the test).
const R = 4;
const deg = (d: number): V => [
  R * Math.cos((d * Math.PI) / 180),
  R * Math.sin((d * Math.PI) / 180),
];

const A = deg(100);
const B = deg(205);
const C = deg(335);
const M = deg(270); // midpoint of arc BC not containing A
const O: V = [0, 0]; // circumcenter

/**
 * Generic realization: A, B, C on a circle with M placed at the midpoint of the
 * arc BC NOT containing A (its angle is the mean of B's and C's), so AM bisects
 * ∠BAC and the equal chords MB = MC hold by construction. Free: A, B, C.
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const O: V = [rnd(-1, 1), rnd(-1, 1)];
  const r = rnd(2.5, 4.5);
  const aA = rnd(60, 120);
  const aB = rnd(180, 235);
  const aC = rnd(300, 350);
  // Midpoint of arc BC away from A (A is in the top arc; B, C bracket the bottom).
  const aM = (aB + aC) / 2;
  return {
    coords: {
      A: pointOnCircleAtAngle(O, r, aA),
      B: pointOnCircleAtAngle(O, r, aB),
      C: pointOnCircleAtAngle(O, r, aC),
      M: pointOnCircleAtAngle(O, r, aM),
      O,
    },
  };
}

/**
 * Movable form: from the dragged triangle ABC recompute the circumcentre O and
 * M = the midpoint of arc BC NOT containing A (the intersection of the
 * perpendicular bisector of BC with the circumcircle, on the opposite side of
 * line BC from A). So AM stays the bisector of ∠BAC and A,B,C,M stay concyclic.
 */
function constructFrom(free: Coords): Realization {
  const { A, B, C } = free;
  const O = circumcenter(A, B, C);
  if (!O) throw new Error("degenerate triangle (A, B, C collinear)");
  const R = dist(O, A);
  const dir = unit(sub(midpoint(B, C), O)) ?? [0, 1];
  let M = add(O, scale(dir, R));
  if (sameSideOfLine(B, C, A, M)) M = add(O, scale(dir, -R));
  return { coords: { A, B, C, M, O } };
}

/**
 * Arc-midpoint ("trillium") lemma (intro).
 *
 * The bisector of ∠BAC meets the circumcircle of ABC again at M, the midpoint of
 * arc BC not containing A. Prove MB = MC.
 */
export const arcMidpointLemma: Puzzle = {
  id: "arc_midpoint_lemma",
  title: "Arc-midpoint lemma: MB = MC",
  blurb:
    "Classical olympiad lemma (the arc-midpoint / incenter \"trillium\" lemma). " +
    "Triangle ABC is inscribed in a circle, and the bisector of ∠BAC meets the " +
    "circle again at M (the midpoint of arc BC not containing A). Prove MB = MC.",
  difficulty: "intro",
  coords: { A, B, C, M, O },
  construct,
  constructFrom,
  freePoints: ["A", "B", "C"],
  figure: [
    circle("circumcircle", "O", "A"),
    polygon(["A", "B", "C"]),
    // The angle bisector AM (the chord through the arc midpoint).
    segment("A", "M", { strokeColor: COLORS.ACCENT, strokeWidth: 1.6, dash: 2 }),
    // The goal: the two equal chords MB = MC.
    segment("M", "B", { strokeColor: COLORS.OK, strokeWidth: 2.5 }),
    segment("M", "C", { strokeColor: COLORS.OK, strokeWidth: 2.5 }),
  ],
  given: [
    rel("cyclic", ["A", "B", "C", "M"]), // A, B, C, M on the circumcircle
    rel("eqangle", ["B", "A", "M", "M", "A", "C"]), // AM bisects ∠BAC
  ],
  goal: rel("cong", ["M", "B", "M", "C"]),
  solution: [
    {
      fact: rel("eqangle", ["M", "B", "C", "M", "C", "B"]),
      rule: "algebraic angle-chase",
      premises: [
        rel("cyclic", ["A", "B", "C", "M"]),
        rel("eqangle", ["B", "A", "M", "M", "A", "C"]),
      ],
      humanReadable:
        "∠MBC = ∠MCB: inscribed angles give ∠MBC = ∠MAC and ∠MCB = ∠MAB, and the " +
        "bisector gives ∠MAB = ∠MAC.",
    },
    {
      fact: rel("cong", ["M", "B", "M", "C"]),
      rule: "isosceles: equal base angles ⇒ equal sides",
      premises: [rel("eqangle", ["M", "B", "C", "M", "C", "B"])],
      humanReadable:
        "MB = MC: triangle MBC has equal base angles ∠MBC = ∠MCB, hence equal legs.",
    },
  ],
};
