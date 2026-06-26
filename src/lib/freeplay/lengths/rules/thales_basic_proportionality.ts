/**
 * Basic proportionality theorem / Thales' intercept theorem (LENGTH layer).
 *
 * In triangle ABC, a line that meets side AB at D and side AC at E and is
 * PARALLEL to the base BC cuts those two sides in the same ratio. From the three
 * cited incidences
 *
 *   coll(A,D,B)        — D lies on line AB
 *   coll(A,E,C)        — E lies on line AC
 *   para(D,E,B,C)      — DE ∥ BC
 *
 * (A being the apex shared by the two lines, D/E the inner points, B/C the base)
 * we emit the side-division ratio (the primary one first):
 *
 *   eqratio(A,D,D,B,A,E,E,C)   — AD/DB = AE/EC
 *   eqratio(A,D,A,B,A,E,A,C)   — AD/AB = AE/AC
 *
 * SOUNDNESS
 * - The apex A is RECOVERED as the unique point shared by the two cited collinear
 *   lines; the remaining point on each line splits into the inner point (D / E)
 *   and the base point (B / C), with the cited `para` fixing which is which by
 *   pairing the inner segment DE against the base segment BC.
 * - We require a genuine, NON-degenerate configuration: five distinct points, a
 *   non-collinear triangle ABC, D strictly between A and B, E strictly between A
 *   and C, and DE actually PARALLEL to BC (numeric guard). A line that crosses
 *   the extensions of the sides would break the unsigned-length ratio, so we
 *   reject anything but a between-the-vertices cut. (Thales internal-cut guard.)
 * - Every emitted `eqratio` is GUARDED numerically (`factHoldsL`): we only emit a
 *   proportion that actually holds in the coordinates. We never emit a false fact.
 */
import { rel, type Fact, type PointId, type Rel } from "@/lib/freeplay/dsl";
import { isBetween, isCollinear } from "@/lib/freeplay/geom";
import { canonicalKeyL, eqratio, factHoldsL, type EqRatio, type LRule } from "../dsl";

const collsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "coll");

const parasOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "para");

/** Unordered-segment equality: {a,b} = {x,y}? */
const segEq = (a: PointId, b: PointId, x: PointId, y: PointId): boolean =>
  (a === x && b === y) || (a === y && b === x);

/** Does `para` pair the inner segment {D,E} with the base segment {B,C}? */
function paraPairs(
  D: PointId,
  E: PointId,
  B: PointId,
  C: PointId,
  para: Rel,
): boolean {
  const [p0, p1, p2, p3] = para.points;
  return (
    (segEq(D, E, p0, p1) && segEq(B, C, p2, p3)) ||
    (segEq(D, E, p2, p3) && segEq(B, C, p0, p1))
  );
}

export const thales_basic_proportionality: LRule = {
  id: "thales_basic_proportionality",
  name: "basic proportionality theorem",
  derive(cited, { coords }) {
    const out: EqRatio[] = [];
    const colls = collsOf(cited);
    const paras = parasOf(cited);
    if (colls.length < 2 || paras.length === 0) return out;

    const emitted = new Set<string>();
    const push = (f: EqRatio) => {
      if (!factHoldsL(f, coords)) return; // numeric soundness gate
      const k = canonicalKeyL(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    // Each ordered pair of distinct collinear lines proposes apex A = their
    // unique shared point; the rest of each line gives the inner/base points.
    for (let i = 0; i < colls.length; i++) {
      for (let j = 0; j < colls.length; j++) {
        if (i === j) continue;
        const l1 = colls[i].points;
        const l2 = colls[j].points;

        const shared = l1.filter((p) => l2.includes(p));
        if (shared.length !== 1) continue; // need a single common apex
        const A = shared[0];

        const rest1 = l1.filter((p) => p !== A);
        const rest2 = l2.filter((p) => p !== A);
        if (rest1.length < 2 || rest2.length < 2) continue;

        // Choose the inner point (D / E) and the base point (B / C) on each line.
        for (const D of rest1) {
          for (const B of rest1) {
            if (D === B) continue;
            for (const E of rest2) {
              for (const C of rest2) {
                if (E === C) continue;

                const pts = [A, D, B, E, C];
                if (new Set(pts).size !== 5) continue;

                // The cited `para` must pair inner DE against base BC.
                if (!paras.some((pa) => paraPairs(D, E, B, C, pa))) continue;

                const cA = coords[A];
                const cD = coords[D];
                const cB = coords[B];
                const cE = coords[E];
                const cC = coords[C];
                if (!cA || !cD || !cB || !cE || !cC) continue;

                // Non-degenerate triangle ABC.
                if (isCollinear(cA, cB, cC)) continue;
                // D / E must cut the actual sides (strictly between the vertices).
                if (!isBetween(cA, cD, cB)) continue;
                if (!isBetween(cA, cE, cC)) continue;
                // DE must genuinely be parallel to BC.
                if (!factHoldsL(rel("para", [D, E, B, C]), coords)) continue;

                push(eqratio(A, D, D, B, A, E, E, C)); // AD/DB = AE/EC
                push(eqratio(A, D, A, B, A, E, A, C)); // AD/AB = AE/AC
              }
            }
          }
        }
      }
    }

    return out;
  },
};
