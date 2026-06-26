import { circle, COLORS, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import type { Puzzle } from "@/lib/freeplay/types";

const R = 3;
const on = (deg: number): [number, number] => [
  R * Math.cos((deg * Math.PI) / 180),
  R * Math.sin((deg * Math.PI) / 180),
];

/**
 * Intro (1 step): two inscribed angles subtending the same chord AB from the
 * same arc are equal.
 */
export const inscribedAngle: Puzzle = {
  id: "inscribed-angle",
  title: "Inscribed angles on the same arc",
  blurb:
    "Points A, B, P, Q lie on a circle. Show the angles at P and Q over chord AB are equal.",
  difficulty: "intro",
  coords: {
    O: [0, 0],
    A: on(205),
    B: on(335),
    P: on(95),
    Q: on(140),
  },
  figure: [
    circle("circ", "O", "A", { strokeColor: COLORS.WRONG, dash: 2, strokeWidth: 1.5 }),
    segment("P", "A", { strokeColor: COLORS.BRAND }),
    segment("P", "B", { strokeColor: COLORS.BRAND }),
    segment("Q", "A", { strokeColor: COLORS.ACCENT }),
    segment("Q", "B", { strokeColor: COLORS.ACCENT }),
  ],
  given: [rel("cyclic", ["A", "B", "P", "Q"])],
  goal: rel("eqangle", ["A", "P", "B", "A", "Q", "B"]),
  solution: [
    {
      fact: rel("eqangle", ["A", "P", "B", "A", "Q", "B"]),
      rule: "inscribed angle (same arc)",
      premises: [rel("cyclic", ["A", "B", "P", "Q"])],
      humanReadable:
        "A, B, P, Q are concyclic, so ∠APB and ∠AQB subtend the same chord AB from the same arc and are equal.",
    },
  ],
};
