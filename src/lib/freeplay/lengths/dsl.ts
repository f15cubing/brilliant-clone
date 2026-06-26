/**
 * LENGTH/RATIO layer of the freeplay formal language.
 *
 * The `eqratio` fact kind, the `LFact = Fact | EqRatio` union, the constructor
 * and the canonical key all live in the shipped `../dsl` (so the shipped
 * canonical-key / equality / label helpers handle `eqratio` explicitly). This
 * module is the length layer's public surface: it re-exports those bits under
 * the `*L` names the ratio rules/tests use, and adds the two pieces that are
 * length-specific:
 *
 *   - `factHoldsL` — the numeric truth check for an `LFact` (ratio-aware;
 *     delegates to the shipped `factHolds` for ordinary facts);
 *   - `LRule` — a rule whose `derive` may emit `EqRatio` facts.
 *
 * Everything is additive: ordinary `Fact`s keep their shipped behavior.
 */
import type { Coords, VarBindings } from "@/lib/freeplay/check";
import { factHolds } from "@/lib/freeplay/check";
import {
  canonicalKey,
  eqratio,
  factEqual,
  isAmong,
  type EqRatio,
  type Fact,
  type LFact,
} from "@/lib/freeplay/dsl";
import { dist } from "@/lib/freeplay/geom";
import type { RuleCtx } from "@/lib/freeplay/rules";

export { eqratio };
export type { EqRatio, LFact };

/** Length-aware canonical key (the shipped key already handles `eqratio`). */
export const canonicalKeyL = canonicalKey;
/** Length-aware fact equality (the shipped equality already handles `eqratio`). */
export const factEqualL = factEqual;
/** Length-aware "is `fact` among `facts`?" (the shipped check handles `eqratio`). */
export const isAmongL = isAmong;

/**
 * A length/ratio-producing rule. Mirrors the shipped `Rule` but `derive` may
 * return `EqRatio` facts (or ordinary `Fact`s). A shipped `Rule` is assignable
 * to `LRule` (its `Fact[]` result widens to `LFact[]`), so the two kinds of rule
 * mix freely in one list.
 */
export interface LRule {
  id: string;
  name: string;
  derive(cited: Fact[], ctx: RuleCtx): LFact[];
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
