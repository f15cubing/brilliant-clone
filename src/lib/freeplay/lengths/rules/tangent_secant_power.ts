/**
 * Tangent–secant power of a point (LENGTH layer).
 *
 * From an external point M, let MA be TANGENT to a circle (centre O) at A, and
 * let a SECANT through M meet the circle at B and R. Then the tangent length is
 * the geometric mean of the secant segments:
 *
 *   MA² = MB · MR,   equivalently   MA/MB = MR/MA.
 *
 * This is the missing companion of the shipped `power_of_a_point` rule (which
 * handles chord/chord and secant/secant), and the precise lemma at the heart of
 * several contest problems:
 *   - JBMO Shortlist 2005 G2 (ROM): with M the midpoint of the tangent segment
 *     AP and the secant B–M–R, the crux is MA² = MB·MR.
 *   - JBMO Shortlist 2015 G2 (MOL): the crux is MB² = MA·MC (tangent at B from
 *     the midpoint M of BP, secant M–A–C) — the same lemma with relabelled points.
 *
 * We emit the relation as a RATIO so it lands in the length subsystem:
 *
 *   eqratio(M,A,M,B, M,R,M,A)   —  MA/MB = MR/MA   (⇔ MA² = MB·MR)
 *
 * and the equivalent pairing MA/MR = MB/MA. These are ratio facts AR (angles
 * only) and the existing length rules cannot produce — see the test's GAP check
 * (existing rules return `unjustified`).
 *
 * PREMISES (all ordinary facts, all load-bearing):
 *   cong(O,A,O,B)        — B is on the circle centred O through A (|OB| = |OA|)
 *   cong(O,A,O,R)        — R is on the same circle               (|OR| = |OA|)
 *   perp(O,A,A,M)        — OA ⊥ AM, i.e. MA is TANGENT at A (M on the tangent line)
 *   coll(M,B,R)          — the secant: M, B, R are collinear
 * O is the circle's centre, A the tangent point, M the external point, B & R the
 * secant's two circle contacts. O / A / M are recovered from the `perp` fact (A
 * is the shared vertex; the centre is whichever far point carries the equal-radii
 * `cong`s, the other far point is M); B & R are the secant `coll`'s non-M points,
 * each required to be equidistant-from-O-as-A by a cited `cong`.
 *
 * SIGN CONVENTION — UNSIGNED magnitudes. A point on the tangent at A is always
 * OUTSIDE the circle (the tangent line meets the circle only at A), so M is
 * external: every secant through M meets the circle on the SAME side of M (B and
 * R on a common ray from M), so the signed product MB·MR is positive and equals
 * |MB|·|MR|. The tangent length squared is the power of M, hence MA² = MB·MR with
 * unsigned magnitudes. The `sameRayFrom(M,B,R)` guard makes "M external" explicit.
 *
 * SOUNDNESS — the conclusion is a logical consequence of the CITED premises:
 *   O equidistant from A,B,R ⇒ A,B,R on a circle (centre O); MA ⊥ OA ⇒ MA tangent
 *   at A ⇒ power(M) = |MO|²−ρ² = MA² (right triangle OAM); M,B,R collinear with
 *   B,R on the circle ⇒ power(M) = signed MB·MR = |MB|·|MR| (M external). Hence
 *   MA² = MB·MR. The rule never reads the conclusion off the figure: it requires
 *   the tangency (`perp`), both circle memberships (`cong`), and the secant
 *   (`coll`) to be cited, and re-checks each numerically as a coordinate guard.
 *   A false figure (not tangent, point off the circle, M not on the secant) emits
 *   nothing, and every emitted `eqratio` is additionally gated by `factHoldsL`.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { dist, dot, isCollinear, norm, sameRayFrom, sub, type V } from "@/lib/freeplay/geom";
import { canonicalKeyL, eqratio, factHoldsL, type EqRatio, type LRule } from "../dsl";

const TOL = 1e-6;
const DEGEN = 1e-9;

const relsOf = (cited: Fact[], name: string): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === name);

/** Are unordered pairs {a,b} and {c,d} the same segment? */
const sameSeg = (a: PointId, b: PointId, c: PointId, d: PointId): boolean =>
  (a === c && b === d) || (a === d && b === c);

