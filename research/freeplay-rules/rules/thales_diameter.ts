/**
 * Thales' theorem — an angle inscribed in a semicircle is a right angle
 * (research candidate, ANGLE/incidence layer).
 *
 * If BC is a DIAMETER of a circle centred O (so O is the midpoint of BC) and A
 * is any other point of that circle (|OA| = |OB| = |OC|), then ∠BAC = 90°:
 *
 *   midp(O,B,C)          — O is the midpoint of BC (BC is a diameter)
 *   cong(O,A,O,B)        — A is on the circle (radius OA = radius OB)
 *   ⇒ perp(A,B,A,C)      — ∠BAC = 90°
 *
 * This emits a PERPENDICULARITY that the AR angle table cannot reach: AR is
 * cite-driven over para/perp/eqangle/aval/coll and ignores `cong`/`midp`, so it
 * has no way to learn that BC is a diameter or that A is on the circle. The
 * shipped `inscribed_angle` produces equal inscribed angles on a `cyclic`, but
 * cannot manufacture the specific 90° that the SEMICIRCLE (a diameter) forces.
 * The test's GAP check confirms neither the shipped engine nor the existing
 * research rules derive it (both return `unjustified`).
 *
 * SOUNDNESS — the conclusion is a logical consequence of the CITED premises:
 *   O the midpoint of BC ⇒ |OB| = |OC|; together with the cited |OA| = |OB| this
 *   gives |OA| = |OB| = |OC|, so A, B, C lie on a circle centred O with BC a
 *   diameter. The inscribed angle subtending a diameter is 90°, hence ∠BAC = 90°.
 *   The rule requires BOTH the midpoint and the equal-radius facts to be cited and
 *   re-checks each numerically (O is the midpoint of BC; |OA| ≈ |OB| ≈ |OC|; A off
 *   line BC so the triangle is non-degenerate), and only then emits — and as a
 *   final guard confirms ∠BAC ≈ 90° numerically. Dropping either premise yields no
 *   emission EVEN WHEN the figure still happens to satisfy ∠BAC = 90° (proven by
 *   the soundness/minimality tests): the rule never reads the right angle off the
 *   coordinates in place of a cited premise.
 */
import type { Fact, PointId } from "@/lib/freeplay/dsl";
import { rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { angleDeg, dist, isCollinear } from "@/lib/freeplay/geom";

const EPS = 1e-6;

const inPair = (pair: [PointId, PointId], p: PointId): boolean =>
  pair[0] === p || pair[1] === p;
const other = (pair: [PointId, PointId], p: PointId): PointId =>
  pair[0] === p ? pair[1] : pair[0];

export const thales_diameter: Rule = {
  id: "thales_diameter",
  name: "Thales (diameter subtends a right angle)",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const seen = new Set<string>();

    const midps = cited.filter(
      (f): f is Extract<Fact, { kind: "rel" }> =>
        f.kind === "rel" && f.name === "midp",
    );
    const congs = cited.filter(
      (f): f is Extract<Fact, { kind: "rel" }> =>
        f.kind === "rel" && f.name === "cong",
    );

    for (const mp of midps) {
      const [O, B, C] = mp.points;
      if (!O || !B || !C) continue;

      for (const cg of congs) {
        const s1: [PointId, PointId] = [cg.points[0], cg.points[1]];
        const s2: [PointId, PointId] = [cg.points[2], cg.points[3]];
        // One side must be a radius to a diameter end (O–B or O–C); the other a
        // radius O–A to the apex A.
        for (const [radSide, apexSide] of [
          [s1, s2],
          [s2, s1],
        ] as const) {
          if (!inPair(radSide, O) || !inPair(apexSide, O)) continue;
          const end = other(radSide, O); // should be B or C
          if (end !== B && end !== C) continue;
          const A = other(apexSide, O);
          if (A === O || A === B || A === C) continue;

          const cO = coords[O];
          const cA = coords[A];
          const cB = coords[B];
          const cC = coords[C];
          if (!cO || !cA || !cB || !cC) continue;

          // GUARD 1 — O is the midpoint of BC (the cited diameter).
          const mid: [number, number] = [(cB[0] + cC[0]) / 2, (cB[1] + cC[1]) / 2];
          const bc = dist(cB, cC);
          if (bc < EPS) continue;
          if (dist(cO, mid) > EPS * Math.max(1, bc)) continue;

          // GUARD 2 — A, B, C concyclic about O: |OA| = |OB| = |OC|.
          const ra = dist(cO, cA);
          const rb = dist(cO, cB);
          const rc = dist(cO, cC);
          if (ra < EPS) continue;
          if (Math.abs(ra - rb) > EPS * Math.max(1, ra)) continue;
          if (Math.abs(ra - rc) > EPS * Math.max(1, ra)) continue;

          // GUARD 3 — non-degenerate: A off line BC.
          if (isCollinear(cB, cA, cC)) continue;

          // GUARD 4 — the conclusion ∠BAC = 90° (redundant given 1–3, kept safe).
          if (Math.abs(angleDeg(cB, cA, cC) - 90) > 1e-4) continue;

          const key = `${A}|${[B, C].sort().join(",")}`;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(rel("perp", [A, B, A, C]));
        }
      }
    }
    return out;
  },
};
