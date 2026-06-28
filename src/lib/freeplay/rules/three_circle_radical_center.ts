/**
 * Three-circle radical centre (promoted from research/freeplay-rules) — the
 * radical-centre step of IMO 2024 Shortlist G3.
 *
 * ── The theorem ─────────────────────────────────────────────────────────────
 * Given three circles ω_A, ω_B, ω_C, their three pairwise radical axes
 * rad(ω_A,ω_C), rad(ω_B,ω_C), rad(ω_A,ω_B) concur at a single point Z — the
 * radical centre. Hence if Z is the intersection of two of them, it lies on the
 * third. Specialised to G3 with
 *   ω_A = (D,E,K,P),  ω_B = (C,D,Q,L),  ω_C = (K,L,P,Q):
 *   - rad(ω_A,ω_C) = line KP   (ω_A ∩ ω_C = {K,P}),
 *   - rad(ω_B,ω_C) = line LQ   (ω_B ∩ ω_C = {L,Q}),
 *   - rad(ω_A,ω_B) = line MD   (D common to ω_A,ω_B; M has equal power wrt both).
 * Given coll(K,P,Z) (Z on KP) and coll(M,D,Z) (Z on MD), Z is the radical centre,
 * so it lies on LQ: the rule emits `coll(L,Q,Z)`.
 *
 * ── Why this is a genuine GAP ────────────────────────────────────────────────
 * The conclusion is a COLLINEARITY produced from equality of circle POWERS — a
 * relation with no angle content and no DSL primitive for a "circle as a power
 * object". The AR layer consumes but never EMITS `coll`, and this is not an
 * angle-chase / Pappus / Pascal incidence; `coincident_direction_collinear`
 * repackages a shared direction, not a radical centre. So no shipped rule
 * produces this `coll` (the G3 gap test confirms it).
 *
 * ── How the configuration is matched (every cited premise load-bearing) ──────
 * ω_A, ω_B, ω_C are three cited `cyclic` facts with ω_A∩ω_C and ω_B∩ω_C each a
 * 2-point common chord ({K,P} and {L,Q}) and ω_A∩ω_B sharing the point D. Z is
 * the third point of the cited `coll(K,P,Z)` (it anchors Z on the axis KP), and
 * the cited `coll(M,D,Z)` supplies the axis MD whose endpoint D is common to
 * ω_A,ω_B and whose other endpoint M is equal-power wrt ω_A,ω_B (so MD is
 * genuinely rad(ω_A,ω_B)). Dropping ANY of the three `cyclic`s makes a circle —
 * hence a radical axis — unidentifiable; dropping either `coll` loses Z or the
 * MD axis. So the rule cannot fire without each premise — the load-bearing
 * property the verifier's minimality check enforces.
 *
 * ── Soundness ───────────────────────────────────────────────────────────────
 * `coll(L,Q,Z)` is emitted only when, in the coordinates: the three circles
 * exist; {K,P} lie on ω_A and ω_C, {L,Q} on ω_B and ω_C, D on ω_A and ω_B (the
 * common chords); M is equal-power wrt ω_A,ω_B (MD = rad(ω_A,ω_B)); Z lies on KP
 * and on MD (the cited colls) and has EQUAL POWER wrt all three circles (the
 * radical-centre certificate); and L,Q,Z are distinct and numerically collinear.
 * The radical-centre theorem makes the conclusion follow from the cited premises;
 * the equal-power guard is the load-bearing certificate and the final
 * collinearity check never lets a false `coll` be emitted.
 *
 * ── G3 closure caveat ───────────────────────────────────────────────────────
 * This rule closes the radical-centre STEP given the three circles. The third
 * circle ω_C = cyclic(K,L,P,Q) is a documented SECONDARY GAP of the G3 puzzle: it
 * reduces to the power-of-M length fact ME·MK = MC·ML (equivalently KL ∥ AB /
 * C,E,K,L concyclic), which the shipped engine cannot establish without the
 * auxiliary tangent-intersection point X and the radical axis of circles DEAM,
 * BCDM. See `src/lib/freeplay/puzzles/imo_shortlist_2024_g3.ts`.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import { isCollinear, type V } from "@/lib/freeplay/geom";
import type { Rule } from "@/lib/freeplay/rules";
import { circleOf, equalPower, onCircle, type Circle } from "./_radical";

const relsOf = (cited: Fact[], name: Rel["name"]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === name);

/** Third points `w` with a cited 3-point `coll(u, v, w)`. */
function thirdPointsOnLine(colls: Rel[], u: PointId, v: PointId): PointId[] {
  const out: PointId[] = [];
  for (const c of colls) {
    if (c.points.length !== 3) continue;
    if (!c.points.includes(u) || !c.points.includes(v)) continue;
    const w = c.points.find((p) => p !== u && p !== v);
    if (w && w !== u && w !== v) out.push(w);
  }
  return out;
}

