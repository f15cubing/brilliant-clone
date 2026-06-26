/**
 * Algebraic Reasoning for LENGTHS — the metric companion to `src/lib/freeplay/
 * ar.ts`. Where the angle AR keeps a Gaussian-elimination table over directed
 * line angles (mod 180°), this keeps the SAME kind of exact-rational table but
 * over LOG-LENGTHS: one generator per UNORDERED segment {P,Q} standing for
 * log|PQ|. Multiplicative facts become linear equations over logs:
 *
 *   cong(A,B,C,D)                 ⇒ logAB − logCD = 0
 *   eqratio(A,B,C,D,E,F,G,H)      ⇒ logAB − logCD − logEF + logGH = 0
 *   midp(M,A,B)                   ⇒ logMA − logMB = 0   (equal halves only)
 *
 * A candidate `cong` / `eqratio` is entailed iff its equation reduces to 0 after
 * substituting everything the table already knows — exactly the `isImplied`
 * contract of `ar.py`'s `Table`.
 *
 * Unlike the angle table there is NO modular constant and NO sign/branch
 * ambiguity: every fact contributes one deterministic linear equality, so the
 * coordinates are used ONLY to guard against missing points and zero-length
 * (degenerate) segments — never to collapse two segments "for free". This keeps
 * the layer SOUND: it never claims an implication that is not a genuine linear
 * consequence of the cited equalities.
 *
 * SCOPE LIMIT (intentional): we encode `midp` only as logMA − logMB = 0 (the two
 * halves are equal). The absolute relation |AB| = 2·|MA| needs a numeric CONSTANT
 * generator (log 2), and ratios involving numeric constants are out of scope —
 * so this layer reasons purely about equalities and ratio-equalities of lengths.
 */
import type { Coords } from "@/lib/freeplay/check";
import type { PointId } from "@/lib/freeplay/dsl";
import { dist } from "@/lib/freeplay/geom";
import {
  rat,
  radd,
  rdiv,
  rmul,
  rneg,
  risZero,
  rzero,
  type Rat,
} from "@/lib/freeplay/rational";
import type { LFact } from "./dsl";

// ---- exact linear expressions: variable name -> rational coefficient --------

type Expr = Record<string, Rat>;

const strip = (e: Expr): Expr => {
  const out: Expr = {};
  for (const k of Object.keys(e)) if (!risZero(e[k])) out[k] = e[k];
  return out;
};

const plus = (a: Expr, b: Expr): Expr => {
  const e: Expr = { ...a };
  for (const k of Object.keys(b)) e[k] = radd(e[k] ?? rzero, b[k]);
  return strip(e);
};

const scale = (e: Expr, m: Rat): Expr => {
  const out: Expr = {};
  for (const k of Object.keys(e)) out[k] = rmul(e[k], m);
  return strip(out);
};

const isZero = (e: Expr): boolean => Object.keys(strip(e)).length === 0;

/** Solve e = 0 for its first variable: returns [v, expr] (v = expr) or null. */
function recon(e: Expr): [string, Expr] | null {
  const s = strip({ ...e });
  const keys = Object.keys(s);
  if (keys.length === 0) return null;
  const v0 = keys[0];
  const c0 = s[v0];
  delete s[v0];
  const res: Expr = {};
  for (const v of Object.keys(s)) res[v] = rneg(rdiv(s[v], c0));
  return [v0, res];
}

function replaceVar(e: Expr, v0: string, e0: Expr): Expr {
  if (!(v0 in e)) return e;
  const m = e[v0];
  const rest = { ...e };
  delete rest[v0];
  return plus(rest, scale(e0, m));
}

/**
 * Exact-rational coefficient table — a faithful port of `ar.py`'s `Table`
 * (`add_expr` / `is_implied`) with the angle-only modular constant removed,
 * since log-length equalities are ordinary linear equations.
 */
class Table {
  private v2e: Record<string, Expr> = {};

  private substitute(vc: Expr): { result: Expr; free: [string, Rat][] } {
    let result: Expr = {};
    const free: [string, Rat][] = [];
    for (const v of Object.keys(vc)) {
      const c = vc[v];
      if (risZero(c)) continue;
      if (v in this.v2e) result = plus(result, scale(this.v2e[v], c));
      else free.push([v, c]);
    }
    return { result, free };
  }

  private replaceAll(v0: string, e0: Expr): void {
    for (const v of Object.keys(this.v2e)) {
      this.v2e[v] = replaceVar(this.v2e[v], v0, e0);
    }
  }

