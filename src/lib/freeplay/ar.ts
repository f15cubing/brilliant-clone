/**
 * Algebraic Reasoning (AR) for angle chasing — a TypeScript port of the core
 * idea in AlphaGeometry's DDAR (`ar.py`): a Gaussian-elimination table over
 * exact rationals. A fact is "derivable" iff, after substituting everything the
 * table already knows, its equation reduces to 0 (modulo 180°).
 *
 * Like DDAR, line *directions* are tracked abstractly: every line (keyed by its
 * unordered point-pair) gets its OWN direction variable. Two lines are linked
 * only when a CITED fact justifies it (`para`/`coll` merge directions, `perp`
 * offsets by 90°, `eqangle`/`aval` relate angle differences). Coordinates are
 * used only to fix signs/branches (the ε and whole-turn j), never to collapse
 * variables — so the checker can't read parallelism or collinearity "for free"
 * off the diagram, and every used hypothesis must actually be cited.
 *
 * v1 covers ANGLES (para / perp / eqangle / aval). Lengths & ratios (cong /
 * eqratio via a log-distance table) are a natural follow-up.
 */
import type { Coords, VarBindings } from "./check";
import { evalVars } from "./check";
import type { Fact, PointId } from "./dsl";
import type { Form } from "./form";
import { decodeAngle, isAngleToken } from "./form";
import { angleDeg } from "./geom";
import {
  rat,
  radd,
  rdiv,
  rmul,
  rneg,
  risZero,
  rnum,
  rzero,
  type Rat,
} from "./rational";

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

/** r reduced into [0, 1) — i.e. r mod 1 (used to drop whole turns of 180°). */
function rmod1(r: Rat): Rat {
  const q = Math.floor(r.n / r.d);
  return rat(r.n - q * r.d, r.d);
}

/** Reduce the constant ("pi" = 180°) coefficient modulo a full turn. */
function modulo(e: Expr, constName: string): Expr {
  const out = strip({ ...e });
  if (constName in out) out[constName] = rmod1(out[constName]);
  return strip(out);
}

