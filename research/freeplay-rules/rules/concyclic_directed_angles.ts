/**
 * Concyclic from equal DIRECTED angles (research candidate).
 *
 * The full converse of the inscribed-angle theorem, stated with DIRECTED angles
 * (mod 180°): four points A, B, X, Y are concyclic iff X and Y see the chord AB
 * under equal directed angles,
 *
 *     ∠(XA, XB) ≡ ∠(YA, YB)   (mod 180°).
 *
 * The shipped `converse_inscribed` only covers the UNDIRECTED special cases — the
 * `eqangle` fact language is undirected (`factHolds` compares 0–180° measures),
 * so a configuration whose directed equality manifests as SUPPLEMENTARY measures
 * (apexes on opposite sides of the chord) cannot be packaged as a true `eqangle`
 * and is therefore unreachable. Likewise the AR layer reasons about directed
 * angles but `AngleAR.equation()` returns null for a `cyclic` candidate, so AR
 * proves the angle identity yet can never EMIT the circle.
 *
 * This rule bridges that gap. It builds a directed-angle table (`AngleAR`) from
 * exactly the cited facts, additionally injecting the directed inscribed-angle
 * equalities licensed by each cited `cyclic` (for concyclic points the directed
 * equality holds for EVERY chord/apex split, not just the same-side ones the
 * shipped `inscribed_angle` emits). It then emits `cyclic(A,B,X,Y)` whenever the
 * table ENTAILS the directed inscribed-angle equality for some chord/apex split.
 *
 * SOUNDNESS.
 * - The table is fed ONLY cited facts (and consequences of cited `cyclic`s), and
 *   `AngleAR.isImplied` is symbolic (coordinates fix only signs/branches, never
 *   collapse a variable), so an emission is a genuine logical consequence of the
 *   cited premises — never read off the figure. Dropping a load-bearing premise
 *   breaks the entailment, so the verifier's minimality check stays meaningful.
 * - Belt-and-suspenders: we additionally require the conclusion to hold
 *   numerically and the four points to be distinct with no three collinear (a
 *   degenerate "circle"), matching the truth checker for `cyclic`.
 */
import { AngleAR } from "@/lib/freeplay/ar";
import { factHolds } from "@/lib/freeplay/check";
import type { Fact, PointId } from "@/lib/freeplay/dsl";
import { canonicalKey, rel } from "@/lib/freeplay/dsl";
import { dist, isCollinear } from "@/lib/freeplay/geom";
import type { Rule } from "@/lib/freeplay/rules";

const EPS = 1e-6;

export const concyclic_from_directed_angles: Rule = {
  id: "concyclic_from_directed_angles",
  name: "concyclic from equal directed angles",
  derive(cited, { coords }) {
    const out: Fact[] = [];

    // Points that actually appear in the cited facts (keeps enumeration small).
    const ptSet = new Set<PointId>();
    for (const f of cited) {
      if (f.kind === "rel") for (const p of f.points) ptSet.add(p);
      else if (f.kind === "aval") for (const p of f.angle) ptSet.add(p);
    }
    const pts = [...ptSet];
    if (pts.length < 4) return out;

    // Directed-angle table from the cited facts.
    const ar = new AngleAR(coords, {});
    for (const f of cited) ar.add(f);

    // Inject the directed inscribed-angle equalities of every cited circle:
    // for concyclic c0..c3, ∠(ck ci, ck cj) ≡ ∠(cl ci, cl cj) for each chord
    // {ci,cj} and apex pair {ck,cl}. (Sound: the points are a cited `cyclic`.)
    for (const f of cited) {
      if (f.kind !== "rel" || f.name !== "cyclic") continue;
      const c = [...new Set(f.points)];
      if (c.length !== 4) continue;
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++) {
          const apex = [0, 1, 2, 3].filter((k) => k !== i && k !== j);
          const [k, l] = apex;
          ar.add(rel("eqangle", [c[i], c[k], c[j], c[i], c[l], c[j]]));
        }
    }

    const emitted = new Set<string>();
    const partitions: [number, number, number, number][] = [
      [0, 1, 2, 3], // chord {0,1}, apexes {2,3}
      [0, 2, 1, 3], // chord {0,2}, apexes {1,3}
      [0, 3, 1, 2], // chord {0,3}, apexes {1,2}
    ];

    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++)
        for (let k = j + 1; k < pts.length; k++)
          for (let l = k + 1; l < pts.length; l++) {
            const quad = [pts[i], pts[j], pts[k], pts[l]];
            const cs = quad.map((p) => coords[p]);
            if (cs.some((c) => !c)) continue;

            // Distinct points.
            let distinct = true;
            for (let a = 0; a < 4 && distinct; a++)
              for (let b = a + 1; b < 4; b++)
                if (dist(cs[a], cs[b]) < EPS) distinct = false;
            if (!distinct) continue;

            // Reject a degenerate "circle" (three of four collinear).
            let collinear = false;
            const tri = [
              [0, 1, 2],
              [0, 1, 3],
              [0, 2, 3],
              [1, 2, 3],
            ];
            for (const [a, b, c] of tri)
              if (isCollinear(cs[a], cs[b], cs[c])) collinear = true;
            if (collinear) continue;

            // Numeric safety: the conclusion must actually hold.
            const cand = rel("cyclic", quad);
            if (!factHolds(cand, coords, {})) continue;

            // Entailment: some chord/apex split's directed inscribed-angle
            // equality is implied by the (cited-only) table.
            let entailed = false;
            for (const [a, b, x, y] of partitions) {
              const eq = rel("eqangle", [
                quad[a],
                quad[x],
                quad[b],
                quad[a],
                quad[y],
                quad[b],
              ]);
              if (ar.implies(eq)) {
                entailed = true;
                break;
              }
            }
            if (!entailed) continue;

            const key = canonicalKey(cand);
            if (emitted.has(key)) continue;
            emitted.add(key);
            out.push(cand);
          }

    return out;
  },
};
