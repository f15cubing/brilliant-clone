/**
 * SAS congruent triangles (research candidate).
 *
 * Triangles ABC and DEF that agree on two sides and the angle INCLUDED between
 * those sides are congruent. From the cited facts
 *
 *   cong(A,B,D,E)         — side BA = ED   (a side at vertex B = a side at vertex E)
 *   cong(B,C,E,F)         — side BC = EF   (the other side at B = the other side at E)
 *   eqangle(A,B,C, D,E,F) — the INCLUDED angle ∠ABC = ∠DEF (vertices B and E)
 *
 * we derive the remaining (third) side equality
 *
 *   cong(A,C,D,F)         — AC = DF
 *
 * and, as bonus outputs, the two remaining equal angles
 *
 *   eqangle(B,A,C, E,D,F) — ∠BAC = ∠EDF
 *   eqangle(B,C,A, E,F,D) — ∠BCA = ∠EFD
 *
 * The third-side equality is a genuine GAP: it is a metric (length) conclusion,
 * and the angle-only AR layer has no length table, so it cannot produce `cong`.
 *
 * SOUNDNESS NOTES
 * - Congruence permits reflection, so we do NOT constrain orientation: the law
 *   of cosines makes |AC| = |DF| true for either correspondence of the two
 *   cong'd sides (the product |BA|·|BC| = |ED|·|EF| is symmetric). We therefore
 *   only require that the two cited `cong` facts pair the two sides AT the angle
 *   vertices B and E (in either pairing), then we GUARD numerically: we emit a
 *   fact only when it actually holds in the coordinates, and only for
 *   non-degenerate (non-collinear) triangles. We never emit a false fact.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { dist, isCollinear, type V } from "@/lib/freeplay/geom";
import { angleDeg } from "@/lib/freeplay/geom";

const congsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");
const eqanglesOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "eqangle");

/** Lengths equal within a relative tolerance (matches the `cong` truth check). */
function lenEq(p: V, q: V, r: V, s: V): boolean {
  const l1 = dist(p, q);
  const l2 = dist(r, s);
  return Math.abs(l1 - l2) < 1e-6 * Math.max(1, l1, l2);
}

/** Angles (unsigned, degrees) equal within the `eqangle` truth tolerance. */
function angEq(a: V, b: V, c: V, d: V, e: V, f: V): boolean {
  return Math.abs(angleDeg(a, b, c) - angleDeg(d, e, f)) < 1e-4;
}

export const sas_congruence: Rule = {
  id: "sas_congruence",
  name: "SAS congruent triangles",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const congs = congsOf(cited);
    if (congs.length < 2) return out;

    // A cong fact equivalent to "side (x,y) = side (z,w)" is cited?
    const congKeys = new Set(congs.map(canonicalKey));
    const hasCong = (x: PointId, y: PointId, z: PointId, w: PointId): boolean =>
      congKeys.has(canonicalKey(rel("cong", [x, y, z, w])));

    const emitted = new Set<string>();
    const push = (f: Fact) => {
      const k = canonicalKey(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    for (const eq of eqanglesOf(cited)) {
      const [a, b, c, d, e, f] = eq.points;
      // Vertices of the included angle must be distinct, with distinct arms.
      if (b === e || a === c || d === f) continue;

      const ca = coords[a];
      const cb = coords[b];
      const cc = coords[c];
      const cd = coords[d];
      const ce = coords[e];
      const cf = coords[f];
      if (!ca || !cb || !cc || !cd || !ce || !cf) continue;

      // Both triangles must be genuine (non-degenerate).
      if (isCollinear(ca, cb, cc) || isCollinear(cd, ce, cf)) continue;

      // The two sides at B (BA, BC) must equal the two sides at E (ED, EF),
      // matched in one of the two possible pairings (cong is symmetric).
      const pairing1 = hasCong(b, a, e, d) && hasCong(b, c, e, f); // A↔D, C↔F
      const pairing2 = hasCong(b, a, e, f) && hasCong(b, c, e, d); // A↔F, C↔D
      if (!pairing1 && !pairing2) continue;

      // GUARD: the included angle must actually be the cited equal angle, and
      // the derived third side must actually be equal in the figure.
      if (!angEq(ca, cb, cc, cd, ce, cf)) continue;
      if (!lenEq(ca, cc, cd, cf)) continue; // |AC| ≈ |DF|

      // Key length output AR cannot produce.
      push(rel("cong", [a, c, d, f]));

      // Bonus: the remaining pair of equal base angles (guarded numerically).
      if (angEq(cb, ca, cc, ce, cd, cf)) {
        push(rel("eqangle", [b, a, c, e, d, f]));
      }
      if (angEq(cb, cc, ca, ce, cf, cd)) {
        push(rel("eqangle", [b, c, a, e, f, d]));
      }
    }

    return out;
  },
};
