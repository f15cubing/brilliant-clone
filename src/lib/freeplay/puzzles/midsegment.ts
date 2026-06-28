import { COLORS, polygon, segment } from "@/lib/content/boards";
import type { Coords } from "@/lib/freeplay/check";
import { rel } from "@/lib/freeplay/dsl";
import { midpoint, type V } from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

/** Derive the figure from the free vertices A, B, C: M, N are the midpoints. */
function deriveFrom(A: V, B: V, C: V): Realization {
  return { coords: { A, B, C, M: midpoint(A, B), N: midpoint(A, C) } };
}

/**
 * Generic realization: a random scalene triangle ABC with M, N the exact
 * midpoints of AB and AC. Free: A, B, C (M, N dependent).
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const A: V = [rnd(-1, 1), rnd(4, 6)];
  const B: V = [rnd(-5, -3), rnd(-3, -1)];
  const C: V = [rnd(3, 6), rnd(-2, 0)];
  return deriveFrom(A, B, C);
}

/** Movable form: recompute the midpoints from the dragged vertices. */
function constructFrom(free: Coords): Realization {
  return deriveFrom(free.A, free.B, free.C);
}

/**
 * Core (1 step): the midsegment MN of triangle ABC is parallel to BC. Scalene
 * coordinates so nothing holds by accident.
 */
export const midsegment: Puzzle = {
  id: "midsegment",
  title: "The midsegment of a triangle",
  blurb:
    "M and N are the midpoints of AB and AC. Prove that MN is parallel to BC.",
  difficulty: "core",
  coords: {
    A: [0, 5],
    B: [-4, -2],
    C: [5, -1],
    M: [-2, 1.5],
    N: [2.5, 2],
  },
  construct,
  constructFrom,
  freePoints: ["A", "B", "C"],
  figure: [
    polygon(["A", "B", "C"]),
    segment("M", "N", { strokeColor: COLORS.ACCENT, strokeWidth: 2.5 }),
  ],
  given: [rel("midp", ["M", "A", "B"]), rel("midp", ["N", "A", "C"])],
  goal: rel("para", ["M", "N", "B", "C"]),
  solution: [
    {
      fact: rel("para", ["M", "N", "B", "C"]),
      rule: "midsegment is parallel to the base",
      premises: [rel("midp", ["M", "A", "B"]), rel("midp", ["N", "A", "C"])],
      humanReadable:
        "M and N are midpoints of AB and AC, so MN is a midsegment and MN ∥ BC.",
    },
  ],
};