  /** Add the equation `vc = 0`. Returns true if it carried new information. */
  addExpr(vc: Expr): boolean {
    const { result, free } = this.substitute(vc);

    if (free.length === 0) {
      if (isZero(result)) return false;
      const r = recon(result);
      if (r === null) return false;
      this.replaceAll(r[0], r[1]);
      return true;
    }

    if (free.length === 1) {
      const [v, m] = free[0];
      this.v2e[v] = scale(result, rneg(rdiv(rat(1), m)));
      return true;
    }

    // ≥2 new variables: keep all but the first as free generators (identity),
    // and express the first in terms of the rest.
    let dependent: [string, Rat] | null = null;
    let acc = { ...result };
    for (const [v, m] of free) {
      if (dependent === null) {
        dependent = [v, m];
        continue;
      }
      this.v2e[v] = { [v]: rat(1) };
      acc = plus(acc, { [v]: m });
    }
    const [dv, dm] = dependent!;
    this.v2e[dv] = scale(acc, rneg(rdiv(rat(1), dm)));
    return true;
  }

  /** Is the equation `vc = 0` already implied by what the table knows? */
  isImplied(vc: Expr): boolean {
    const { result, free } = this.substitute(vc);
    return free.length === 0 && isZero(result);
  }
}

// ---- length-specific layer --------------------------------------------------

/**
 * A log-length table built from a set of facts. Feed it the learner's cited
 * facts (plus, optionally, one-step DD consequences), then ask whether a
 * candidate `cong` / `eqratio` is entailed.
 */
export class LengthAR {
  private table = new Table();

  constructor(private readonly coords: Coords) {}

  /**
   * Generator for the UNORDERED segment {P,Q} = log|PQ|. Keyed so PQ and QP
   * share it, but two distinct equal-length segments do NOT — they are linked
   * only by a cited `cong`/`eqratio`/`midp`. Returns null (so the fact is simply
   * skipped) when a point is missing or the segment is degenerate.
   */
  private seg(p: PointId, q: PointId): string | null {
    const a = this.coords[p];
    const b = this.coords[q];
    if (!a || !b) return null;
    if (dist(a, b) < 1e-9) return null;
    const [x, y] = p <= q ? [p, q] : [q, p];
    return `S:${x},${y}`;
  }

  /** The linear equation (= 0, over logs) contributed by a length fact. */
  private equation(f: LFact): Expr | null {
    if (f.kind === "eqratio") {
      const [A, B, C, D, E, F, G, H] = f.points;
      const ab = this.seg(A, B);
      const cd = this.seg(C, D);
      const ef = this.seg(E, F);
      const gh = this.seg(G, H);
      if (!ab || !cd || !ef || !gh) return null;
      // logAB − logCD − logEF + logGH = 0
      let e: Expr = {};
      e = plus(e, { [ab]: rat(1) });
      e = plus(e, { [cd]: rat(-1) });
      e = plus(e, { [ef]: rat(-1) });
      e = plus(e, { [gh]: rat(1) });
      return e;
    }

    if (f.kind === "rel") {
      if (f.name === "cong") {
        const ab = this.seg(f.points[0], f.points[1]);
        const cd = this.seg(f.points[2], f.points[3]);
        if (!ab || !cd) return null;
        return plus({ [ab]: rat(1) }, { [cd]: rat(-1) }); // logAB − logCD = 0
      }
      if (f.name === "midp") {
        // midp(M,A,B): the two halves MA, MB are equal (factor-2 is out of scope).
        const ma = this.seg(f.points[0], f.points[1]);
        const mb = this.seg(f.points[0], f.points[2]);
        if (!ma || !mb) return null;
        return plus({ [ma]: rat(1) }, { [mb]: rat(-1) }); // logMA − logMB = 0
      }
    }

    return null; // every other relation carries no length equation
  }

  /** Register a fact (no-op for facts with no length equation; never throws). */
  add(f: LFact): void {
    try {
      const eq = this.equation(f);
      if (eq && Object.keys(eq).length > 0) this.table.addExpr(eq);
    } catch {
      // An unencodable / degenerate fact simply isn't added.
    }
  }

  /** Does the accumulated table entail this length fact? (never throws) */
  implies(f: LFact): boolean {
    try {
      const eq = this.equation(f);
      if (!eq) return false;
      // A trivially-empty equation (e.g. a ratio of a segment with itself) is
      // not a genuine deduction — refuse to "derive" it.
      if (Object.keys(eq).length === 0) return false;
      return this.table.isImplied(eq);
    } catch {
      return false;
    }
  }
}
