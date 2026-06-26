/**
 * Research-local LENGTH/RATIO extension of the freeplay formal language.
 *
 * The shipped DSL (`src/lib/freeplay/dsl.ts`) has a `cong` relation (AB = CD) but
 * no notion of a *ratio* of segments. Similar triangles need exactly that, so we
 * add ONE new relation here without touching `src/`:
 *
 *   eqratio(A,B,C,D,E,F,G,H)  —  AB/CD = EF/GH
 *
 * meaning the ratio of the (unordered) segment AB to CD equals the ratio of EF to
 * GH. This file provides:
 *   - a constructor `eqratio(...)` and the `LFact = Fact | EqRatio` union;
 *   - a canonical key respecting the proportion's symmetries;
 *   - length-aware `canonicalKeyL` / `factEqualL` / `isAmongL`;
 *   - `factHoldsL`, the numeric truth check (delegates to the shipped
 *     `factHolds` for ordinary facts);
 *   - an `LRule` type whose `derive` may emit `EqRatio` facts.
 *
 * Everything is additive: ordinary `Fact`s keep their shipped canonical keys, so
 * length reasoning interoperates with the angle layer unchanged.
 */
import type { Coords, VarBindings } from "@/lib/freeplay/check";
import { factHolds } from "@/lib/freeplay/check";
import { canonicalKey, factEqual, type Fact, type PointId } from "@/lib/freeplay/dsl";
import { dist } from "@/lib/freeplay/geom";
import type { RuleCtx } from "@/lib/freeplay/rules";

/** AB/CD = EF/GH, where the 8 points are [A,B,C,D,E,F,G,H]. */
export interface EqRatio {
  kind: "eqratio";
  points: [
    PointId,
    PointId,
    PointId,
    PointId,
    PointId,
    PointId,
    PointId,
    PointId,
  ];
}

/** The research-local fact union: a shipped `Fact` or an `EqRatio`. */
export type LFact = Fact | EqRatio;

/** Build `eqratio(A,B,C,D,E,F,G,H)` meaning AB/CD = EF/GH. */
export const eqratio = (
  A: PointId,
  B: PointId,
  C: PointId,
  D: PointId,
  E: PointId,
  F: PointId,
  G: PointId,
  H: PointId,
): EqRatio => ({ kind: "eqratio", points: [A, B, C, D, E, F, G, H] });

/**
 * A length/ratio-producing rule. Mirrors the shipped `Rule` but `derive` may
 * return `EqRatio` facts (or ordinary `Fact`s). A shipped `Rule` is assignable
 * to `LRule` (its `Fact[]` result widens to `LFact[]`), so the two kinds of rule
 * can be mixed in one list.
 */
export interface LRule {
  id: string;
  name: string;
  derive(cited: Fact[], ctx: RuleCtx): LFact[];
}

// ---- canonicalization -------------------------------------------------------

/** Canonical token for the UNORDERED segment {p, q} (so PQ = QP). */
const segKey = (p: PointId, q: PointId): string => (p <= q ? `${p}|${q}` : `${q}|${p}`);

/**
 * Canonical key for a proportion AB/CD = EF/GH, accounting for:
 *   - endpoints unordered within a segment (AB = BA), via `segKey`;
 *   - swapping the two ratios:       AB/CD = EF/GH  ⇔  EF/GH = AB/CD;
 *   - inverting both ratios:         AB/CD = EF/GH  ⇔  CD/AB = GH/EF;
 *   - and the composition of those:                   ⇔  GH/EF = CD/AB.
 * We emit all four equivalent strings and keep the lexicographically smallest.
 */
function eqratioKey(pts: EqRatio["points"]): string {
  const s1 = segKey(pts[0], pts[1]); // AB
  const s2 = segKey(pts[2], pts[3]); // CD
  const s3 = segKey(pts[4], pts[5]); // EF
  const s4 = segKey(pts[6], pts[7]); // GH
  const r = (n1: string, d1: string, n2: string, d2: string): string =>
    `${n1}/${d1}=${n2}/${d2}`;
  const forms = [
    r(s1, s2, s3, s4), // identity
    r(s3, s4, s1, s2), // swap ratios
    r(s2, s1, s4, s3), // invert both
    r(s4, s3, s2, s1), // swap + invert
  ];
  forms.sort();
  return `eqratio(${forms[0]})`;
}

/** Length-aware canonical key (delegates to the shipped key for ordinary facts). */
export function canonicalKeyL(f: LFact): string {
  if (f.kind === "eqratio") return eqratioKey(f.points);
  return canonicalKey(f);
}

/** Length-aware fact equality (delegates to the shipped equality otherwise). */
export function factEqualL(a: LFact, b: LFact): boolean {
  if (a.kind === "eqratio" || b.kind === "eqratio") {
    if (a.kind !== "eqratio" || b.kind !== "eqratio") return false;
    return canonicalKeyL(a) === canonicalKeyL(b);
  }
  return factEqual(a, b);
}

/** Is `fact` (up to symmetry) among `facts`? */
export function isAmongL(fact: LFact, facts: LFact[]): boolean {
  const key = canonicalKeyL(fact);
  return facts.some((f) => canonicalKeyL(f) === key);
}

// ---- numeric truth check ----------------------------------------------------

const REL_TOL = 1e-6; // relative tolerance for the ratio equality
const DEGEN = 1e-9; // a segment shorter than this is treated as degenerate

/**
 * Numeric truth check for an `LFact`. For `eqratio` it compares the two ratios
 * with a RELATIVE tolerance (guarding against degenerate / zero-length
 * denominators); for every ordinary fact it delegates to the shipped
 * `factHolds`.
 */
export function factHoldsL(
  fact: LFact,
  coords: Coords,
  bindings: VarBindings = {},
): boolean {
  if (fact.kind !== "eqratio") return factHolds(fact, coords, bindings);

  const v = fact.points.map((id) => coords[id]);
  if (v.some((x) => x === undefined)) return false;

  const ab = dist(v[0]!, v[1]!);
  const cd = dist(v[2]!, v[3]!);
  const ef = dist(v[4]!, v[5]!);
  const gh = dist(v[6]!, v[7]!);

  // The two denominators (CD, GH) must be genuine segments to form a ratio.
  if (cd < DEGEN || gh < DEGEN) return false;

  const r1 = ab / cd;
  const r2 = ef / gh;
  return Math.abs(r1 - r2) <= REL_TOL * Math.max(1, Math.abs(r1), Math.abs(r2));
}
