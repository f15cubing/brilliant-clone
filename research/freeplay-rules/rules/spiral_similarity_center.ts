/**
 * Spiral-similarity centre (Miquel point) equidistance — ROTATION case
 * (research candidate). The length-producing rule that closes IMO SL 2024 G1.
 *
 * THE THEOREM. Two lines meet at P. Let X, Y lie on one line and Z, W on the
 * other (so coll(X,Y,P) and coll(Z,W,P)). Let T (≠ P) be the SECOND common
 * point of the two circles (X,Z,P) and (Y,W,P). Then T is the centre of the
 * unique spiral similarity sending X↦Z and Y↦W, hence TZ/TX = TW/TY = ZW/XY.
 * In particular, when XY = ZW the spiral similarity is a ROTATION, so
 *
 *   coll(X,Y,P), coll(Z,W,P), cyclic(X,Z,P,T), cyclic(Y,W,P,T), cong(X,Y,Z,W)
 *   ⇒ cong(T,X,T,Z)  AND  cong(T,Y,T,W).
 *
 * In G1 with (X,Y,Z,W) = (B,E,C,F): coll(B,E,P), coll(C,F,P),
 * cyclic(B,C,P,T), cyclic(E,F,P,T), cong(B,E,C,F) ⇒ cong(T,B,T,C) AND the goal
 * cong(T,E,T,F).
 *
 * HOW T IS PRESENTED / WHY THE PREMISE SET IS MINIMAL. T is pinned as the
 * second intersection of the two Miquel circles via its two concyclicities
 * cyclic(X,Z,P,T) and cyclic(Y,W,P,T); the two collinearities fix P = XY ∩ ZW
 * and the correspondence X↔Z, Y↔W; the cong(X,Y,Z,W) upgrades the spiral
 * similarity to a rotation (ratio 1), which is what licenses an EQUALITY rather
 * than a ratio. Each of the five premises is load-bearing:
 *   - drop coll(X,Y,P) or coll(Z,W,P): the X↔Y / Z↔W pairing through P is lost;
 *   - drop cyclic(X,Z,P,T): T is not pinned to circle 1 (the antipodal
 *     arc-midpoint T' satisfies the rest yet T'Y ≠ T'W);
 *   - drop cyclic(Y,W,P,T): T is not pinned to circle 2 (same antipode);
 *   - drop cong(X,Y,Z,W): the spiral is a general similarity (ratio ≠ 1), so
 *     TX ≠ TZ and TY ≠ TW.
 * The puzzle's cong(T,B,T,C) is NOT a premise — it is RE-EMITTED as an output.
 *
 * GAP. The output is a LENGTH equality (cong). The AR layer is angles-only and
 * never emits cong (ar.ts equation() is null for cong/cyclic/coll/midp); the
 * length layer (LengthAR) has no rotation/spiral machinery and cannot introduce
 * the centre T from circle incidences. So this must be a coordinate-guarded DD
 * rule emitting cong — like perp_bisector / sas_shared_vertex / sas_congruence.
 *
 * SOUNDNESS GUARDS (never emit a fact false in the figure). The rule fires only
 * when, in ctx.coords: all six points exist and are pairwise distinct; the two
 * cited collinearities X,Y,P and Z,W,P really hold; T is OFF both lines (genuine
 * triangles / non-degenerate circles); T lies on circle (X,Z,P) AND circle
 * (Y,W,P) (circumcentre + equal-radius, matching factHolds's cyclic test); the
 * rotation gate |XY| = |ZW| holds; and the emitted equality itself holds
 * numerically (|TX| = |TZ|, resp. |TY| = |TW|). The two-circle + collinearity
 * data pins the DIRECT spiral centre uniquely, so (unlike a bare SAS) there is
 * no reflection ambiguity. Both assignments of the shared pair to {P,T} are
 * tried; the cited collinearities select P and fix the correspondence.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { circumcenter, dist, isCollinear, type V } from "@/lib/freeplay/geom";

const EPS = 1e-6;

const cyclicsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cyclic");
const congsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");

/**
 * All cited 3-point sub-collinearities as a fast membership set. Each `coll`
 * fact (3+ points) contributes every triple it contains, keyed by its sorted
 * point ids — so the collinearity is genuinely CITED, not read off coordinates.
 */
