/**
 * Reim's theorem (research candidate).
 *
 * Two circles ω₁, ω₂ meet at P and Q. A line through P meets ω₁ again at A and
 * ω₂ again at B; a line through Q meets ω₁ again at C and ω₂ again at D. Then
 * AC ∥ BD.
 *
 * DSL encoding (existing predicates only):
 *   cyclic(P,Q,A,C)   — ω₁ through P,Q,A,C
 *   cyclic(P,Q,B,D)   — ω₂ through P,Q,B,D
 *   coll(A,P,B)       — line through P (A on ω₁, B on ω₂)
 *   coll(C,Q,D)       — line through Q (C on ω₁, D on ω₂)
 *   ⇒ para(A,C,B,D)
 *
 * This is the workhorse "parallel from two circles" step (e.g. the spiral-
 * similarity / Reim configurations that recur in olympiad circle problems, and
 * the missing link to finish the IMO 2019 P2 chain).
 */
import type { Fact, PointId } from "@/lib/freeplay/dsl";
import { rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { cross, sub, unit } from "@/lib/freeplay/geom";

/** All 3-point sub-collinearities present in the cited facts. */
function collTriples(cited: Fact[]): PointId[][] {
  const out: PointId[][] = [];
  for (const f of cited) {
    if (f.kind !== "rel" || f.name !== "coll") continue;
    const p = f.points;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        for (let k = j + 1; k < p.length; k++) out.push([p[i], p[j], p[k]]);
  }
  return out;
}

/** Is the line through `a,b` parallel to the line through `c,d`? */
function isPara(coords: Record<PointId, [number, number]>, a: PointId, b: PointId, c: PointId, d: PointId): boolean {
  const ca = coords[a];
  const cb = coords[b];
  const cc = coords[c];
  const cd = coords[d];
  if (!ca || !cb || !cc || !cd) return false;
  const u = unit(sub(cb, ca));
  const w = unit(sub(cd, cc));
  return !!u && !!w && Math.abs(cross(u, w)) < 1e-6;
}

export const reim: Rule = {
  id: "reim",
  name: "Reim's theorem",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const cyclics = cited.filter(
      (f): f is Extract<Fact, { kind: "rel" }> =>
        f.kind === "rel" && f.name === "cyclic",
    );
    const triples = collTriples(cited);

    for (let i = 0; i < cyclics.length; i++) {
      for (let j = 0; j < cyclics.length; j++) {
        if (i === j) continue;
        const c1 = [...new Set(cyclics[i].points)];
        const c2 = [...new Set(cyclics[j].points)];
        const set2 = new Set(c2);
        const shared = c1.filter((p) => set2.has(p));
        if (shared.length !== 2) continue;
        const e1 = c1.filter((p) => !set2.has(p)); // ω₁-only points
        const set1 = new Set(c1);
        const e2 = c2.filter((p) => !set1.has(p)); // ω₂-only points
        if (e1.length !== 2 || e2.length !== 2) continue;

        const [P, Q] = shared;

        // Line through P: contains P, one a∈e1, one b∈e2.
        // Line through Q: contains Q, the other c∈e1, the other d∈e2.
        const hasAll = (tri: PointId[], pts: PointId[]) =>
          pts.every((x) => tri.includes(x));

        for (const a of e1) {
          for (const b of e2) {
            const c = e1.find((x) => x !== a);
            const d = e2.find((x) => x !== b);
            if (!c || !d) continue;
            const lineP = triples.some((t) => hasAll(t, [P, a, b]));
            const lineQ = triples.some((t) => hasAll(t, [Q, c, d]));
            if (!lineP || !lineQ) continue;
            if (a === c || b === d) continue;
            if (isPara(coords, a, c, b, d)) {
              out.push(rel("para", [a, c, b, d]));
            }
          }
        }
      }
    }
    return out;
  },
};
