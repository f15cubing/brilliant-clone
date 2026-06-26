/**
 * Equal radii ⇒ concyclic (research candidate) — the circle-producing DUAL of
 * `perp_bisector`.
 *
 * If a single centre O is equidistant from four points, those four points lie on
 * one circle (centred at O):
 *
 *   cong(O,P1,O,P2)   — |OP1| = |OP2|
 *   cong(O,P2,O,P3)   — |OP2| = |OP3|
 *   cong(O,P3,O,P4)   — |OP3| = |OP4|
 *   ⇒ cyclic(P1,P2,P3,P4)
 *
 * The three `cong` facts form a "cong-star": each one chains O to two of the
 * rim points, and together they tie all four radii to a common length. O itself
 * is NOT one of the concyclic points.
 *
 * Why this is a genuine GAP: the conclusion is a CIRCLE built purely from LENGTH
 * equalities. The AR layer is angles-only (no length table) and the shipped
 * `converse_inscribed`/cyclic rules build concyclicity from EQUAL-ANGLE data, so
 * nothing in the shipped engine turns `cong` facts into a `cyclic`. This is the
 * exact missing move in the IMO 2018 P1 angle-chase+Reim proof (step 5:
 * cyclic(D,E,X,Y) from AX=AD, AY=AE, AD=AE, all centred at A).
 *
 * RECOVERING THE SHARED CENTRE O (the way `cong_transitivity` recovers the
 * shared endpoint). A `cong` fact carries two segments, each an UNORDERED pair,
 * and the two segments are interchangeable (see `relKey`/`canonicalKey`). For a
 * star spoke the two segments SHARE exactly one point — that point is the centre
 * O, and the two non-shared endpoints are its spokes. We treat each cited `cong`
 * as such an O-spoke edge {s1,s2} at centre O and, per centre, take the
 * connected components of the spoke graph: every node in one component is tied
 * to O by a chain of equal-length `cong`s, hence equidistant from O.
 *
 * MINIMALITY over the three `cong` facts. We only emit cyclic(P1..P4) when the
 * four rim points lie in ONE connected component of the centre-O edge graph.
 * Each `cong` is one edge; a connected 4-node component needs (at least) three
 * edges, so dropping any single cited `cong` splits the four points across
 * components (≤3 nodes each) and the 4-point conclusion is no longer derivable —
 * exactly the load-bearing property the verifier checks.
 *
 * SOUNDNESS GUARDS (never emit a fact false in the figure).
 * - All five points (O and the four rim points) must have coordinates.
 * - The four rim points and O must be pairwise distinct (no coincident points).
 * - O must be GENUINELY equidistant from all four rim points numerically (with a
 *   non-zero radius), so a cited `cong` that is not actually realized keeps us
 *   silent.
 * - No three of the four rim points may be collinear (a degenerate "circle").
 * - Final check: the four points are actually concyclic in the coordinates
 *   (circumcentre of three exists and the fourth lies on it).
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { circumcenter, dist, isCollinear } from "@/lib/freeplay/geom";

const EPS = 1e-6;

const congsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");

/**
 * Read a `cong` as an O-spoke edge: its two segments must share exactly one
 * point (the centre O); the other two endpoints are the spokes. Returns null for
 * a general `cong` (segments share 0 or 2 points), which is not a star spoke.
 */
function spokeEdge(
  f: Rel,
): { center: PointId; s1: PointId; s2: PointId } | null {
  const [a, b, c, d] = f.points;
  const seg1: [PointId, PointId] = [a, b];
  const seg2: [PointId, PointId] = [c, d];
  const common = seg1.filter((p) => seg2.includes(p));
  if (common.length !== 1) return null;
  const center = common[0];
  const s1 = seg1[0] === center ? seg1[1] : seg1[0];
  const s2 = seg2[0] === center ? seg2[1] : seg2[0];
  if (s1 === center || s2 === center || s1 === s2) return null;
  return { center, s1, s2 };
}

