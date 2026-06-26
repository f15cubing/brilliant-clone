/**
 * "Isosceles: equal sides ⇒ equal base angles" (research candidate).
 *
 * This is the CONVERSE of the shipped `isosceles` rule (which goes equal base
 * ANGLES ⇒ equal SIDES). Here we go the other direction: in a triangle with
 * apex T and base A, B, from the cited length equality `cong(T,A,T,B)` (TA = TB)
 * derive the base-angle equality `eqangle(T,A,B, T,B,A)`.
 *
 * Angle forms (note the vertices):
 *   ∠TAB has vertex A (arms to T and B)  → eqangle slots (T, A, B)
 *   ∠TBA has vertex B (arms to T and A)  → eqangle slots (T, B, A)
 * so the emitted fact is `eqangle(T, A, B, T, B, A)`.
 *
 * Identifying the configuration: `cong(T,A,T,B)` is symmetric, so the two equal
 * segments may be cited in any order. The apex T is the endpoint shared by both
 * segments; the base A, B are the two remaining (non-apex) endpoints.
 *
 * Why this is a genuine gap: the conclusion is an ANGLE equality produced from a
 * LENGTH equality. The AR layer is angles-only and cite-driven — a lone `cong`
 * gives it nothing — and no shipped DD rule turns a `cong` into an `eqangle`
 * (the shipped `isosceles` goes the other way: eqangle ⇒ cong).
 *
 * Soundness: coordinate-guarded. T, A, B must all have coords and be
 * non-collinear (a real triangle), and we numerically verify the base angles are
 * actually equal in the figure before emitting. In a scalene triangle (TA ≠ TB)
 * the base angles differ, so nothing is emitted.
 */
import type { Fact, PointId } from "@/lib/freeplay/dsl";
import { rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { angleDeg, isCollinear } from "@/lib/freeplay/geom";

export const isosceles_converse: Rule = {
  id: "isosceles_converse",
  name: "isosceles: equal sides ⇒ equal base angles",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    for (const f of cited) {
      if (f.kind !== "rel" || f.name !== "cong") continue;
      const [p, q, r, s] = f.points; // segment pq = segment rs
      const seg1: PointId[] = [p, q];
      const seg2: PointId[] = [r, s];

      // The apex is the single endpoint shared by both equal segments.
      const shared = seg1.filter((x) => seg2.includes(x));
      if (shared.length !== 1) continue;
      const T = shared[0];
      const A = seg1.find((x) => x !== T);
      const B = seg2.find((x) => x !== T);
      if (!A || !B || A === B) continue;

      const cT = coords[T];
      const cA = coords[A];
      const cB = coords[B];
      if (!cT || !cA || !cB) continue;

      // Real triangle (apex not on the base line).
      if (isCollinear(cT, cA, cB)) continue;

      // Coordinate guard: the base angles must actually be equal in the figure
      // (∠TAB at vertex A vs ∠TBA at vertex B) before emitting the equality.
      const angA = angleDeg(cT, cA, cB); // ∠TAB, vertex A
      const angB = angleDeg(cT, cB, cA); // ∠TBA, vertex B
      if (Math.abs(angA - angB) > 1e-4) continue;

      out.push(rel("eqangle", [T, A, B, T, B, A]));
    }
    return out;
  },
};
