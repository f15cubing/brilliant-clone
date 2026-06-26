/**
 * Perpendicular bisector ⇒ equidistant (research candidate).
 *
 * If M is the midpoint of AB and the line MX is perpendicular to AB, then every
 * point X on that perpendicular is equidistant from A and B: XA = XB.
 *
 * DSL encoding (existing predicates only):
 *   midp(M, A, B)        — M is the midpoint of segment AB
 *   perp(M, X, A, B)     — line MX ⊥ line AB  (symmetric: any ordering accepted)
 *   ⇒ cong(X, A, X, B)
 *
 * This emits a LENGTH equality (cong), which the AR angle table cannot derive —
 * a genuine gap in the shipped engine.
 *
 * Soundness: `perp` in the DSL is symmetric in both lines and within each line
 * (see `relKey`/`canonicalKey` in dsl.ts). To recognize the perpendicularity no
 * matter how the learner ordered it, we treat each cited `perp` as two
 * UNORDERED point-pairs {p0,p1} and {p2,p3} and look for one whose pairs are
 * exactly {M,X} and {A,B}; X is then the partner of M on the non-AB line. The
 * fact is only emitted after coordinate guards confirm M is the midpoint, MX⊥AB,
 * X is off line AB, and |XA| ≈ |XB|.
 */
import type { Fact, PointId } from "@/lib/freeplay/dsl";
import { rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { dist, dot, isCollinear, sub, unit } from "@/lib/freeplay/geom";

const EPS = 1e-6;

const samePair = (a: PointId, b: PointId, c: PointId, d: PointId): boolean =>
  (a === c && b === d) || (a === d && b === c);

export const perp_bisector: Rule = {
  id: "perp_bisector",
  name: "perpendicular bisector ⇒ equidistant",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const seen = new Set<string>();

    const midps = cited.filter(
      (f): f is Extract<Fact, { kind: "rel" }> =>
        f.kind === "rel" && f.name === "midp",
    );
    const perps = cited.filter(
      (f): f is Extract<Fact, { kind: "rel" }> =>
        f.kind === "rel" && f.name === "perp",
    );

    for (const mp of midps) {
      const [M, A, B] = mp.points;
      if (!M || !A || !B) continue;

      for (const pp of perps) {
        const [p0, p1, p2, p3] = pp.points;
        if (!p0 || !p1 || !p2 || !p3) continue;

        // The two lines of the perp fact, as unordered pairs. We need one line
        // to be {A,B} and the other to contain M; X is M's partner there.
        const lines: [PointId, PointId][] = [
          [p0, p1],
          [p2, p3],
        ];
        for (let li = 0; li < 2; li++) {
          const ab = lines[li];
          const other = lines[1 - li];
          if (!samePair(ab[0], ab[1], A, B)) continue;
          let X: PointId | null = null;
          if (other[0] === M) X = other[1];
          else if (other[1] === M) X = other[0];
          if (!X || X === M || X === A || X === B) continue;

          // Coordinate guards.
          const cM = coords[M];
          const cA = coords[A];
          const cB = coords[B];
          const cX = coords[X];
          if (!cM || !cA || !cB || !cX) continue;

          // M is the midpoint of AB.
          const mid: [number, number] = [
            (cA[0] + cB[0]) / 2,
            (cA[1] + cB[1]) / 2,
          ];
          const ab2 = dist(cA, cB);
          if (dist(cM, mid) > EPS * Math.max(1, ab2)) continue;

          // Line MX ⊥ line AB.
          const uMX = unit(sub(cX, cM));
          const uAB = unit(sub(cB, cA));
          if (!uMX || !uAB) continue;
          if (Math.abs(dot(uMX, uAB)) > EPS) continue;

          // X must not lie on line AB (otherwise it isn't a genuine apex).
          if (isCollinear(cA, cB, cX)) continue;

          // Final numeric check: XA = XB.
          const xa = dist(cX, cA);
          const xb = dist(cX, cB);
          if (Math.abs(xa - xb) > EPS * Math.max(1, xa, xb)) continue;

          const key = `${X}|${[A, B].sort().join(",")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(rel("cong", [X, A, X, B]));
        }
      }
    }
    return out;
  },
};
