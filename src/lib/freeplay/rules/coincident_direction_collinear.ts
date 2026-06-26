/**
 * "Coincident direction ⇒ collinear" (research candidate).
 *
 * The one-step bridge that turns a directed-angle (parallelism) fact into a
 * projective-incidence (collinearity) fact:
 *
 *     para(X, A, X, B)   ⇒   coll(X, A, B)
 *
 * i.e. if two segments XA and XB SHARE the endpoint X and are parallel, then
 * the lines XA and XB coincide, so the three points X, A, B are collinear.
 *
 * ── Why this is a genuine gap in the shipped engine ─────────────────────────
 * AR (`ar.ts`) is the only layer that can chase directed angles to a coincident
 * direction, but its `equation()` returns `null` for a `coll` candidate: AR
 * *consumes* collinearity (to merge line directions into one generator) and
 * never *emits* it, so `AngleAR.implies(coll(...))` is hard-wired false. The
 * ONLY rules that produce a `coll` fact are the projective-incidence rules
 * `pappus` (shipped) and `pascal` (research) — neither of which applies when the
 * collinearity has already been reduced to a single parallelism. Hence a
 * collinearity that is *fully* reduced to an angle identity (e.g. the Simson
 * line's `para(D,E,D,F)`) is still unreachable without this bridge.
 *
 * ── Soundness ───────────────────────────────────────────────────────────────
 * Mathematically exact: through a given point X there is exactly one line in a
 * fixed direction. So if XA ∥ XB and both pass through X, they are the SAME
 * line, and A, B lie on it together with X — the converse never fails. We still
 * coordinate-guard strictly: the rule fires only when (a) the cited `para` has
 * exactly one shared endpoint X (two genuine segments from a common vertex),
 * (b) all three points have coordinates and A ≠ B, and (c) X, A, B are
 * NUMERICALLY collinear (`isCollinear`). It therefore never emits a `coll` that
 * is false in the figure. Two DISTINCT parallel segments (no shared endpoint)
 * are intentionally ignored — distinct parallel lines are NOT collinear, so the
 * shared-endpoint requirement is exactly what makes the bridge sound. The check
 * works whether X lies between A and B or outside the segment AB, since `para`
 * (and `isCollinear`) are direction-only and sign-agnostic.
 */
import type { Fact, PointId } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { isCollinear } from "@/lib/freeplay/geom";

export const coincident_direction_collinear: Rule = {
  id: "coincident_direction_collinear",
  name: "coincident direction ⇒ collinear",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const seen = new Set<string>();

    for (const f of cited) {
      if (f.kind !== "rel" || f.name !== "para") continue;
      const [p, q, r, s] = f.points; // segment pq ∥ segment rs
      const seg1: PointId[] = [p, q];
      const seg2: PointId[] = [r, s];

      // Each side must be a real segment (two distinct endpoints).
      if (p === q || r === s) continue;

      // The pivot X is the single endpoint shared by both parallel segments.
      const shared = seg1.filter((x) => seg2.includes(x));
      if (shared.length !== 1) continue;
      const X = shared[0];
      const A = seg1.find((x) => x !== X);
      const B = seg2.find((x) => x !== X);
      if (!A || !B || A === B) continue;

      const cX = coords[X];
      const cA = coords[A];
      const cB = coords[B];
      if (!cX || !cA || !cB) continue;

      // Strict coordinate guard: only fire when the three points really are
      // collinear in the figure (never emit a false incidence).
      if (!isCollinear(cX, cA, cB)) continue;

      const fact = rel("coll", [X, A, B]);
      const key = canonicalKey(fact);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(fact);
    }

    return out;
  },
};
