/**
 * Pascal's theorem (research candidate).
 *
 * If six points lie on a single conic — here a CIRCLE — then for any hexagon
 * ABCDEF inscribed in it, the three intersection points of opposite sides
 *   X = AB ∩ DE,  Y = BC ∩ EF,  Z = CD ∩ FA
 * are collinear. The rule emits the projective incidence `coll(X, Y, Z)`, which
 * the AR angle table cannot produce (it is a non-angle collinearity) — a genuine
 * gap in the shipped engine, structurally analogous to `pappus`.
 *
 * ── How "six points on ONE circle" is certified ─────────────────────────────
 * The DSL `cyclic` predicate pins only 4 points. So, exactly like
 * `concyclic_merge`, the common circle is reconstructed from CITED `cyclic`
 * facts: two cyclic facts that share ≥3 points INCLUDING a non-collinear triple
 * lie on the same circle (3 non-collinear points determine a unique circle).
 * Chaining such merges yields the maximal set of points provably on one circle.
 * Concyclicity is therefore PROVEN from the cited facts, never read off the
 * coordinates. Only when that set has ≥6 points do we look for a Pascal hexagon.
 *
 * ── How the opposite-side intersections are matched ─────────────────────────
 * Like `pappus`, each opposite-side intersection must coincide with a NAMED
 * point. To keep every cited premise NECESSARY (minimality), the intersection
 * point is anchored by the CITED `coll` facts that place it on both side-lines:
 * X is the point with cited `coll(A,B,X)` and `coll(D,E,X)`. We then confirm
 * numerically that X is exactly `lineIntersect(AB, DE)` (within tolerance). The
 * `coll` facts thus genuinely participate — dropping one makes the matching
 * fail. We try every hexagon ordering of the six concyclic points.
 *
 * ── Soundness ───────────────────────────────────────────────────────────────
 * `coll(X,Y,Z)` is emitted only when (a) the six points are pinned to one circle
 * by the cited cyclic facts, (b) each intersection is a CITED named point lying
 * (numerically) on both of its side-lines, and (c) X, Y, Z are numerically
 * collinear. A non-collinear triple is never emitted.
 *
 * ── Projective "point at infinity" branch (optional) ────────────────────────
 * Mirroring `pappus`: if exactly one opposite-side pair is parallel (its
 * intersection is at infinity) AND the corresponding `para` is cited, the
 * conclusion is that the line through the other two intersection points is
 * parallel to that direction — emitted as a `para`. The finite collinear case
 * is the priority; this branch only fires when the matching `para` is cited.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { factEqual, rel } from "@/lib/freeplay/dsl";
import type { Coords } from "@/lib/freeplay/check";
import type { Rule } from "@/lib/freeplay/rules";
import { cross, isCollinear, lineIntersect, sub, unit, type V } from "@/lib/freeplay/geom";

const relsOf = (cited: Fact[], name: Rel["name"]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === name);

/** Are there three points among `ids` that are not collinear? */
function hasNonCollinearTriple(ids: PointId[], coords: Coords): boolean {
  for (let a = 0; a < ids.length; a++)
    for (let b = a + 1; b < ids.length; b++)
      for (let c = b + 1; c < ids.length; c++) {
        const ca = coords[ids[a]];
        const cb = coords[ids[b]];
        const cc = coords[ids[c]];
        if (ca && cb && cc && !isCollinear(ca, cb, cc)) return true;
      }
  return false;
}

/**
 * From cited `cyclic` facts, the maximal point sets provably on ONE circle.
 * Two groups merge when they share ≥3 points including a non-collinear triple.
 */
function commonCircleGroups(cyclics: Rel[], coords: Coords): PointId[][] {
  const groups: (Set<PointId> | null)[] = cyclics.map((c) => new Set(c.points));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < groups.length; i++) {
      const gi = groups[i];
      if (!gi) continue;
      for (let j = i + 1; j < groups.length; j++) {
        const gj = groups[j];
        if (!gj) continue;
        const shared = [...gi].filter((p) => gj.has(p));
        if (shared.length < 3) continue;
        if (!hasNonCollinearTriple(shared, coords)) continue;
        for (const p of gj) gi.add(p);
        groups[j] = null;
        changed = true;
      }
    }
  }
  return groups.filter((g): g is Set<PointId> => g !== null).map((g) => [...g]);
}

/** Third points `w` with a cited `coll(u, v, w)` (3-point colls only). */
function thirdPointsOnLine(colls: Rel[], u: PointId, v: PointId): PointId[] {
  const out: PointId[] = [];
  for (const c of colls) {
    const pts = c.points;
    if (pts.length !== 3) continue;
    if (!pts.includes(u) || !pts.includes(v)) continue;
    const w = pts.find((p) => p !== u && p !== v);
    if (w && w !== u && w !== v) out.push(w);
  }
  return out;
}

