/**
 * Power of a point (LENGTH layer).
 *
 * Two lines through a common point P each meet a circle in two points. If the
 * four contact points A, B (on one line) and C, D (on the other) are concyclic,
 * then the products of the signed segment lengths from P are equal:
 *
 *   PA · PB = PC · PD.
 *
 * This fires in BOTH standard configurations:
 *   - INTERSECTING CHORDS: P is INSIDE the circle, chords AB and CD cross at P
 *     (P lies strictly between A,B and between C,D).
 *   - SECANTS FROM AN EXTERNAL POINT: P is OUTSIDE, two secants P-A-B and P-C-D
 *     each cut the circle (A,B on the same side of P, likewise C,D).
 *
 * We re-express the equal-product relation as a RATIO so it lands in the length
 * subsystem (the engine has no length/product table of its own):
 *
 *   eqratio(P,A,P,C, P,D,P,B)   —  PA/PC = PD/PB   (⇔ PA·PB = PC·PD)
 *
 * and additionally the equivalent pairing PA/PD = PC/PB.
 *
 * PREMISES (ordinary facts):
 *   cyclic(A,B,C,D)   — the four contact points are concyclic
 *   coll(P,A,B)       — P, A, B collinear (the first chord/secant through P)
 *   coll(P,C,D)       — P, C, D collinear (the second chord/secant through P)
 * P is recovered as the point SHARED by the two collinearities, and the remaining
 * two points of each collinearity are that line's pair of circle contacts.
 *
 * SIGN CONVENTION — UNSIGNED magnitudes. We guard |PA|·|PB| = |PC|·|PD| using
 * absolute distances rather than signed/directed lengths. This is SOUND for both
 * configurations because the power of P with respect to the circle has a single
 * sign: if P is inside, every line through P meets the circle on opposite sides
 * of P (so every signed product is negative and equal), and if P is outside,
 * every line meets it on the same side (every signed product positive and equal).
 * Hence equality of unsigned magnitudes is equivalent to equality of the signed
 * powers here, and the same guard handles inside (chords) and outside (secants).
 *
 * SOUNDNESS
 * - The four points must be genuinely concyclic (circumcircle of A,B,C checked,
 *   D required equidistant) — a non-concyclic quadruple is rejected.
 * - P must actually lie on BOTH lines (numeric collinearity of P with each pair).
 * - P must be distinct from the four contacts (it is the lines' intersection, not
 *   a point on the circle), and all points must be non-degenerate.
 * - The power equality is checked numerically, and every emitted `eqratio` is
 *   additionally gated by `factHoldsL` — a false proportion is never produced.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { circumcenter, dist, isCollinear, norm, sub, type V } from "@/lib/freeplay/geom";
import { canonicalKeyL, eqratio, factHoldsL, type EqRatio, type LRule } from "../dsl";

const TOL = 1e-6;
const DEGEN = 1e-9;

const collsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "coll");

const cyclicsOf = (cited: Fact[]): Rel[] =>
  cited.filter(
    (f): f is Rel => f.kind === "rel" && f.name === "cyclic" && f.points.length === 4,
  );

/** Are a,b,c,d concyclic? (circumcircle of a,b,c; d required on it) */
function concyclic(a: V, b: V, c: V, d: V): boolean {
  const o = circumcenter(a, b, c);
  if (!o) return false;
  const r = norm(sub(a, o));
  return Math.abs(norm(sub(d, o)) - r) < TOL * Math.max(1, r);
}

export const power_of_a_point: LRule = {
  id: "power_of_a_point",
  name: "power of a point",
  derive(cited, { coords }) {
    const out: EqRatio[] = [];
    const colls = collsOf(cited);
    const cyclics = cyclicsOf(cited);
    if (colls.length < 2 || cyclics.length === 0) return out;

    const emitted = new Set<string>();
    const push = (f: EqRatio) => {
      const k = canonicalKeyL(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    for (const cyc of cyclics) {
      const ring = new Set<PointId>(cyc.points);

      for (let i = 0; i < colls.length; i++) {
        for (let j = i + 1; j < colls.length; j++) {
          // P is the single point shared by the two collinearities.
          const set1 = new Set(colls[i].points);
          const shared = colls[j].points.filter((p) => set1.has(p));
          if (shared.length !== 1) continue;
          const P = shared[0];

          // Each line's two non-P points are its pair of circle contacts.
          const line1 = colls[i].points.filter((p) => p !== P);
          const line2 = colls[j].points.filter((p) => p !== P);
          if (line1.length !== 2 || line2.length !== 2) continue;
          const [A, B] = line1;
          const [C, D] = line2;

          // The four contacts must be exactly the cyclic quadruple, and P must
          // NOT be one of them (P is the lines' meeting point, off the circle).
          const four = [A, B, C, D];
          if (new Set(four).size !== 4) continue;
          if (four.some((p) => !ring.has(p))) continue;
          if (ring.has(P)) continue;

          const cP = coords[P];
          const cA = coords[A];
          const cB = coords[B];
          const cC = coords[C];
          const cD = coords[D];
          if (!cP || !cA || !cB || !cC || !cD) continue;

          // Non-degenerate: the four segments from P must be genuine.
          const pa = dist(cP, cA);
          const pb = dist(cP, cB);
          const pc = dist(cP, cC);
          const pd = dist(cP, cD);
          if (pa < DEGEN || pb < DEGEN || pc < DEGEN || pd < DEGEN) continue;

          // GUARD 1 — the four contacts are genuinely concyclic.
          if (!concyclic(cA, cB, cC, cD)) continue;

          // GUARD 2 — P lies on BOTH lines (numeric collinearity).
          if (!isCollinear(cP, cA, cB) || !isCollinear(cP, cC, cD)) continue;

          // GUARD 3 — the power equality holds with UNSIGNED magnitudes
          //   |PA|·|PB| = |PC|·|PD|  (works for P inside AND outside).
          if (Math.abs(pa * pb - pc * pd) > TOL * Math.max(1, pa * pb)) continue;

          // Emit the ratio form(s); both are ⇔ PA·PB = PC·PD. Each is gated by
          // its own numeric truth check so a false fact is never produced.
          const r1 = eqratio(P, A, P, C, P, D, P, B); // PA/PC = PD/PB
          const r2 = eqratio(P, A, P, D, P, C, P, B); // PA/PD = PC/PB
          if (factHoldsL(r1, coords)) push(r1);
          if (factHoldsL(r2, coords)) push(r2);
        }
      }
    }

    return out;
  },
};
