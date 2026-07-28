/**
 * Certificate extraction for the algebraic layers.
 *
 * `AngleAR` / `LengthAR` answer "is this fact entailed?" with a boolean. That is
 * enough to accept a step, but it leaves the *reason* locked inside the
 * elimination table, so a human reading a finished proof has to redo the
 * elimination to check the step.
 *
 * This module recovers the reason. Both tables encode every fact as a linear
 * equation over exact rationals (directions mod 180° for angles, log-distances
 * for lengths), so "the candidate follows from these facts" means precisely:
 *
 *     candidate_eq  =  Σ λᵢ · factᵢ_eq   ( + k · 180°, for the angle table )
 *
 * Finding the λᵢ is one exact-rational linear solve. The result is a
 * certificate: a short list of "coefficient × cited fact" terms that a reader
 * can add up by hand. That is what turns an accepted step into an auditable one.
 *
 * Everything here is fail-closed. A certificate is only ever returned when it
 * has been substituted back and confirmed to reproduce the candidate equation
 * exactly, so a certificate can be trusted on its own terms even if this solver
 * has a bug: a wrong λ vector fails its own check and is discarded.
 */
import {
  radd,
  rat,
  rdiv,
  risZero,
  rmul,
  rneg,
  rzero,
  type Rat,
} from "./rational";

/** A linear expression: generator name -> exact rational coefficient. */
export type LinExpr = Record<string, Rat>;

const strip = (e: LinExpr): LinExpr => {
  const out: LinExpr = {};
  for (const k of Object.keys(e)) if (!risZero(e[k])) out[k] = e[k];
  return out;
};

const plus = (a: LinExpr, b: LinExpr): LinExpr => {
  const e: LinExpr = { ...a };
  for (const k of Object.keys(b)) e[k] = radd(e[k] ?? rzero, b[k]);
  return strip(e);
};

const scale = (e: LinExpr, m: Rat): LinExpr => {
  const out: LinExpr = {};
  for (const k of Object.keys(e)) out[k] = rmul(e[k], m);
  return strip(out);
};

/** Is `r` a whole number? (the angle table may absorb whole turns of 180°) */
const isInteger = (r: Rat): boolean => r.n % r.d === 0;

/**
 * Express `target` as a rational combination of `basis`.
 *
 * When `constName` is given (the angle table's 180° generator) the combination
 * may leave behind a whole multiple of that constant, returned as `turns`;
 * everything else must cancel exactly. When it is omitted (the length table)
 * nothing may be left over.
 *
 * Free variables are pinned to zero, which yields the sparsest solution the
 * elimination order happens to reach; `solveSparse` then shortens it further.
 */
export function solveCombination(
  basis: LinExpr[],
  target: LinExpr,
  constName?: string,
): { coeffs: Rat[]; turns: Rat } | null {
  const n = basis.length;

  // One equation per generator that has to cancel. The modular constant is
  // excluded: it is allowed to survive as `turns`.
  const gens = new Set<string>();
  for (const k of Object.keys(target)) if (k !== constName) gens.add(k);
  for (const b of basis) for (const k of Object.keys(b)) if (k !== constName) gens.add(k);

  // Augmented matrix, rows = generators, columns = basis vectors, last = target.
  const M: Rat[][] = [...gens].map((g) => {
    const row = basis.map((b) => b[g] ?? rzero);
    row.push(target[g] ?? rzero);
    return row;
  });

  // Reduced row echelon form over exact rationals.
  const pivotCol: number[] = [];
  let r = 0;
  for (let c = 0; c < n && r < M.length; c++) {
    let p = -1;
    for (let i = r; i < M.length; i++) {
      if (!risZero(M[i][c])) {
        p = i;
        break;
      }
    }
    if (p === -1) continue;
    [M[r], M[p]] = [M[p], M[r]];
    const lead = M[r][c];
    for (let j = 0; j <= n; j++) M[r][j] = rdiv(M[r][j], lead);
    for (let i = 0; i < M.length; i++) {
      if (i === r || risZero(M[i][c])) continue;
      const f = M[i][c];
      for (let j = 0; j <= n; j++) M[i][j] = radd(M[i][j], rneg(rmul(f, M[r][j])));
    }
    pivotCol.push(c);
    r++;
  }

  // A row with no coefficients but a non-zero target entry is unsatisfiable.
  for (let i = r; i < M.length; i++) if (!risZero(M[i][n])) return null;

  // In RREF with free variables at zero, each pivot reads straight off the RHS.
  const coeffs: Rat[] = new Array<Rat>(n).fill(rzero);
  for (let i = 0; i < pivotCol.length; i++) coeffs[pivotCol[i]] = M[i][n];

  // Whatever the combination leaves on the modular constant.
  let turns = rzero;
  if (constName) {
    turns = target[constName] ?? rzero;
    for (let i = 0; i < n; i++) {
      if (risZero(coeffs[i])) continue;
      turns = radd(turns, rneg(rmul(coeffs[i], basis[i][constName] ?? rzero)));
    }
    // Only whole turns of 180° may be absorbed.
    if (!isInteger(turns)) return null;
  }

  // Substitute back. A certificate that does not reproduce the target is thrown
  // away rather than reported, so a solver bug can never fabricate a reason.
  if (!checkCombination(basis, target, coeffs, turns, constName)) return null;

  return { coeffs, turns };
}

/** Recompute Σ λᵢ·basisᵢ (+ turns·const) and compare it against `target`. */
export function checkCombination(
  basis: LinExpr[],
  target: LinExpr,
  coeffs: Rat[],
  turns: Rat,
  constName?: string,
): boolean {
  let acc: LinExpr = {};
  for (let i = 0; i < basis.length; i++) {
    if (risZero(coeffs[i])) continue;
    acc = plus(acc, scale(basis[i], coeffs[i]));
  }
  if (constName && !risZero(turns)) acc = plus(acc, { [constName]: turns });
  const diff = strip(plus(target, scale(acc, rat(-1))));
  return Object.keys(diff).length === 0;
}

/**
 * A shortest-we-can-cheaply-find combination. Solves once, then tries to drop
 * each contributing term and re-solve without it, keeping the drop when the
 * target is still reachable.
 *
 * Sparsity is the whole point: a certificate over 3 facts is checkable by hand
 * in a few seconds, one over 40 is not. Only the terms of the first solution are
 * candidates for dropping, so this stays cheap even when the basis is large.
 */
export function solveSparse(
  basis: LinExpr[],
  target: LinExpr,
  constName?: string,
): { coeffs: Rat[]; turns: Rat } | null {
  const first = solveCombination(basis, target, constName);
  if (!first) return null;

  // Indices that actually contribute, largest-index-first so later (usually
  // derived) facts are dropped before earlier (usually cited) ones.
  const live = first.coeffs
    .map((c, i) => [i, c] as const)
    .filter(([, c]) => !risZero(c))
    .map(([i]) => i)
    .reverse();

  let keep = new Set(live);
  let best = first;

  for (const i of live) {
    if (!keep.has(i)) continue;
    const trial = new Set(keep);
    trial.delete(i);
    const idx = [...trial].sort((a, b) => a - b);
    const sol = solveCombination(
      idx.map((k) => basis[k]),
      target,
      constName,
    );
    if (!sol) continue;
    // Re-expand the reduced solution back onto the full basis indexing.
    const coeffs: Rat[] = new Array<Rat>(basis.length).fill(rzero);
    idx.forEach((k, j) => (coeffs[k] = sol.coeffs[j]));
    keep = new Set(idx.filter((k) => !risZero(coeffs[k])));
    best = { coeffs, turns: sol.turns };
  }

  return best;
}