const parallel = (a: V, b: V, c: V, d: V): boolean => {
  const p = unit(sub(b, a));
  const q = unit(sub(d, c));
  return !!p && !!q && Math.abs(cross(p, q)) < 1e-6;
};

/** All permutations of a small array. */
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
    for (const p of permutations(rest)) out.push([arr[i], ...p]);
  }
  return out;
}

/** All k-element combinations (indices preserved order) of `arr`. */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const out: T[][] = [];
  for (let i = 0; i <= arr.length - k; i++)
    for (const tail of combinations(arr.slice(i + 1), k - 1))
      out.push([arr[i], ...tail]);
  return out;
}

type Side = [PointId, PointId];
type Res =
  | { kind: "fin"; id: PointId }
  | { kind: "inf"; l1: Side; l2: Side }
  | null;

/**
 * Resolve the intersection of opposite sides `l1`, `l2`:
 *  - finite & matched to a cited named point on BOTH lines → {fin, id}
 *  - parallel (intersection at infinity) → {inf, l1, l2}
 *  - finite but no cited named point coincides → null (correspondence rejected)
 */
function resolveCross(l1: Side, l2: Side, colls: Rel[], coords: Coords): Res {
  const a = coords[l1[0]];
  const b = coords[l1[1]];
  const c = coords[l2[0]];
  const d = coords[l2[1]];
  if (!a || !b || !c || !d) return null;
  const ip = lineIntersect(a, b, c, d);
  if (ip === null) return { kind: "inf", l1, l2 };

  const cands = thirdPointsOnLine(colls, l1[0], l1[1]).filter((w) =>
    thirdPointsOnLine(colls, l2[0], l2[1]).includes(w),
  );
  const tol = 1e-6 * (1 + Math.abs(ip[0]) + Math.abs(ip[1]));
  for (const id of cands) {
    const ci = coords[id];
    if (!ci) continue;
    if (Math.hypot(ci[0] - ip[0], ci[1] - ip[1]) < tol) return { kind: "fin", id };
  }
  return null;
}

export const pascal: Rule = {
  id: "pascal",
  name: "Pascal's theorem",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const seen = new Set<string>();
    const colls = relsOf(cited, "coll");
    const paras = relsOf(cited, "para");

    const groups = commonCircleGroups(relsOf(cited, "cyclic"), coords);

    for (const group of groups) {
      if (group.length < 6) continue;

      for (const six of combinations(group, 6)) {
        for (const [a, b, c, d, e, f] of permutations(six)) {
          // Opposite sides of hexagon a-b-c-d-e-f.
          const pairs: [Side, Side][] = [
            [[a, b], [d, e]], // X
            [[b, c], [e, f]], // Y
            [[c, d], [f, a]], // Z
          ];
          const res = pairs.map(([l1, l2]) => resolveCross(l1, l2, colls, coords));
          if (res.some((r) => r === null)) continue;

          const fins = res.filter((r): r is { kind: "fin"; id: PointId } => r!.kind === "fin");
          const infs = res.filter(
            (r): r is { kind: "inf"; l1: Side; l2: Side } => r!.kind === "inf",
          );

          if (infs.length === 0) {
            const [X, Y, Z] = fins.map((r) => r.id);
            if (X === Y || Y === Z || X === Z) continue;
            const cX = coords[X];
            const cY = coords[Y];
            const cZ = coords[Z];
            if (!cX || !cY || !cZ) continue;
            if (!isCollinear(cX, cY, cZ)) continue;
            const key = [X, Y, Z].sort().join(",");
            if (seen.has(key)) continue;
            seen.add(key);
            out.push(rel("coll", [X, Y, Z]));
          } else if (infs.length === 1 && fins.length === 2) {
            // Projective branch: the parallel opposite pair must be a CITED
            // `para` (so it is a necessary premise), exactly like pappus.
            const inf = infs[0];
            const paraCited = paras.some((pf) =>
              factEqual(pf, rel("para", [inf.l1[0], inf.l1[1], inf.l2[0], inf.l2[1]])),
            );
            if (!paraCited) continue;
            const [X, Y] = fins.map((r) => r.id);
            if (X === Y) continue;
            const cX = coords[X];
            const cY = coords[Y];
            if (!cX || !cY) continue;
            for (const [p, q] of [inf.l1, inf.l2] as Side[]) {
              const cp = coords[p];
              const cq = coords[q];
              if (!cp || !cq) continue;
              if (parallel(cX, cY, cp, cq)) {
                const key = `para:${[X, Y].sort().join(",")}|${[p, q].sort().join(",")}`;
                if (seen.has(key)) continue;
                seen.add(key);
                out.push(rel("para", [X, Y, p, q]));
              }
            }
          }
        }
      }
    }
    return out;
  },
};