/** Connected components (as point arrays) of an undirected edge list. */
function components(edges: [PointId, PointId][]): PointId[][] {
  const parent = new Map<PointId, PointId>();
  const find = (x: PointId): PointId => {
    let r = parent.get(x) ?? x;
    if (!parent.has(x)) parent.set(x, x);
    while (r !== parent.get(r)) {
      const next = parent.get(r)!;
      r = next;
    }
    return r;
  };
  const union = (x: PointId, y: PointId) => {
    parent.set(find(x), find(y));
  };
  for (const [u, v] of edges) {
    if (!parent.has(u)) parent.set(u, u);
    if (!parent.has(v)) parent.set(v, v);
    union(u, v);
  }
  const groups = new Map<PointId, PointId[]>();
  for (const node of parent.keys()) {
    const root = find(node);
    const arr = groups.get(root) ?? [];
    arr.push(node);
    groups.set(root, arr);
  }
  return [...groups.values()];
}

/** All 4-element subsets of `arr`. */
function combos4(arr: PointId[]): PointId[][] {
  const out: PointId[][] = [];
  const n = arr.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++)
        for (let l = k + 1; l < n; l++)
          out.push([arr[i], arr[j], arr[k], arr[l]]);
  return out;
}

export const concyclic_equal_radii: Rule = {
  id: "concyclic_equal_radii",
  name: "equal radii ⇒ concyclic",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const emitted = new Set<string>();

    // Group O-spoke edges by their recovered centre.
    const byCenter = new Map<PointId, [PointId, PointId][]>();
    for (const f of congsOf(cited)) {
      const e = spokeEdge(f);
      if (!e) continue;
      const arr = byCenter.get(e.center) ?? [];
      arr.push([e.s1, e.s2]);
      byCenter.set(e.center, arr);
    }

    for (const [center, edges] of byCenter) {
      const cO = coords[center];
      if (!cO) continue;

      for (const comp of components(edges)) {
        if (comp.length < 4) continue;

        for (const quad of combos4(comp)) {
          if (quad.includes(center)) continue;
          const cs = quad.map((p) => coords[p]);
          if (cs.some((c) => !c)) continue;

          // Pairwise-distinct rim points (no coincident points).
          let distinct = true;
          for (let i = 0; i < 4 && distinct; i++)
            for (let j = i + 1; j < 4; j++)
              if (dist(cs[i], cs[j]) < EPS) distinct = false;
          if (!distinct) continue;

          // O genuinely equidistant from all four (non-zero radius), and O
          // distinct from every rim point.
          const r = dist(cO, cs[0]);
          if (r < EPS) continue;
          let equi = true;
          for (let i = 0; i < 4 && equi; i++) {
            if (dist(cO, cs[i]) < EPS) equi = false;
            if (Math.abs(dist(cO, cs[i]) - r) > EPS * Math.max(1, r))
              equi = false;
          }
          if (!equi) continue;

          // Reject degenerate circle: no three of the four collinear.
          let collinear = false;
          const triples = [
            [0, 1, 2],
            [0, 1, 3],
            [0, 2, 3],
            [1, 2, 3],
          ];
          for (const [i, j, k] of triples)
            if (isCollinear(cs[i], cs[j], cs[k])) collinear = true;
          if (collinear) continue;

          // Final concyclicity check, matching the truth checker for `cyclic`.
          const o = circumcenter(cs[0], cs[1], cs[2]);
          if (!o) continue;
          const rr = dist(cs[0], o);
          if (Math.abs(dist(cs[3], o) - rr) > EPS * Math.max(1, rr)) continue;

          const candidate = rel("cyclic", quad);
          const key = canonicalKey(candidate);
          if (emitted.has(key)) continue;
          emitted.add(key);
          out.push(candidate);
        }
      }
    }

    return out;
  },
};
