/**
 * Equal lengths chain — congruence transitivity (research candidate).
 *
 * Segment equality is transitive. From two cited `cong` facts that SHARE a
 * common segment, derive the equality of the two non-shared segments:
 *
 *   cong(A,B,C,D)  — |AB| = |CD|
 *   cong(C,D,E,F)  — |CD| = |EF|
 *   ⇒ cong(A,B,E,F) — |AB| = |EF|
 *
 * Why this is a genuine GAP: this is a pure LENGTH conclusion. The AR layer is
 * angles-only (no length table), so it can never propagate a length equality;
 * and no shipped DD rule chains two `cong`s. This is exactly the gap that blocks
 * circumcenter-style arguments (e.g. OA = OB and OA = OC ⇒ OB = OC), where the
 * three equal radii cannot be tied together by any angle chase.
 *
 * MATCHING THE SHARED SEGMENT ACROSS `cong` SYMMETRIES
 * A `cong` fact carries two segments, each an UNORDERED point-pair, and the two
 * segments themselves are interchangeable (see `relKey`/`canonicalKey`: both the
 * endpoints within a segment and the two segments are sorted). So we do NOT rely
 * on argument order. For every pair of cited `cong`s we compare each of fact 1's
 * two segments against each of fact 2's two segments as unordered pairs; a match
 * is the shared segment. The two NON-shared segments become the conclusion.
 *
 * SOUNDNESS GUARDS (we never emit a false or trivial fact)
 * - All four endpoints must have coordinates.
 * - The shared segment and both output segments must be non-degenerate
 *   (non-zero length), so we never assert anything about a collapsed point.
 * - We GUARD numerically: emit only when the two output segments are actually
 *   equal in the coordinates. This catches the case where a cited `cong` is not
 *   truly realized in the figure (then the chained conclusion would be false and
 *   we stay silent), so transitivity is enforced by the figure, not assumed.
 * - We never emit a reflexive `cong(A,B,A,B)` (output segments are the same
 *   unordered pair).
 * - We never emit a fact canonically equal to one of the cited `cong`s (no
 *   restating a premise back as if it were a new deduction).
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import type { Rule } from "@/lib/freeplay/rules";
import { dist } from "@/lib/freeplay/geom";

type Seg = [PointId, PointId];

const congsOf = (cited: Fact[]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === "cong");

/** Canonical key for an unordered point-pair (a segment). */
const segKey = (s: Seg): string => (s[0] <= s[1] ? `${s[0]}|${s[1]}` : `${s[1]}|${s[0]}`);

export const cong_transitivity: Rule = {
  id: "cong_transitivity",
  name: "equal segments chain",
  derive(cited, { coords }) {
    const out: Fact[] = [];
    const congs = congsOf(cited);
    if (congs.length < 2) return out;

    const citedKeys = new Set(congs.map(canonicalKey));
    const emitted = new Set<string>();

    const segsOf = (f: Rel): [Seg, Seg] => [
      [f.points[0], f.points[1]],
      [f.points[2], f.points[3]],
    ];

    for (let i = 0; i < congs.length; i++) {
      for (let j = i + 1; j < congs.length; j++) {
        const segs1 = segsOf(congs[i]);
        const segs2 = segsOf(congs[j]);

        for (let a = 0; a < 2; a++) {
          for (let b = 0; b < 2; b++) {
            // The shared segment: same unordered point-pair in both facts.
            if (segKey(segs1[a]) !== segKey(segs2[b])) continue;

            const p = segs1[1 - a]; // non-shared segment of fact i
            const q = segs2[1 - b]; // non-shared segment of fact j

            // Skip reflexive output (the two non-shared segments coincide).
            if (segKey(p) === segKey(q)) continue;

            const cP0 = coords[p[0]];
            const cP1 = coords[p[1]];
            const cQ0 = coords[q[0]];
            const cQ1 = coords[q[1]];
            if (!cP0 || !cP1 || !cQ0 || !cQ1) continue;

            const shared = segs1[a];
            const cS0 = coords[shared[0]];
            const cS1 = coords[shared[1]];
            if (!cS0 || !cS1) continue;

            const lShared = dist(cS0, cS1);
            const lP = dist(cP0, cP1);
            const lQ = dist(cQ0, cQ1);
            // No degenerate (zero-length) segments anywhere in the chain.
            if (lShared < 1e-9 || lP < 1e-9 || lQ < 1e-9) continue;

            // Coordinate guard: the two output segments must actually be equal
            // (matches the `cong` truth check tolerance).
            if (Math.abs(lP - lQ) > 1e-6 * Math.max(1, lP, lQ)) continue;

            const candidate = rel("cong", [p[0], p[1], q[0], q[1]]);
            const key = canonicalKey(candidate);
            // Don't restate a cited premise, and don't emit duplicates.
            if (citedKeys.has(key) || emitted.has(key)) continue;
            emitted.add(key);
            out.push(candidate);
          }
        }
      }
    }

    return out;
  },
};
