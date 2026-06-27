import { circle, COLORS, segment } from "@/lib/content/boards";
import { rel } from "@/lib/freeplay/dsl";
import { pointOnCircleAtAngle, type V } from "@/lib/freeplay/geom";
import type { Puzzle, Realization } from "@/lib/freeplay/types";

const R = 3;
const on = (deg: number): [number, number] => [
  R * Math.cos((deg * Math.PI) / 180),
  R * Math.sin((deg * Math.PI) / 180),
];

/**
 * Generic realization: four points on a circle with A, B in the lower arc and
 * P, Q together in the upper arc (same side of chord AB), so the inscribed
 * angles ∠APB and ∠AQB genuinely coincide. Free: the four on-circle points.
 */
function construct(rng: () => number): Realization {
  const rnd = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const O: V = [rnd(-1, 1), rnd(-1, 1)];
  const r = rnd(2.5, 4);
  return {
    coords: {
      O,
      A: pointOnCircleAtAngle(O, r, rnd(195, 230)),
      B: pointOnCircleAtAngle(O, r, rnd(310, 345)),
      P: pointOnCircleAtAngle(O, r, rnd(60, 110)),
      Q: pointOnCircleAtAngle(O, r, rnd(120, 170)),
    },
  };
}

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
  construct,
  freePoints: ["A", "B", "P", "Q"],
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
