import { COLORS, polygon, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import type { Puzzle } from "@/lib/freeplay/types";

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
