/**
 * SSS congruent triangles (research candidate).
 *
 * Triangles ABC and DEF whose three pairs of corresponding sides are equal are
 * congruent, so their corresponding angles are equal. From the cited facts
 *
 *   cong(A,B,D,E)   — side AB = DE
 *   cong(B,C,E,F)   — side BC = EF
 *   cong(C,A,F,D)   — side CA = FD
 *
 * (a complete "side cycle" with the vertex correspondence A↔D, B↔E, C↔F) we
 * derive the three corresponding equal angles, primarily
 *
 *   eqangle(A,B,C, D,E,F)   — ∠ABC = ∠DEF   (angle at B = angle at E)
 *
 * and, as bonus outputs, the angles at the other two corresponding vertices
 *
 *   eqangle(B,A,C, E,D,F)   — ∠BAC = ∠EDF   (angle at A = angle at D)
 *   eqangle(B,C,A, E,F,D)   — ∠BCA = ∠EFD   (angle at C = angle at F)
 *
 * This is a genuine GAP: it produces ANGLE equalities out of three LENGTH
 * equalities. The angle-only AR layer has no length table, so it cannot consume
 * the cited `cong` facts at all, and no shipped DD rule turns three congruences
 * into an `eqangle`.
 *
 * CORRESPONDENCE MATCHING
 * Each `cong` fact is symmetric (segment {X,Y} = segment {Z,W}, with no fixed
 * "which triangle is first" and no fixed endpoint order). We therefore search
 * for an ordered vertex correspondence X↔P, Y↔Q, Z↔R (over the points appearing
 * in the cited congs) such that the three triangle sides line up with the three
 * cited congruences as a cycle:
 *
 *   side XY ~ side PQ ,  side YZ ~ side QR ,  side ZX ~ side RP .
 *
 * For a generic (scalene) triangle the three side lengths are distinct, so the
 * only correspondence satisfying all three side-pairs is the genuine one (up to
 * swapping which triangle is "first", which yields the same undirected angle
 * equalities and is deduplicated).
 *
 * SOUNDNESS NOTES
 * - Congruence permits REFLECTION. The shipped `eqangle` / `factHolds` use
 *   UNDIRECTED angles, so a mirror image of ABC still has equal undirected
 *   corresponding angles. We do not constrain orientation; instead we GUARD
 *   every output numerically: an `eqangle` is emitted only when it actually
 *   holds in the coordinates, and only for non-degenerate (non-collinear)
 *   triangles. We never emit a false fact.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { angleDeg, isCollinear, type V } from "@/lib/freeplay/geom";

const congsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");

/** Angles (unsigned, degrees) equal within the `eqangle` truth tolerance. */
function angEq(a: V, b: V, c: V, d: V, e: V, f: V): boolean {
  return Math.abs(angleDeg(a, b, c) - angleDeg(d, e, f)) < 1e-4;
}

export const sss_congruence: Rule = {
  id: "sss_congruence",
  name: "SSS congruent triangles",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const congs = congsOf(cited);
    if (congs.length < 3) return out;

    // A cong fact equivalent to "segment (x,y) = segment (z,w)" is cited?
    const congKeys = new Set(congs.map(canonicalKey));
    const hasCong = (x: PointId, y: PointId, z: PointId, w: PointId): boolean =>
      congKeys.has(canonicalKey(rel("cong", [x, y, z, w])));

    // Only the points that actually appear in the cited congruences matter.
    const pts = [...new Set(congs.flatMap((c) => c.points))];

    const emitted = new Set<string>();
    const push = (f: Fact) => {
      const k = canonicalKey(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    const distinct = (...ps: PointId[]): boolean => new Set(ps).size === ps.length;

    // Search for a vertex correspondence X↔P, Y↔Q, Z↔R whose three triangle
    // sides match the three cited congruences as a cycle.
    for (const X of pts)
      for (const Y of pts)
        for (const Z of pts) {
          if (!distinct(X, Y, Z)) continue;
          for (const P of pts)
            for (const Q of pts)
              for (const R of pts) {
                if (!distinct(X, Y, Z, P, Q, R)) continue;
                // side cycle: XY~PQ, YZ~QR, ZX~RP
                if (!hasCong(X, Y, P, Q)) continue;
                if (!hasCong(Y, Z, Q, R)) continue;
                if (!hasCong(Z, X, R, P)) continue;

                const cX = coords[X];
                const cY = coords[Y];
                const cZ = coords[Z];
                const cP = coords[P];
                const cQ = coords[Q];
                const cR = coords[R];
                if (!cX || !cY || !cZ || !cP || !cQ || !cR) continue;

                // Both triangles must be genuine (non-degenerate).
                if (isCollinear(cX, cY, cZ) || isCollinear(cP, cQ, cR)) continue;

                // GUARD: emit each corresponding angle equality only when it
                // actually holds in the figure (covers reflected images too).
                // vertex Y↔Q (the primary ∠XYZ = ∠PQR).
                if (angEq(cX, cY, cZ, cP, cQ, cR)) {
                  push(rel("eqangle", [X, Y, Z, P, Q, R]));
                }
                // vertex X↔P (∠YXZ = ∠QPR).
                if (angEq(cY, cX, cZ, cQ, cP, cR)) {
                  push(rel("eqangle", [Y, X, Z, Q, P, R]));
                }
                // vertex Z↔R (∠XZY = ∠PRQ).
                if (angEq(cX, cZ, cY, cP, cR, cQ)) {
                  push(rel("eqangle", [X, Z, Y, P, R, Q]));
                }
              }
        }

    return out;
  },
};
