/**
 * SAS similar triangles (LENGTH layer).
 *
 * Two triangles with TWO pairs of sides in proportion and the INCLUDED angles
 * equal are similar (SAS similarity). Concretely, from
 *
 *   eqratio(A,B,D,E, B,C,E,F)   — AB/DE = BC/EF   (the two pairs of sides)
 *   eqangle(A,B,C, D,E,F)       — ∠ABC = ∠DEF     (the INCLUDED angle, vertex B↔E)
 *
 * the triangles △ABC ~ △DEF (A↔D, B↔E, C↔F) and we may derive the third
 * proportion and the two remaining equal angles.
 *
 * HOW IT PLUGS INTO THE VERIFIER
 * The verifier filters `eqratio` premises OUT of the ordinary-fact list handed to
 * `derive`, then runs `LengthAR` over (cited facts ∪ one-step DD/length
 * consequences). So this rule cannot see the cited `eqratio(A,B,D,E,B,C,E,F)`
 * directly; instead it fires off the cited `eqangle`, identifies the
 * correspondence numerically, and emits the BRIDGE proportion
 *
 *   eqratio(B,C,E,F, C,A,F,D)   — BC/EF = CA/FD
 *
 * (plus the two remaining equal angles). The length table then combines the
 * cited AB/DE = BC/EF with this bridge BC/EF = CA/FD to obtain the target
 * AB/DE = CA/FD. Because the bridge alone (without the cited premise) cannot
 * yield AB/DE = CA/FD, BOTH premises are genuinely required — the verifier's
 * minimality check passes and the target step is reported as an
 * "algebraic length-chase".
 *
 * SOUNDNESS
 * - The cited angle MUST be the INCLUDED angle (the common vertex B↔E of the two
 *   proportional sides). We recover the correspondence from that vertex and its
 *   two arms, then require BOTH SAS premises to be genuinely CITED: the included
 *   angle equality (an `eqangle` in `cited`) AND the two-sides proportion
 *   AB/DE = BC/EF (an `eqratio` in `ctx.citedRatios`). The two-sides proportion
 *   is NOT read off the coordinates — otherwise a figure that merely happens to
 *   be similar (e.g. two congruent triangles, where every side ratio is 1) would
 *   let the bridge proportion be emitted from the angle ALONE, and combined with
 *   an unrelated cited `cong` the length layer could "derive" a third-side
 *   equality that does not logically follow from the citations. Requiring the
 *   proportion to be cited keeps the emitted bridge a genuine consequence of the
 *   cited facts (and makes the verifier's minimality check correct).
 * - Both arm-correspondences are tried; only the one whose included-side
 *   proportion is actually cited (and holds) survives, so the correspondence is
 *   pinned uniquely.
 * - Similarity allows MIRROR images, so orientation is never constrained.
 * - Every emitted fact is numerically gated (`factHoldsL`), so a false fact is
 *   never produced.
 */
import { rel, type Fact, type PointId, type Rel } from "@/lib/freeplay/dsl";
import { angleDeg, isCollinear, type V } from "@/lib/freeplay/geom";
import {
  canonicalKeyL,
  eqratio,
  factHoldsL,
  isAmongL,
  type LFact,
  type LRule,
} from "../dsl";

const eqanglesOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "eqangle");

/** Unsigned angle equality within the `eqangle` truth tolerance. */
function angEq(a: V, b: V, c: V, d: V, e: V, f: V): boolean {
  return Math.abs(angleDeg(a, b, c) - angleDeg(d, e, f)) < 1e-4;
}

export const sas_similarity: LRule = {
  id: "sas_similarity",
  name: "SAS similar triangles",
  derive(cited, { coords, citedRatios = [] }) {
    const out: LFact[] = [];
    const emitted = new Set<string>();
    const push = (f: LFact) => {
      const k = canonicalKeyL(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    for (const eq of eqanglesOf(cited)) {
      // ∠abc = ∠def, with b and e the (corresponding) vertices.
      const [a, b, c, d, e, f] = eq.points;

      // The included angle is at b↔e; its arms a,c correspond to {d,f}. The
      // angle equality alone is symmetric in swapping the arms, so try both
      // matchings and let the included-side proportion pick the real one.
      const armMatchings: [PointId, PointId][] = [
        [d, f], // a↔d, c↔f
        [f, d], // a↔f, c↔d
      ];

      for (const [d2, f2] of armMatchings) {
        // Need six distinct vertices forming two genuine triangles.
        if (a === b || b === c || a === c) continue;
        if (d2 === e || e === f2 || d2 === f2) continue;

        const ca = coords[a];
        const cb = coords[b];
        const cc = coords[c];
        const cd = coords[d2];
        const ce = coords[e];
        const cf = coords[f2];
        if (!ca || !cb || !cc || !cd || !ce || !cf) continue;

        // Both triangles must be non-degenerate (non-collinear).
        if (isCollinear(ca, cb, cc) || isCollinear(cd, ce, cf)) continue;

        // GUARD 1 — the INCLUDED angle equality ∠abc = ∠(d2)e(f2) must hold.
        if (!angEq(ca, cb, cc, cd, ce, cf)) continue;

        // GUARD 2 — the two-sides proportion AB/DE = BC/EF must be a genuinely
        // CITED premise (not merely true in the coordinates). This is the SAS
        // hypothesis; reading it off the figure instead would let the rule fire
        // from the angle alone in any similar figure and unsoundly bridge to an
        // unrelated cited `cong`. We still numerically gate it as a sanity check.
        const sasPremise = eqratio(a, b, d2, e, b, c, e, f2);
        if (!isAmongL(sasPremise, citedRatios)) continue;
        if (!factHoldsL(sasPremise, coords)) continue;

        // Bridge proportion BC/EF = CA/FD. Combined (by the length layer) with
        // the cited AB/DE = BC/EF this yields AB/DE = CA/FD.
        const bridge = eqratio(b, c, e, f2, c, a, f2, d2);
        if (factHoldsL(bridge, coords)) push(bridge);

        // Remaining equal angles ∠bac = ∠e(d2)(f2) and ∠bca = ∠e(f2)(d2).
        const angAtA = rel("eqangle", [b, a, c, e, d2, f2]);
        const angAtC = rel("eqangle", [b, c, a, e, f2, d2]);
        if (factHoldsL(angAtA, coords)) push(angAtA);
        if (factHoldsL(angAtC, coords)) push(angAtC);
      }
    }

    return out;
  },
};
