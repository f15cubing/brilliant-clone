/**
 * Play-test problem: Pascal's theorem (collinearity of opposite-side meets).
 *
 * SOURCE / CONFIGURATION
 * ──────────────────────
 * Classic statement (generic instance, no contest-specific labelling):
 *   "If a hexagon ABCDEF is inscribed in a circle, then the three intersection
 *    points of pairs of opposite sides
 *        X = AB ∩ DE,  Y = BC ∩ EF,  Z = CD ∩ FA
 *    are collinear (the Pascal line)."
 *   — Blaise Pascal, "Essai pour les coniques" (1640); standard olympiad lemma.
 *
 * This file encodes a single, faithful, NON-degenerate realization of that
 * statement and replays the one-step proof through the research harness, with
 * the final collinearity justified by the `pascal` rule ("Pascal's theorem").
 *
 * REALIZATION
 * ───────────
 * Six scalene (non-symmetric) points on the circle of radius 6 centred at the
 * origin, at angles {14°, 121°, 224°, 67°, 311°, 168°} taken in the hexagon
 * order A,B,C,D,E,F = P1..P6. This is a self-crossing ("star") hexagon, which
 * is a perfectly valid Pascal hexagon and conveniently places all three
 * opposite-side intersections inside the figure (|·| < 4, well-conditioned).
 *
 * Coordinates were computed by a scratch node script (line intersections),
 * verified collinear there, then hardcoded here. Every `given`, every step
 * `fact`, and the `goal` are checked numerically by `replayProblem` via
 * `factHolds`, and additionally asserted in the test.
 *
 * HOW "SIX ON ONE CIRCLE" IS CERTIFIED (matches rules/pascal.ts)
 * ─────────────────────────────────────────────────────────────
 * The DSL `cyclic` predicate pins only 4 points, so the common circle is
 * reconstructed from three cited `cyclic` facts that all share the
 * non-collinear triple {P1,P2,P3} — together they pin one circle through
 * P1..P6 (à la `concyclic_merge`). Concyclicity is thus PROVEN from the cited
 * facts, never read off the coordinates.
 *
 * HOW THE OPPOSITE-SIDE MEETS ARE NAMED (matches rules/pascal.ts)
 * ──────────────────────────────────────────────────────────────
 * Each intersection is anchored by two cited `coll` facts placing it on both
 * of its side-lines: X by coll(A,B,X) & coll(D,E,X), etc. Dropping any one of
 * these (or any pinning cyclic) breaks the derivation — minimality holds, as
 * the rule's own test suite confirms.
 */
import { rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { ResearchProblem } from "./types";

// Six concyclic points (R = 6) in hexagon order A..F = P1..P6, plus the three
// opposite-side intersections X, Y, Z. Hardcoded from the scratch computation.
const coords: Coords = {
  P1: [5.821774357655979, 1.4515313735980064], // A  (14°)
  P2: [-3.0902284494603256, 5.143003804212674], // B  (121°)
  P3: [-4.3160388020319065, -4.167950222753984], // C  (224°)
  P4: [2.3443867709356434, 5.523029120714641], // D  (67°)
  P5: [3.9363541739430423, -4.528257481336633], // E  (311°)
  P6: [-5.868885604402834, 1.247470144906556], // F  (168°)
  X: [2.7903736716627723, 2.7071786507234963], // AB ∩ DE
  Y: [-3.766150695256936, 0.00886462582064329], // BC ∩ EF
  Z: [-0.5300762944095871, 1.3406594080518595], // CD ∩ FA
};

// "Six on one circle": three cyclic facts sharing the non-collinear triple
// P1,P2,P3 pin one common circle covering P1..P6.
const cyc4 = rel("cyclic", ["P1", "P2", "P3", "P4"]);
const cyc5 = rel("cyclic", ["P1", "P2", "P3", "P5"]);
const cyc6 = rel("cyclic", ["P1", "P2", "P3", "P6"]);

// `coll` facts placing each opposite-side meet on both of its side-lines.
const collABX = rel("coll", ["P1", "P2", "X"]); // X on line AB
const collDEX = rel("coll", ["P4", "P5", "X"]); // X on line DE
const collBCY = rel("coll", ["P2", "P3", "Y"]); // Y on line BC
const collEFY = rel("coll", ["P5", "P6", "Y"]); // Y on line EF
const collCDZ = rel("coll", ["P3", "P4", "Z"]); // Z on line CD
const collFAZ = rel("coll", ["P6", "P1", "Z"]); // Z on line FA

const given = [cyc4, cyc5, cyc6, collABX, collDEX, collBCY, collEFY, collCDZ, collFAZ];
const goal = rel("coll", ["X", "Y", "Z"]);

export const pascal_hexagon: ResearchProblem = {
  id: "pascal-hexagon",
  source:
    "Pascal's theorem (classic): hexagon inscribed in a circle ⇒ opposite-side meets are collinear. Generic instance.",
  statement:
    "Hexagon ABCDEF is inscribed in a circle. Let X = AB ∩ DE, Y = BC ∩ EF, Z = CD ∩ FA. Prove X, Y, Z are collinear.",
  coords,
  bindings: {},
  given,
  goal,
  exercises: ["pascal"],
  steps: [
    {
      fact: goal,
      premises: given,
      expectRule: "Pascal's theorem",
      humanReadable:
        "By Pascal's theorem on the six concyclic points P1..P6 (hexagon ABCDEF), the three opposite-side intersections X = AB∩DE, Y = BC∩EF, Z = CD∩FA are collinear.",
    },
  ],
};