/** Circle through a cyclic fact's points (first non-collinear triple). */
function circleFromPoints(pts: PointId[], coords: Record<PointId, V>): Circle | null {
  const ps = [...new Set(pts)];
  for (let i = 0; i < ps.length; i++)
    for (let j = i + 1; j < ps.length; j++)
      for (let k = j + 1; k < ps.length; k++) {
        const a = coords[ps[i]];
        const b = coords[ps[j]];
        const c = coords[ps[k]];
        if (!a || !b || !c) continue;
        if (isCollinear(a, b, c)) continue;
        return circleOf(a, b, c);
      }
  return null;
}

export const three_circle_radical_center: Rule = {
  id: "three_circle_radical_center",
  name: "three-circle radical centre",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const emitted = new Set<string>();
    const push = (f: Fact) => {
      const k = canonicalKey(f);
      if (!emitted.has(k)) {
        emitted.add(k);
        out.push(f);
      }
    };

    const cyc = relsOf(cited, "cyclic").map((c) => [...new Set(c.points)]);
    const colls = relsOf(cited, "coll").filter((c) => c.points.length === 3);

    // Ordered triple of circles (ω_A, ω_B, ω_C): ω_A∩ω_C and ω_B∩ω_C are 2-point
    // common chords (KP and LQ); ω_A∩ω_B shares the point D.
    for (let a = 0; a < cyc.length; a++) {
      for (let b = 0; b < cyc.length; b++) {
        for (let c = 0; c < cyc.length; c++) {
          if (a === b || b === c || a === c) continue;
          const A = cyc[a];
          const B = cyc[b];
          const Cc = cyc[c];
          const AC = A.filter((p) => Cc.includes(p)); // {K,P}
          const BC = B.filter((p) => Cc.includes(p)); // {L,Q}
          const AB = A.filter((p) => B.includes(p)); // {…, D}
          if (AC.length !== 2 || BC.length !== 2 || AB.length < 1) continue;
          const [K, P] = AC;
          const [L, Q] = BC;
          if (new Set([K, P, L, Q]).size !== 4) continue;

          const wA = circleFromPoints(A, coords);
          const wB = circleFromPoints(B, coords);
          const wC = circleFromPoints(Cc, coords);
          if (!wA || !wB || !wC) continue;

          const cK = coords[K];
          const cP = coords[P];
          const cL = coords[L];
          const cQ = coords[Q];
          if (!cK || !cP || !cL || !cQ) continue;

          // The 2-point chords must be genuine common chords of the circles.
          if (!onCircle(cK, wA) || !onCircle(cK, wC)) continue;
          if (!onCircle(cP, wA) || !onCircle(cP, wC)) continue;
          if (!onCircle(cL, wB) || !onCircle(cL, wC)) continue;
          if (!onCircle(cQ, wB) || !onCircle(cQ, wC)) continue;

          // Z anchored on the axis KP via a cited coll(K,P,Z).
          for (const Z of thirdPointsOnLine(colls, K, P)) {
            if (Z === K || Z === P || Z === L || Z === Q) continue;
            const cZ = coords[Z];
            if (!cZ) continue;

            // The MD axis: a cited coll through Z whose endpoint D is common to
            // ω_A,ω_B and whose other endpoint M is equal-power wrt ω_A,ω_B.
            for (const md of colls) {
              if (!md.points.includes(Z)) continue;
              const ends = md.points.filter((p) => p !== Z);
              if (ends.length !== 2) continue;
              for (const [M, D] of [
                [ends[0], ends[1]],
                [ends[1], ends[0]],
              ] as [PointId, PointId][]) {
                if (!AB.includes(D)) continue; // D common to ω_A and ω_B
                if (M === Z || M === D) continue;
                const cM = coords[M];
                const cD = coords[D];
                if (!cM || !cD) continue;

                // D really on both circles; M equal-power ⇒ MD = rad(ω_A,ω_B).
                if (!onCircle(cD, wA) || !onCircle(cD, wB)) continue;
                if (!equalPower(cM, wA, wB)) continue;

                // Z is the radical centre: equal power wrt all three circles.
                if (!equalPower(cZ, wA, wC)) continue;
                if (!equalPower(cZ, wA, wB)) continue;

                // Z on the cited axes KP and MD (re-checked numerically).
                if (!isCollinear(cK, cP, cZ)) continue;
                if (!isCollinear(cM, cD, cZ)) continue;

                // Conclusion: L, Q, Z distinct and collinear (Z on rad(ω_B,ω_C)).
                if (new Set([L, Q, Z]).size !== 3) continue;
                if (!isCollinear(cL, cQ, cZ)) continue;

                push(rel("coll", [L, Q, Z]));
              }
            }
          }
        }
      }
    }
    return out;
  },
};
