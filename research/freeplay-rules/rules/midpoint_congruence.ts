/**
 * "Midpoint gives equal halves" (research candidate).
 *
 * From a cited `midp(M, A, B)` (M is the midpoint of segment AB) derive the
 * LENGTH equality `cong(M, A, M, B)`, i.e. MA = MB.
 *
 * Why this is a genuine gap: the AR layer is angles-only (it has no length
 * table), so it can never produce a `cong`. None of the shipped DD rules turn a
 * single `midp` into a `cong` either (`midsegment` needs two midpoints and emits
 * `para`; `isosceles` needs an `eqangle`). So this is a real missing primitive.
 *
 * Soundness: a midpoint is, by definition, equidistant from the two endpoints,
 * so the conclusion is unconditionally true whenever the premise holds. We still
 * coordinate-guard: A, B, M must all have coords, A ≠ B, and the numeric figure
 * must actually realize M as equidistant from A and B before we emit.
 */
import type { Fact } from "@/lib/freeplay/dsl";
import { rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { dist } from "@/lib/freeplay/geom";

export const midpoint_congruence: Rule = {
  id: "midpoint_congruence",
  name: "midpoint gives equal halves",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    for (const f of cited) {
      if (f.kind !== "rel" || f.name !== "midp") continue;
      const [M, A, B] = f.points;
      const cM = coords[M];
      const cA = coords[A];
      const cB = coords[B];
      if (!cM || !cA || !cB) continue;

      const ab = dist(cA, cB);
      if (ab < 1e-9) continue; // A ≠ B

      // Coordinate guard: the figure must realize M as equidistant from A and B
      // (i.e. M really is the midpoint) before emitting the length equality.
      const ma = dist(cM, cA);
      const mb = dist(cM, cB);
      if (Math.abs(ma - mb) > 1e-6 * Math.max(1, ma, mb)) continue;

      out.push(rel("cong", [M, A, M, B]));
    }
    return out;
  },
};
