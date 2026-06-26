/**
 * Rotation / shared-vertex SAS — "spiral congruence" (research candidate).
 *
 * Two triangles share their APEX O. From the cited facts
 *
 *   cong(O,A,O,C)         — OA = OC   (an arm at O equals an arm at O)
 *   cong(O,B,O,D)         — OB = OD   (the other arm at O equals the other)
 *   eqangle(A,O,B, C,O,D) — ∠AOB = ∠COD, where BOTH vertices are the SAME O
 *
 * we derive the opposite-side equality
 *
 *   cong(A,B,C,D)         — AB = CD
 *
 * Geometrically this is the lemma "the rotation about O carrying A→C also
 * carries B→D, hence the segment AB maps to CD" — the engine of spiral
 * similarity and the Fermat-point / Napoleon arguments.
 *
 * WHY THIS IS NOT `sas_congruence`
 * The distinct-vertex SAS rule (`sas_congruence`) deliberately SKIPS the case
 * where the two included-angle vertices coincide (`b === e`). That is exactly
 * this configuration: a single shared apex O. So this rule is the genuine
 * complement, matching `eqangle` facts whose two vertices are the SAME point.
 *
 * ARM / CONG PAIRING
 * For `eqangle(A,O,B, C,O,D)` the first angle's arms are (A,B) at O and the
 * second's are (C,D) at O. The two cited `cong` facts must connect an arm of
 * the first angle to an arm of the second, in one of the two pairings:
 *   pairing1:  OA = OC  &  OB = OD   (A↔C, B↔D)
 *   pairing2:  OA = OD  &  OB = OC   (A↔D, B↔C)
 * Both license |AB| = |CD|: by the law of cosines
 *   |AB|² = OA² + OB² − 2·OA·OB·cos∠AOB,
 * and in either pairing the product OA·OB equals OC·OD while ∠AOB = ∠COD, so
 * the right-hand side is identical for CD. (cong is symmetric, so the emitted
 * fact cong(A,B,C,D) is the same canonical fact for either pairing.)
 *
 * SOUNDNESS
 * - Reflections are allowed: the angle test is unsigned and the law-of-cosines
 *   argument is orientation-free, so a mirror image still satisfies |AB|=|CD|.
 * - We GUARD numerically: emit only when ∠AOB ≈ ∠COD AND |AB| ≈ |CD| actually
 *   hold in the coordinates, and only for non-degenerate triangles AOB, COD.
 *   A false conclusion is therefore never emitted.
 *
 * GAP
 * The output is a LENGTH equality (`cong`). The AR layer is angles-only with no
 * length table, and no shipped DD rule pairs two shared-apex arms, so the
 * production engine cannot derive AB = CD from these premises.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { angleDeg, dist, isCollinear, type V } from "@/lib/freeplay/geom";

const congsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");
const eqanglesOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "eqangle");

/** Lengths equal within the relative tolerance the `cong` truth check uses. */
function lenEq(p: V, q: V, r: V, s: V): boolean {
  const l1 = dist(p, q);
  const l2 = dist(r, s);
  return Math.abs(l1 - l2) < 1e-6 * Math.max(1, l1, l2);
}

/** Unsigned angles (degrees) equal within the `eqangle` truth tolerance. */
function angEq(a: V, b: V, c: V, d: V, e: V, f: V): boolean {
  return Math.abs(angleDeg(a, b, c) - angleDeg(d, e, f)) < 1e-4;
}

export const sas_shared_vertex: Rule = {
  id: "sas_shared_vertex",
  name: "SAS about a common vertex",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const congs = congsOf(cited);
    if (congs.length < 2) return out;

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
      const [a, o1, b, c, o2, d] = eq.points;
      // SHARED vertex: both included-angle vertices must be the SAME point O.
      // (This is precisely the case `sas_congruence` skips.)
      if (o1 !== o2) continue;
      const O = o1;

      // Arms must be genuine: distinct from the apex and from each other.
      if (a === O || b === O || c === O || d === O) continue;
      if (a === b || c === d) continue;

      const cO = coords[O];
      const ca = coords[a];
      const cb = coords[b];
      const cc = coords[c];
      const cd = coords[d];
      if (!cO || !ca || !cb || !cc || !cd) continue;

      // Both triangles AOB and COD must be non-degenerate.
      if (isCollinear(ca, cO, cb) || isCollinear(cc, cO, cd)) continue;

      // The two cited `cong` facts must pair the angle arms about O.
      const pairing1 = hasCong(O, a, O, c) && hasCong(O, b, O, d); // A↔C, B↔D
      const pairing2 = hasCong(O, a, O, d) && hasCong(O, b, O, c); // A↔D, B↔C
      if (!pairing1 && !pairing2) continue;

      // GUARD: the shared-vertex angle equality must really hold, and the
      // derived opposite side must actually be equal in the figure.
      if (!angEq(ca, cO, cb, cc, cO, cd)) continue;
      if (!lenEq(ca, cb, cc, cd)) continue; // |AB| ≈ |CD|

      // The length output AR cannot produce.
      push(rel("cong", [a, b, c, d]));
    }

    return out;
  },
};
