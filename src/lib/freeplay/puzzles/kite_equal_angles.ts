import { COLORS, angleMark, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { reflectOverLine, type V } from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/**
 * Derive the kite from the axis vertices A, C and the wing B: D is the
 * reflection of B across the axis line AC, which makes AB = AD and CB = CD
 * exactly (A and C lie on the mirror), so the kite givens hold by construction.
 */
function deriveFrom(A: V, B: V, C: V): Realization {
  return { coords: { A, B, C, D: reflectOverLine(B, A, C) } };
}

/**
 * Generic realization: pick the axis vertices A, C and one wing B freely, then
 * take D as the reflection of B across the axis line AC. Free: A, B, C (D is
 * dependent).
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const A: V = [rnd(-1, 1), rnd(3, 5)];
  const C: V = [rnd(-1, 1), rnd(-4, -2)];
  const B: V = [rnd(1.5, 3.5), rnd(-1, 2)];
  return deriveFrom(A, B, C);
}

/** Movable form: reflect the dragged wing B across the dragged axis AC. */
function constructFrom(free: Coords): Realization {
  return deriveFrom(free.A, free.B, free.C);
}

/**
 * Kite equal-angles theorem (intro).
 *
 * ABCD is a kite with AB = AD and CB = CD. Prove that the two non-axis angles
 * are equal: ∠ABC = ∠ADC. The diagonal BD splits the kite into two isosceles
 * triangles; the isosceles converse gives each base-angle equality, and an
 * angle-chase adds them.
 */
export const kiteEqualAngles: Puzzle = {
  id: "kite_equal_angles",
  title: "Kite: ∠ABC = ∠ADC",
  blurb:
    "Classic Euclidean kite theorem (Brilliant \"Kites\" / AoPS Intro to Geometry). " +
    "ABCD is a kite with AB = AD and CB = CD. Prove that the angles at the two " +
    "non-axis vertices are equal: ∠ABC = ∠ADC.",
  difficulty: "intro",
  coords: {
    A: [0, 4],
    B: [2, 1],
    C: [0, -3],
    D: [-2, 1],
  },
  construct,
  constructFrom,
  freePoints: ["A", "B", "C"],
  figure: [
    polygon(["A", "B", "C", "D"]),
    // Axis of symmetry AC and the splitting diagonal BD (auxiliary line).
    segment("A", "C", { strokeColor: COLORS.ACCENT, strokeWidth: 1.4, dash: 2 }),
    segment("B", "D", { strokeColor: COLORS.BRAND, strokeWidth: 1.4, dash: 2 }),
    // The goal: the two equal opposite angles ∠ABC and ∠ADC.
    angleMark("A", "B", "C", { fillColor: COLORS.OK, strokeColor: COLORS.OK }),
    angleMark("A", "D", "C", { fillColor: COLORS.OK, strokeColor: COLORS.OK }),
  ],
  given: [
    rel("cong", ["A", "B", "A", "D"]), // AB = AD
    rel("cong", ["C", "B", "C", "D"]), // CB = CD
  ],
  goal: rel("eqangle", ["A", "B", "C", "A", "D", "C"]),
  solution: [
    {
      fact: rel("eqangle", ["A", "B", "D", "A", "D", "B"]),
      rule: "isosceles: equal sides ⇒ equal base angles",
      premises: [rel("cong", ["A", "B", "A", "D"])],
      humanReadable: "AB = AD, so triangle ABD is isosceles: ∠ABD = ∠ADB.",
    },
    {
      fact: rel("eqangle", ["C", "B", "D", "C", "D", "B"]),
      rule: "isosceles: equal sides ⇒ equal base angles",
      premises: [rel("cong", ["C", "B", "C", "D"])],
      humanReadable: "CB = CD, so triangle CBD is isosceles: ∠CBD = ∠CDB.",
    },
    {
      fact: rel("eqangle", ["A", "B", "C", "A", "D", "C"]),
      rule: "algebraic angle-chase",
      premises: [
        rel("eqangle", ["A", "B", "D", "A", "D", "B"]),
        rel("eqangle", ["C", "B", "D", "C", "D", "B"]),
      ],
      humanReadable:
        "Adding the two base-angle equalities about the diagonal BD: " +
        "∠ABC = ∠ABD + ∠DBC = ∠ADB + ∠CDB = ∠ADC.",
    },
  ],
};
