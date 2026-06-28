/**
 * Converse power of a point (LENGTH layer).
 *
 * This is the CONVERSE of the shipped forward `power_of_a_point` rule. The
 * forward rule turns concyclicity into an equal-product (`cyclic` + 2 `coll` ⇒
 * `eqratio`); this rule turns the equal product back into concyclicity:
 *
 *   Two lines ℓ₁, ℓ₂ meet at a point K, with A, P on ℓ₁ and Y, Z on ℓ₂ (all
 *   four ≠ K). If the products of the segment lengths from K are equal,
 *
 *       KA · KP = KY · KZ,
 *
 *   AND K has the SAME position relative to both pairs — either K strictly
 *   BETWEEN A,P and between Y,Z (intersecting chords, K inside), or K OUTSIDE
 *   both (two secants, A,P on a common ray from K and Y,Z on a common ray) —
 *   then A, Y, P, Z are concyclic.
 *
 * PRODUCES:  cyclic(A,Y,P,Z)
 *
 * PREMISES:
 *   eqratio(K,A,K,Y,K,Z,K,P)   — the equal-power condition KA·KP = KY·KZ.
 *                                READ FROM `ctx.citedRatios` (a genuine,
 *                                load-bearing premise the learner must cite),
 *                                NEVER reconstructed from coordinates: any four
 *                                concyclic points trivially satisfy the product
 *                                equality, so reading it off the figure would
 *                                let the rule fire without the premise and
 *                                silently break minimality / soundness.
 *   coll(K,A,P)                 — line ℓ₁ through K, A, P.
 *   coll(K,Y,Z)                 — line ℓ₂ through K, Y, Z.
 * K is recovered as the point SHARED by the two collinearities; the remaining
 * two points of each line are that line's pair {A,P} / {Y,Z}.
 *
 * WHY THIS LAYER. It CONSUMES an `eqratio` (a length fact) and PRODUCES a
 * `cyclic`, so it lives in `lengths/rules/` — only the length layer is handed
 * the cited ratios (via `ctx.citedRatios`). It cannot be an AngleAR or LengthAR
 * consequence: AngleAR has no length input and cannot emit a `cyclic`; LengthAR
 * emits only length equalities. A DD-style `derive` that emits the `cyclic` is
 * therefore required.
 *
 * THE SIGN GUARD IS ESSENTIAL. The cited `eqratio` only certifies the UNSIGNED
 * product equality |KA|·|KP| = |KY|·|KZ|. In a MIXED configuration (K between
 * one pair but outside the other) the unsigned products can still be equal while
 * the SIGNED powers have opposite sign, and the four points are NOT concyclic.
 * Requiring "both chords" OR "both secants" makes the two signed powers share a
 * sign, so unsigned equality ⇒ signed-power equality = equal power of K wrt the
 * unique circle ⇒ concyclicity (the genuine converse-power-of-a-point theorem).
 * The mixed case is rejected.
 *
 * SOUNDNESS. `cyclic(A,Y,P,Z)` is emitted only when ALL hold:
 *   (1) coll(K,A,P), coll(K,Y,Z) are cited and numerically realised (K on both
 *       lines);
 *   (2) the equal-power ratio is in `ctx.citedRatios` (load-bearing, off `ctx`,
 *       never reconstructed from coords);
 *   (3) the SIGN guard: K strictly between A,P and between Y,Z (chords), OR A,P
 *       on a common ray from K and Y,Z on a common ray (secants) — mixed
 *       rejected;
 *   (4) the four points are concyclic numerically (a final degenerate-sample
 *       gate matching `factHoldsL`'s `cyclic` test).
 * Under (1)+(2)+(3) concyclicity is a THEOREM; (4) only rejects degenerate
 * samples. The rule never reads the load-bearing ratio off the figure.
 */
import type { Fact, Rel } from "@/lib/freeplay/dsl";
import { rel } from "@/lib/freeplay/dsl";
import { isBetween, isCollinear, sameRayFrom } from "@/lib/freeplay/geom";
import { canonicalKeyL, eqratio, factHoldsL, isAmongL, type LFact, type LRule } from "../dsl";

const collsOf = (cited: Fact[]): Rel[] =>
  cited.filter(
    (f): f is Rel => f.kind === "rel" && f.name === "coll" && f.points.length === 3,
  );

export const converse_power_of_a_point: LRule = {
  id: "converse_power_of_a_point",
  name: "converse power of a point",
  derive(cited, { coords, citedRatios = [] }) {
    const out: LFact[] = [];
    const emitted = new Set<string>();
    const push = (f: LFact) => {
      const k = canonicalKeyL(f);
      if (emitted.has(k)) return;
      emitted.add(k);
      out.push(f);
    };

    // Pair 3-point lines that share EXACTLY one endpoint K.
    const lines = collsOf(cited).map((c) => c.points);
    for (let i = 0; i < lines.length; i++) {
      for (let j = i + 1; j < lines.length; j++) {
        const set1 = new Set(lines[i]);
        const shared = lines[j].filter((p) => set1.has(p));
        if (shared.length !== 1) continue;
        const K = shared[0];
        const [A, P] = lines[i].filter((p) => p !== K);
        const [Y, Z] = lines[j].filter((p) => p !== K);
        if (new Set([K, A, P, Y, Z]).size !== 5) continue;

        // The equal-power premise MUST be cited (read from ctx, never coords).
        // KA·KP = KY·KZ admits two distinct canonical eqratio forms; accept
        // either, regardless of the order A,P / Y,Z came off the colls.
        const ratioForms = [
          eqratio(K, A, K, Y, K, Z, K, P), // KA/KY = KZ/KP
          eqratio(K, A, K, Z, K, Y, K, P), // KA/KZ = KY/KP
        ];
        if (!ratioForms.some((r) => isAmongL(r, citedRatios))) continue;

        const cK = coords[K];
        const cA = coords[A];
        const cP = coords[P];
        const cY = coords[Y];
        const cZ = coords[Z];
        if (!cK || !cA || !cP || !cY || !cZ) continue;

        // GUARD 1 — both lines really pass through K.
        if (!isCollinear(cK, cA, cP) || !isCollinear(cK, cY, cZ)) continue;

        // GUARD 2 — equal-power SIGN match: intersecting chords (K inside both)
        // OR two secants (K outside both). The MIXED case is unsound — reject.
        const chords = isBetween(cA, cK, cP) && isBetween(cY, cK, cZ);
        const secants = sameRayFrom(cK, cA, cP) && sameRayFrom(cK, cY, cZ);
        if (!chords && !secants) continue;

        // GUARD 3 — the conclusion holds numerically (degenerate-sample gate).
        const cyc = rel("cyclic", [A, Y, P, Z]);
        if (!factHoldsL(cyc, coords)) continue;

        push(cyc);
      }
    }

    return out;
  },
};
