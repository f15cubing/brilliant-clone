/**
 * Multi-case figure sampling.
 *
 * The verifier's soundness used to rest on ONE fixed realization of a puzzle's
 * figure: a step was accepted if it was numerically true and one-step derivable
 * in that single diagram. A non-generic figure (an accidental coincidence) could
 * therefore let a figure-specific step pass.
 *
 * This module produces SEVERAL independent, generic realizations of the same
 * puzzle — all satisfying the puzzle's `given` hypotheses by construction — so
 * the verifier can require a step to hold across all of them. A genuine theorem
 * survives every realization; a coincidence does not.
 *
 * Realization 0 is always the puzzle's canonical fixed `coords`/`variables`.
 * Realizations 1..n-1 come from `puzzle.construct(rng)` (free points placed from
 * a seeded RNG, dependent points derived). Each constructed sample is VALIDATED
 * (every given holds; no degenerate/coincident points) and rejected+resampled on
 * failure, so we never verify against a broken figure. Puzzles without a
 * `construct` simply yield the single canonical realization.
 */
import { factHoldsL } from "./lengths/dsl";
import { dist, type V } from "./geom";
import type { LFact } from "./dsl";
import type { Puzzle, Realization } from "./types";

/** Default number of realizations the UI verifies each step against. */
export const DEFAULT_REALIZATIONS = 5;

/**
 * Deterministic uniform RNG in [0, 1) (mulberry32). Seeded so constructions —
 * and therefore the whole multi-case verification — are reproducible in tests.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A realization is non-degenerate if every pair of points is well separated. */
function isNonDegenerate(coords: Record<string, V>): boolean {
  const ids = Object.keys(coords);
  const pts = ids.map((id) => coords[id]);
  if (pts.some((p) => !p || !Number.isFinite(p[0]) || !Number.isFinite(p[1]))) {
    return false;
  }
  // Scale-relative separation: compare to the figure's bounding-box diagonal so
  // the guard is invariant to how large a construction draws the figure.
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const diag = Math.hypot(
    Math.max(...xs) - Math.min(...xs),
    Math.max(...ys) - Math.min(...ys),
  );
  if (!Number.isFinite(diag) || diag < 1e-9) return false;
  const minSep = 1e-3 * diag;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      if (dist(pts[i], pts[j]) < minSep) return false;
    }
  }
  return true;
}

/** Every given hypothesis must hold numerically in the realization. */
function satisfiesGivens(given: LFact[], r: Realization): boolean {
  return given.every((g) => factHoldsL(g, r.coords, r.bindings ?? {}));
}

/**
 * A constructed realization is usable iff it is non-degenerate AND satisfies all
 * of the puzzle's givens — otherwise the construction drew a broken figure and
 * the sample is discarded.
 */
export function isValidRealization(puzzle: Puzzle, r: Realization): boolean {
  return isNonDegenerate(r.coords) && satisfiesGivens(puzzle.given, r);
}

/**
 * Sample up to `n` realizations of `puzzle`. The first is always the canonical
 * fixed figure; the rest are drawn from `puzzle.construct` (when present),
 * validated and resampled on failure. Falls back to the canonical figure alone
 * when the puzzle has no construction. Deterministic in `seed`.
 */
export function sampleRealizations(
  puzzle: Puzzle,
  n: number = DEFAULT_REALIZATIONS,
  seed: number = 0x1234567,
): Realization[] {
  const canonical: Realization = {
    coords: puzzle.coords,
    bindings: puzzle.variables,
  };
  const out: Realization[] = [canonical];
  if (!puzzle.construct || n <= 1) return out;

  const rng = makeRng(seed);
  const maxAttempts = (n - 1) * 40;
  let attempts = 0;
  while (out.length < n && attempts < maxAttempts) {
    attempts++;
    let candidate: Realization;
    try {
      candidate = puzzle.construct(rng);
    } catch {
      continue; // a construction that threw (e.g. parallel lines) — resample
    }
    // Angle-variable bindings (e.g. A -> ∠BAC) are point-triples, independent of
    // the concrete coordinates — so a construction inherits the puzzle's bindings
    // unless it deliberately overrides them.
    if (!candidate.bindings && puzzle.variables) {
      candidate = { coords: candidate.coords, bindings: puzzle.variables };
    }
    if (isValidRealization(puzzle, candidate)) out.push(candidate);
  }
  return out;
}