/** Unsigned right angle at A between rays A→O and A→M (|cos| ≈ 0). */
function isRightAngle(O: V, A: V, M: V): boolean {
  const u = sub(O, A);
  const w = sub(M, A);
  const nu = norm(u);
  const nw = norm(w);
  if (nu < DEGEN || nw < DEGEN) return false;
  return Math.abs(dot(u, w)) / (nu * nw) < 1e-6;
}

export const tangent_secant_power: LRule = {
  id: "tangent_secant_power",
  name: "tangent-secant power",
  derive(cited, { coords }) {
    const out: EqRatio[] = [];
    const perps = relsOf(cited, "perp");
    const congs = relsOf(cited, "cong");
    const colls = relsOf(cited, "coll");
    if (perps.length === 0 || congs.length < 2 || colls.length === 0) return out;

    const emitted = new Set<string>();
    const push = (f: EqRatio) => {
      const k = canonicalKeyL(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    for (const perp of perps) {
      const [p0, p1, p2, p3] = perp.points;
      // The tangent point A is the vertex shared by the two perpendicular arms.
      const seg1 = [p0, p1];
      const seg2 = [p2, p3];
      const shared = seg1.filter((p) => seg2.includes(p));
      if (shared.length !== 1) continue;
      const A = shared[0];
      const end1 = seg1.find((p) => p !== A);
      const end2 = seg2.find((p) => p !== A);
      if (end1 === undefined || end2 === undefined) continue;

      // Either far endpoint could be the centre O (the other is then M). The
      // centre is the one that carries the equal-radii `cong`s; we try both.
      for (const [O, M] of [
        [end1, end2],
        [end2, end1],
      ] as const) {
        if (O === A || M === A || O === M) continue;

        // Points proven to be on the circle (centre O, radius OA) by a cited
        // cong(O,A,O,X). A is on it by definition.
        const radial = new Set<PointId>([A]);
        for (const cg of congs) {
          const [a, b, c, d] = cg.points;
          if (sameSeg(a, b, O, A) && (c === O || d === O)) {
            radial.add(c === O ? d : c);
          } else if (sameSeg(c, d, O, A) && (a === O || b === O)) {
            radial.add(a === O ? b : a);
          }
        }

        for (const cl of colls) {
          if (!cl.points.includes(M)) continue;
          const others = cl.points.filter((p) => p !== M);
          for (let i = 0; i < others.length; i++) {
            for (let j = i + 1; j < others.length; j++) {
              const B = others[i];
              const R = others[j];
              if (B === A || R === A || B === R) continue;
              if (!radial.has(B) || !radial.has(R)) continue;

              const cO = coords[O];
              const cA = coords[A];
              const cM = coords[M];
              const cB = coords[B];
              const cR = coords[R];
              if (!cO || !cA || !cM || !cB || !cR) continue;

              const ma = dist(cM, cA);
              const mb = dist(cM, cB);
              const mr = dist(cM, cR);
              if (ma < DEGEN || mb < DEGEN || mr < DEGEN) continue;

              // GUARD 1 — A, B, R genuinely on one circle centred O.
              const ra = dist(cO, cA);
              const rb = dist(cO, cB);
              const rr = dist(cO, cR);
              if (ra < DEGEN) continue;
              if (Math.abs(ra - rb) > TOL * Math.max(1, ra)) continue;
              if (Math.abs(ra - rr) > TOL * Math.max(1, ra)) continue;

              // GUARD 2 — MA is tangent at A: OA ⊥ AM.
              if (!isRightAngle(cO, cA, cM)) continue;

              // GUARD 3 — the secant: M, B, R collinear and (M external) B, R on
              // the SAME ray from M, so |MB|·|MR| is the (positive) power of M.
              if (!isCollinear(cM, cB, cR)) continue;
              if (!sameRayFrom(cM, cB, cR)) continue;

              // GUARD 4 — the power identity MA² = MB·MR holds numerically.
              if (Math.abs(ma * ma - mb * mr) > TOL * Math.max(1, ma * ma)) continue;

              const r1 = eqratio(M, A, M, B, M, R, M, A); // MA/MB = MR/MA
              const r2 = eqratio(M, A, M, R, M, B, M, A); // MA/MR = MB/MA
              if (factHoldsL(r1, coords)) push(r1);
              if (factHoldsL(r2, coords)) push(r2);
            }
          }
        }
      }
    }

    return out;
  },
};
