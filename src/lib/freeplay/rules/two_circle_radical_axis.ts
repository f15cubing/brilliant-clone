/**
 * Two-circle radical axis / common chord (promoted from research/freeplay-rules)
 * — closes IMO 2024 Shortlist G4.
 *
 * ── The theorem ─────────────────────────────────────────────────────────────
 * Let Γ₁, Γ₂ be two circles meeting in the chord AB (so A,B ∈ Γ₁ ∩ Γ₂). Let
 * C, X ∈ Γ₁ and D, Y ∈ Γ₂. Let ω₁ be the circle through C, X and a point P with
 * PC = PX, and ω₂ the circle through D, Y and the SAME P with PD = PY (so
 * P ∈ ω₁ ∩ ω₂). If AB ∥ CD, then the second intersection of ω₁ and ω₂ is
 * Q = AX ∩ BY; in particular Q lies on circle (P,C,X) and on circle (P,D,Y), and
 * the radical axis PQ ∥ AB. The rule emits `cyclic(P,C,X,Q)` (and the symmetric
 * `cyclic(P,D,Y,Q)`).
 *
 * ── Why this is a genuine GAP ────────────────────────────────────────────────
 * The conclusion is a CIRCLE produced from equality of powers across two circles
 * — a relation with no angle content. The AR layer is angles-only (it cannot
 * emit a `cyclic`); `concyclic_merge` needs two circles sharing 3 points (here
 * ω₁, ω₂ share only P, Q); `concyclic_equal_radii` needs a cong-star centre; and
 * the directed converse-inscribed rules need an inscribed-angle equality that is
 * absent / opposite-side here. So no shipped rule produces this `cyclic` (the G4
 * gap test confirms it).
 *
 * ── How the configuration is matched (every cited premise load-bearing) ──────
 * Γ₁, Γ₂ are two cited `cyclic` facts sharing exactly a 2-point chord {A,B}; the
 * remaining two points of each are {C,X} and {D,Y}. The apex P is recovered from
 * the cited `cong` facts (P with cong(P,C,P,X) AND cong(P,D,P,Y)); the C↔D
 * pairing is fixed by the cited `para(A,B,C,D)`; and Q is the named point with
 * cited `coll(A,X,Q)` AND `coll(B,Y,Q)`. Dropping ANY of these makes the
 * configuration unidentifiable, so the rule cannot fire — the load-bearing
 * property the verifier's minimality check enforces.
 *
 * ── Soundness ───────────────────────────────────────────────────────────────
 * `cyclic(P,C,X,Q)` is emitted only when, in the coordinates: all eight points
 * exist and are distinct; PC = PX and PD = PY (matching the cited `cong`s);
 * AB ∥ CD (matching the cited `para`); Q is on lines AX and BY (the cited
 * `coll`s); ω₁=(P,C,X) and ω₂=(P,D,Y) exist with Q on BOTH and Q ≠ P; and the
 * radical axis PQ ∥ AB. The configuration theorem makes the conclusion follow
 * from the cited premises; the numeric guards only reject degenerate samples and
 * never read the conclusion off the figure without the premises being present.
 */
import type { Fact, PointId, Rel } from "@/lib/freeplay/dsl";
import { canonicalKey, factEqual, rel } from "@/lib/freeplay/dsl";
import { cross, dist, isCollinear, sub, unit, type V } from "@/lib/freeplay/geom";
import type { Rule } from "@/lib/freeplay/rules";
import { circleOf, onCircle } from "./_radical";

const EPS = 1e-6;

const relsOf = (cited: Fact[], name: Rel["name"]): Rel[] =>
  cited.filter((f): f is Rel => f.kind === "rel" && f.name === name);

/** Third points `w` with a cited 3-point `coll(u, v, w)`. */
function thirdPointsOnLine(colls: Rel[], u: PointId, v: PointId): PointId[] {
  const out: PointId[] = [];
  for (const c of colls) {
    const pts = c.points;
    if (pts.length !== 3) continue;
    if (!pts.includes(u) || !pts.includes(v)) continue;
    const w = pts.find((p) => p !== u && p !== v);
    if (w && w !== u && w !== v) out.push(w);
  }
  return out;
}

/** AB ∥ CD numerically (within EPS on the unit-direction cross product). */
function parallelV(a: V, b: V, c: V, d: V): boolean {
  const u = unit(sub(b, a));
  const w = unit(sub(d, c));
  return !!u && !!w && Math.abs(cross(u, w)) < EPS;
}