/** Solve e = 0 for one (non-constant) variable: returns [v, expr] or null. */
function recon(e: Expr, constName: string): [string, Expr] | null {
  const stripped = strip({ ...e });
  const keys = Object.keys(stripped);
  if (keys.length === 0) return null;
  const v0 = keys.find((v) => v !== constName);
  if (v0 === undefined) return null;
  const c0 = stripped[v0];
  delete stripped[v0];
  const res: Expr = {};
  for (const v of Object.keys(stripped)) res[v] = rneg(rdiv(stripped[v], c0));
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
 * The coefficient table. `v2e` maps each "bound" variable to an expression over
 * the remaining free generators; an equation is implied iff it reduces to 0.
 * Faithful to `ar.py`'s `Table.add_expr`.
 */
class Table {
  private v2e: Record<string, Expr> = {};
  constructor(private readonly constName: string) {
    this.v2e[constName] = { [constName]: rat(1) };
  }

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
      if (isZero(modulo(result, this.constName))) return false;
      const r = recon(result, this.constName);
      if (r === null) return false;
      this.replaceAll(r[0], r[1]);
      return true;
    }

    if (free.length === 1) {
      const [v, m] = free[0];
      this.v2e[v] = scale(result, rneg(rdiv(rat(1), m)));
      return true;
    }

    let dependent: [string, Rat] | null = null;
    let acc = { ...result };
    for (const [v, m] of free) {
      if (dependent === null && v !== this.constName) {
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
    return free.length === 0 && isZero(modulo(result, this.constName));
  }
}

// ---- angle-specific layer ---------------------------------------------------

const PI = "pi"; // the constant generator, representing 180°
const ZERO_DEG = 1e-3; // tolerance (degrees) for "is a multiple of 180°"

/**
 * An angle table built from a set of facts. Feed it the learner's cited facts
 * (plus, optionally, one-step DD consequences), then ask whether a candidate
 * angle fact is entailed.
 */
export class AngleAR {
  private table = new Table(PI);
  private vals: Record<string, number> = { [PI]: 180 };
  private named: Record<string, number> | null = null;

  constructor(
    private readonly coords: Coords,
    private readonly bindings: VarBindings,
  ) {}

  /**
   * Direction variable for the line through P and Q. Keyed by the UNORDERED
   * point-pair (so PQ and QP share it, but two distinct parallel lines do NOT —
   * they're linked only by a cited `para`/`coll`). The numeric slope is recorded
   * for sign/branch picking.
   */
  private dir(p: PointId, q: PointId): string | null {
    const a = this.coords[p];
    const b = this.coords[q];
    if (!a || !b) return null;
    let deg = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    deg = ((deg % 180) + 180) % 180;
    const [x, y] = p <= q ? [p, q] : [q, p];
    const key = `L:${x},${y}`;
    if (!(key in this.vals)) this.vals[key] = deg;
    return key;
  }

  private namedVal(name: string): number {
    if (this.named === null) this.named = evalVars(this.coords, this.bindings);
    if (!(name in this.named)) throw new Error(`AR: unknown angle variable ${name}`);
    return this.named[name];
  }

  private numeric(e: Expr): number {
    let s = 0;
    for (const k of Object.keys(e)) {
      const val = k in this.vals ? this.vals[k] : this.namedVal(k);
      s += rnum(e[k]) * val;
    }
    return s;
  }

  /** Add whole turns of 180° so the expression is numerically ≈ 0. */
  private balance(e: Expr): Expr {
    const k = -Math.round(this.numeric(e) / 180);
    return k === 0 ? e : plus(e, { [PI]: rat(k) });
  }

  /** Pick the candidate that is numerically ≡ 0 (mod 180°), then balance it. */
  private pick(candidates: Expr[]): Expr | null {
    for (const e of candidates) {
      const r = ((this.numeric(e) % 180) + 180) % 180;
      if (r < ZERO_DEG || 180 - r < ZERO_DEG) return this.balance(e);
    }
    return null;
  }

  /** Directed line angle D(VQ) − D(VP) for the angle (P, V, Q). */
  private diff(p: PointId, v: PointId, q: PointId): Expr | null {
    const a = this.dir(v, p);
    const b = this.dir(v, q);
    if (!a || !b) return null;
    return plus({ [b]: rat(1) }, { [a]: rat(-1) });
  }

  /**
   * Expression whose numeric value equals the UNDIRECTED measure of ∠(P,V,Q):
   * ε·(D(VQ) − D(VP)) + j·180°, with ε∈{±1} and the whole-turn j fixed from the
   * coordinates. This lets arbitrary linear arithmetic between angle measures be
   * encoded directly in the directed-angle table.
   */
  private measure(p: PointId, v: PointId, q: PointId): Expr | null {
    const base = this.diff(p, v, q);
    if (!base) return null;
    const delta = this.numeric(base);
    const m = angleDeg(this.coords[p], this.coords[v], this.coords[q]);
    for (const eps of [1, -1] as const) {
      const r = m - eps * delta;
      const j = Math.round(r / 180);
      if (Math.abs(r - j * 180) < ZERO_DEG) {
        return plus(scale(base, rat(eps)), { [PI]: rat(j) });
      }
    }
    return null;
  }

  /**
   * A form (in degrees) as an AR expression. Named variables stay opaque (they
   * only connect to directions through cited facts that define them); angle
   * tokens are expanded into their directed measure so angle-to-angle arithmetic
   * is fully reasoned. The constant folds into the 180° term.
   */
  private formValue(form: Form): Expr | null {
    let e: Expr = { [PI]: rmul(form.c, rat(1, 180)) };
    for (const k of Object.keys(form.v)) {
      if (isAngleToken(k)) {
        const [p, v, q] = decodeAngle(k);
        const me = this.measure(p, v, q);
        if (!me) return null;
        e = plus(e, scale(me, form.v[k]));
      } else {
        e = plus(e, { [k]: form.v[k] });
      }
    }
    return strip(e);
  }

  /** The linear equation (= 0, mod 180°) contributed by an angle fact. */
  private equation(f: Fact): Expr | null {
    if (f.kind === "aval") {
      const lhs = this.measure(f.angle[0], f.angle[1], f.angle[2]);
      if (!lhs) return null;
      const rhs = this.formValue(f.form);
      if (!rhs) return null;
      // measure(angle) − form = 0 (numerically ≈ 0 by construction)
      return this.balance(plus(lhs, scale(rhs, rat(-1))));
    }

    const pts = f.points;
    switch (f.name) {
      case "para": {
        const a = this.dir(pts[0], pts[1]);
        const b = this.dir(pts[2], pts[3]);
        if (!a || !b) return null;
        return this.pick([plus({ [a]: rat(1) }, { [b]: rat(-1) })]);
      }
      case "perp": {
        const a = this.dir(pts[0], pts[1]);
        const b = this.dir(pts[2], pts[3]);
        if (!a || !b) return null;
        const d = plus({ [a]: rat(1) }, { [b]: rat(-1) });
        // direction difference ≡ ±90° = ±½·180°
        return this.pick([plus(d, { [PI]: rat(-1, 2) }), plus(d, { [PI]: rat(1, 2) })]);
      }
      case "eqangle": {
        const d1 = this.diff(pts[0], pts[1], pts[2]);
        const d2 = this.diff(pts[3], pts[4], pts[5]);
        if (!d1 || !d2) return null;
        return this.pick([plus(d1, scale(d2, rat(-1))), plus(d1, d2)]);
      }
      default:
        return null; // coll / cong / cyclic / midp are not angle equations
    }
  }

  /** Register a fact (no-op for non-angle facts; never throws). */
  add(f: Fact): void {
    try {
      // Collinearity merges the directions of every line it spans, so one
      // coll(P,Q,R,S,…) fact links all pairwise directions of the line.
      if (f.kind === "rel" && f.name === "coll" && f.points.length >= 3) {
        const pts = f.points;
        const rep = this.dir(pts[0], pts[1]);
        if (rep) {
          for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
              if (i === 0 && j === 1) continue;
              const d = this.dir(pts[i], pts[j]);
              if (d && d !== rep) {
                this.table.addExpr(this.balance(plus({ [d]: rat(1) }, { [rep]: rat(-1) })));
              }
            }
          }
        }
        return;
      }
      const eq = this.equation(f);
      if (eq) this.table.addExpr(eq);
    } catch {
      // An unencodable fact (e.g. an unknown named variable) just isn't added.
    }
  }

  /** Does the accumulated table entail this angle fact? (never throws) */
  implies(f: Fact): boolean {
    try {
      const eq = this.equation(f);
      if (!eq) return false;
      return this.table.isImplied(eq);
    } catch {
      return false;
    }
  }
}