function collTriples(cited: Fact[]): Set<string> {
  const s = new Set<string>();
  for (const f of cited) {
    if (f.kind !== "rel" || f.name !== "coll") continue;
    const p = f.points;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        for (let k = j + 1; k < p.length; k++)
          s.add([p[i], p[j], p[k]].slice().sort().join(","));
  }
  return s;
}
const hasColl = (s: Set<string>, a: PointId, b: PointId, c: PointId): boolean =>
  s.has([a, b, c].slice().sort().join(","));

/** Lengths equal within the relative tolerance the `cong` truth check uses. */
const lenEq = (a: V, b: V, c: V, d: V): boolean => {
  const l1 = dist(a, b);
  const l2 = dist(c, d);
  return Math.abs(l1 - l2) < EPS * Math.max(1, l1, l2);
};

/** Does `x` lie on the circle through (p, q, r)? (matches `cyclic` truth test) */
const onCircle = (p: V, q: V, r: V, x: V): boolean => {
  const o = circumcenter(p, q, r);
  if (!o) return false;
  const R = dist(o, p);
  return Math.abs(dist(o, x) - R) < EPS * Math.max(1, R);
};

export const spiral_similarity_center: Rule = {
  id: "spiral_similarity_center",
  name: "spiral-similarity centre (Miquel point) equidistance",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const emitted = new Set<string>();
    const push = (f: Fact) => {
      const k = canonicalKey(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    const cyclics = cyclicsOf(cited);
    const colls = collTriples(cited);
    const congKeys = new Set(congsOf(cited).map(canonicalKey));
    const hasCong = (a: PointId, b: PointId, c: PointId, d: PointId): boolean =>
      congKeys.has(canonicalKey(rel("cong", [a, b, c, d])));

    for (let i = 0; i < cyclics.length; i++) {
      for (let j = i + 1; j < cyclics.length; j++) {
        const s1 = [...new Set(cyclics[i].points)];
        const s2 = [...new Set(cyclics[j].points)];
        const shared = s1.filter((p) => s2.includes(p));
        if (shared.length !== 2) continue; // circles meet in exactly {P, T}
        const rest1 = s1.filter((p) => !shared.includes(p)); // {X, Z}
        const rest2 = s2.filter((p) => !shared.includes(p)); // {Y, W}
        if (rest1.length !== 2 || rest2.length !== 2) continue;

        // Either shared point may be P (the line crossing); the cited
        // collinearities decide which, and fix the X↔Y, Z↔W correspondence.
        for (const P of shared) {
          const T = shared[0] === P ? shared[1] : shared[0];
          for (const X of rest1) {
            const Z = rest1[0] === X ? rest1[1] : rest1[0];
            // X, Y, P collinear (cited) selects Y on line 2 paired with X.
            const Y = rest2.find((y) => hasColl(colls, X, y, P));
            if (!Y) continue;
            const W = rest2[0] === Y ? rest2[1] : rest2[0];
            if (!hasColl(colls, Z, W, P)) continue; // Z, W, P collinear (cited)
            if (!hasCong(X, Y, Z, W)) continue; // XY = ZW cited (rotation hyp.)

            const ids = [X, Y, Z, W, P, T];
            const cpts = ids.map((p) => coords[p]);
            if (cpts.some((c) => !c)) continue;
            const [cX, cY, cZ, cW, cP, cT] = cpts as V[];

            // All six points pairwise distinct (so T ≠ P, etc.).
            let coincident = false;
            for (let a = 0; a < 6 && !coincident; a++)
              for (let b = a + 1; b < 6; b++)
                if (dist(cpts[a] as V, cpts[b] as V) < EPS) {
                  coincident = true;
                  break;
                }
            if (coincident) continue;

            // Cited collinearities must really hold; T off both lines (genuine
            // triangles / non-degenerate circles).
            if (!isCollinear(cX, cY, cP) || !isCollinear(cZ, cW, cP)) continue;
            if (isCollinear(cX, cY, cT) || isCollinear(cZ, cW, cT)) continue;

            // Re-verify both circle memberships from coordinates.
            if (!onCircle(cX, cZ, cP, cT) || !onCircle(cY, cW, cP, cT)) continue;

            // ROTATION gate: |XY| = |ZW| (the equal-segment hypothesis).
            if (!lenEq(cX, cY, cZ, cW)) continue;

            // Emit only the equalities that actually hold numerically.
            if (lenEq(cT, cX, cT, cZ)) push(rel("cong", [T, X, T, Z]));
            if (lenEq(cT, cY, cT, cW)) push(rel("cong", [T, Y, T, W]));
          }
        }
      }
    }
    return out;
  },
};