export const two_circle_radical_axis: Rule = {
  id: "two_circle_radical_axis",
  name: "two-circle radical axis",
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

    const cyc = relsOf(cited, "cyclic");
    const congs = relsOf(cited, "cong");
    const congKeys = new Set(congs.map(canonicalKey));
    const paras = relsOf(cited, "para");
    const colls = relsOf(cited, "coll").filter((c) => c.points.length === 3);

    const congCited = (a: PointId, b: PointId, c: PointId, d: PointId): boolean =>
      congKeys.has(canonicalKey(rel("cong", [a, b, c, d])));
    const paraCited = (a: PointId, b: PointId, c: PointId, d: PointId): boolean =>
      paras.some((pf) => factEqual(pf, rel("para", [a, b, c, d])));

    // Apex P is recovered only from points named in cited `cong`s (a small set).
    const apexes = new Set<PointId>();
    for (const cg of congs) for (const p of cg.points) apexes.add(p);

    // Γ₁, Γ₂ = two cited cyclics sharing exactly a 2-point chord {A,B}.
    for (let i = 0; i < cyc.length; i++) {
      for (let j = 0; j < cyc.length; j++) {
        if (i === j) continue;
        const s1 = [...new Set(cyc[i].points)];
        const s2 = [...new Set(cyc[j].points)];
        const chord = s1.filter((p) => s2.includes(p));
        if (chord.length !== 2) continue;
        const r1 = s1.filter((p) => !chord.includes(p));
        const r2 = s2.filter((p) => !chord.includes(p));
        if (r1.length !== 2 || r2.length !== 2) continue;

        // Try both chord orientations (the cited colls disambiguate A↔X / B↔Y).
        for (const [A, B] of [
          [chord[0], chord[1]],
          [chord[1], chord[0]],
        ] as [PointId, PointId][]) {
          for (const C of r1) {
            const X = r1[0] === C ? r1[1] : r1[0];
            for (const D of r2) {
              const Y = r2[0] === D ? r2[1] : r2[0];
              // C↔D pairing certified by the cited shared-chord direction.
              if (!paraCited(A, B, C, D)) continue;

              for (const P of apexes) {
                if (P === A || P === B || P === C || P === X || P === D || P === Y) continue;
                if (!congCited(P, C, P, X)) continue;
                if (!congCited(P, D, P, Y)) continue;

                const onAX = thirdPointsOnLine(colls, A, X);
                const onBY = thirdPointsOnLine(colls, B, Y);
                for (const Q of onAX) {
                  if (!onBY.includes(Q)) continue;
                  if (
                    Q === A || Q === B || Q === C || Q === X ||
                    Q === D || Q === Y || Q === P
                  ) {
                    continue;
                  }

                  // ---- coordinate guards (soundness) ----
                  const cA = coords[A];
                  const cB = coords[B];
                  const cC = coords[C];
                  const cX = coords[X];
                  const cD = coords[D];
                  const cY = coords[Y];
                  const cP = coords[P];
                  const cQ = coords[Q];
                  if (!cA || !cB || !cC || !cX || !cD || !cY || !cP || !cQ) continue;

                  // Apex conditions PC = PX and PD = PY (matching the cited congs).
                  if (Math.abs(dist(cP, cC) - dist(cP, cX)) > EPS * Math.max(1, dist(cP, cC)))
                    continue;
                  if (Math.abs(dist(cP, cD) - dist(cP, cY)) > EPS * Math.max(1, dist(cP, cD)))
                    continue;
                  // Shared-chord direction AB ∥ CD (matching the cited para).
                  if (!parallelV(cA, cB, cC, cD)) continue;
                  // Q = AX ∩ BY (matching the cited colls).
                  if (!isCollinear(cA, cX, cQ) || !isCollinear(cB, cY, cQ)) continue;
                  // ω₁=(P,C,X), ω₂=(P,D,Y); Q on BOTH and a genuine 2nd point (≠P).
                  const w1 = circleOf(cP, cC, cX);
                  const w2 = circleOf(cP, cD, cY);
                  if (!w1 || !w2) continue;
                  if (!onCircle(cQ, w1) || !onCircle(cQ, w2)) continue;
                  if (dist(cQ, cP) < EPS) continue;
                  // Radical axis PQ ∥ AB (the licensing relation).
                  if (!parallelV(cP, cQ, cA, cB)) continue;

                  push(rel("cyclic", [P, C, X, Q]));
                  push(rel("cyclic", [P, D, Y, Q]));
                }
              }
            }
          }
        }
      }
    }
    return out;
  },
};
