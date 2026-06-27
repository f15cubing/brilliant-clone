/**
 * Linear forms over named angle variables (e.g. A, B) with a rational constant,
 * plus a small parser so a learner can type `180 - A/2 - B/2`.
 */
import {
  radd,
  rat,
  rdiv,
  req,
  rmul,
  rneg,
  rstr,
  rsub,
  rzero,
  risZero,
  rnum,
  type Rat,
} from "./rational";

export interface Form {
  /** constant term */
  c: Rat;
  /** variable -> coefficient (only nonzero coefficients are stored) */
  v: Record<string, Rat>;
}

export const constForm = (r: Rat): Form => ({ c: r, v: {} });
export const varForm = (name: string): Form => ({ c: rzero, v: { [name]: rat(1) } });

// ---- angle tokens -------------------------------------------------------
// A form variable may be a named puzzle variable (e.g. "A") OR an angle token
// referencing a concrete angle by its three points (e.g. ∠BIA). Tokens let a
// learner write arithmetic *between angles*, like `180 - angle(B,I,A)`.

const ANGLE_TOKEN = "#ang:";

/** Encode the angle (a, b, c) with vertex b as a form-variable token. */
export function encodeAngle(a: string, b: string, c: string): string {
  const [x, z] = a <= c ? [a, c] : [c, a]; // arms unordered (∠ABC = ∠CBA)
  return `${ANGLE_TOKEN}${x},${z}@${b}`;
}

export const isAngleToken = (key: string): boolean => key.startsWith(ANGLE_TOKEN);

/** Decode a token back to [arm, vertex, arm]. */
export function decodeAngle(key: string): [string, string, string] {
  const [arms, b] = key.slice(ANGLE_TOKEN.length).split("@");
  const [x, z] = arms.split(",");
  return [x, b, z];
}

/** Display label for an angle token: KaTeX, e.g. `\angle ABC` (vertex middle). */
const angleTokenLatex = (key: string): string => {
  const [x, b, z] = decodeAngle(key);
  return `\\angle ${x}${b}${z}`;
};

/** Machine label for an angle token: parse syntax, e.g. `angle(A,B,C)`. The
 * inverse of `parseAngleCall`, so `parseForm(formToExpr(f))` round-trips and,
 * unlike `\angle ABC`, stays unambiguous for multi-character point labels. */
const angleTokenCall = (key: string): string => {
  const [x, b, z] = decodeAngle(key);
  return `angle(${x},${b},${z})`;
};

function clean(v: Record<string, Rat>): Record<string, Rat> {
  const out: Record<string, Rat> = {};
  for (const k of Object.keys(v)) if (!risZero(v[k])) out[k] = v[k];
  return out;
}

export function fadd(a: Form, b: Form): Form {
  const v: Record<string, Rat> = { ...a.v };
  for (const k of Object.keys(b.v)) v[k] = radd(v[k] ?? rzero, b.v[k]);
  return { c: radd(a.c, b.c), v: clean(v) };
}

export const fneg = (a: Form): Form => {
  const v: Record<string, Rat> = {};
  for (const k of Object.keys(a.v)) v[k] = rneg(a.v[k]);
  return { c: rneg(a.c), v };
};

export const fsub = (a: Form, b: Form): Form => fadd(a, fneg(b));

export const fscale = (a: Form, r: Rat): Form => {
  const v: Record<string, Rat> = {};
  for (const k of Object.keys(a.v)) v[k] = rmul(a.v[k], r);
  return { c: rmul(a.c, r), v: clean(v) };
};

export function feq(a: Form, b: Form): boolean {
  if (!req(a.c, b.c)) return false;
  const keys = new Set([...Object.keys(a.v), ...Object.keys(b.v)]);
  for (const k of keys) {
    if (!req(a.v[k] ?? rzero, b.v[k] ?? rzero)) return false;
  }
  return true;
}

/** Numeric value of a form given concrete variable values (degrees). */
export function fevalNumeric(a: Form, vals: Record<string, number>): number {
  let s = rnum(a.c);
  for (const k of Object.keys(a.v)) {
    if (!(k in vals)) throw new Error(`no value for variable ${k}`);
    s += rnum(a.v[k]) * vals[k];
  }
  return s;
}

function termStr(coeff: Rat, label: string): string {
  // coeff != 0 guaranteed
  const neg = coeff.n < 0;
  const n = Math.abs(coeff.n);
  const d = coeff.d;
  let mag: string;
  if (d === 1) mag = n === 1 ? label : `${n}${label}`;
  else mag = n === 1 ? `${label}/${d}` : `${n}${label}/${d}`;
  return (neg ? "-" : "+") + mag;
}

/**
 * Serialize a form, rendering angle tokens via `angleLabel`. The `fstr`/`formToExpr`
 * pair share this so the only difference between display and machine output is how
 * an angle is written (`\angle ABC` vs `angle(A,B,C)`).
 */
function serializeForm(a: Form, angleLabel: (key: string) => string): string {
  const parts: string[] = [];
  if (!risZero(a.c)) parts.push((a.c.n < 0 ? "-" : "+") + rstr({ n: Math.abs(a.c.n), d: a.c.d }));
  for (const k of Object.keys(a.v).sort()) {
    parts.push(termStr(a.v[k], isAngleToken(k) ? angleLabel(k) : k));
  }
  if (parts.length === 0) return "0";
  // drop a leading '+'
  const first = parts[0].startsWith("+") ? parts[0].slice(1) : parts[0];
  const rest = parts.slice(1).map((p) => (p.startsWith("-") ? ` - ${p.slice(1)}` : ` + ${p.slice(1)}`));
  return first + rest.join("");
}

/** Human/KaTeX-friendly string, e.g. "180 - A/2 - B/2" or "180 - \angle AOC". */
export const fstr = (a: Form): string => serializeForm(a, angleTokenLatex);

/**
 * Machine-friendly string in the SAME syntax `parseForm` accepts, e.g.
 * "180 - angle(A,O,C)". Use this (not `fstr`) anywhere a serialized form must be
 * re-parsed — e.g. the AI translator context (`factToDescriptor`) and the editor
 * pre-fill — so the round-trip `parseForm(formToExpr(f))` stays faithful instead
 * of leaking LaTeX (`\angle …`) that `parseForm` cannot read.
 */
export const formToExpr = (a: Form): string => serializeForm(a, angleTokenCall);

// ---- parser -------------------------------------------------------------

type Val = { k: "c"; r: Rat } | { k: "f"; f: Form };

const toForm = (x: Val): Form => (x.k === "c" ? constForm(x.r) : x.f);

function vadd(a: Val, b: Val): Val {
  if (a.k === "c" && b.k === "c") return { k: "c", r: radd(a.r, b.r) };
  return { k: "f", f: fadd(toForm(a), toForm(b)) };
}
function vsub(a: Val, b: Val): Val {
  if (a.k === "c" && b.k === "c") return { k: "c", r: rsub(a.r, b.r) };
  return { k: "f", f: fsub(toForm(a), toForm(b)) };
}
function vmul(a: Val, b: Val): Val {
  if (a.k === "c" && b.k === "c") return { k: "c", r: rmul(a.r, b.r) };
  if (a.k === "c") return { k: "f", f: fscale(toForm(b), a.r) };
  if (b.k === "c") return { k: "f", f: fscale(toForm(a), b.r) };
  throw new Error("expression is not linear (variable times variable)");
}
function vdiv(a: Val, b: Val): Val {
  if (b.k !== "c") throw new Error("cannot divide by a variable");
  if (a.k === "c") return { k: "c", r: rdiv(a.r, b.r) };
  return { k: "f", f: fscale(a.f, rdiv(rat(1), b.r)) };
}

type Tok = { t: "num"; v: number } | { t: "id"; v: string } | { t: "op"; v: string };

/**
 * Rewrite display angle notation into the canonical `angle(A,B,C)` call so a
 * producer that speaks LaTeX/Unicode (the AI translator, or `fstr` output that
 * leaked into an editable field) still parses. Handles `\angle ABC`, `∠ABC`, and
 * comma-separated `\angle A,B,C`. A bare run of labels (`ABC`) is split into
 * single characters — the standard single-letter case; multi-letter labels must
 * be comma-separated to stay unambiguous (which is exactly what `formToExpr`
 * emits), otherwise the resulting arity error is surfaced by `parseAngleCall`.
 */
function normalizeAngleNotation(input: string): string {
  return input.replace(
    /(?:\\angle|∠)\s*([A-Za-z0-9]+(?:\s*,\s*[A-Za-z0-9]+)*)/g,
    (_match, body: string) => {
      const labels = body.includes(",")
        ? body.split(",").map((s) => s.trim()).filter(Boolean)
        : body.split("");
      return `angle(${labels.join(",")})`;
    },
  );
}

function tokenize(s: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if ("+-*/(),".includes(ch)) {
      toks.push({ t: "op", v: ch });
      i++;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let j = i;
      while (j < s.length && /[0-9]/.test(s[j])) j++;
      toks.push({ t: "num", v: parseInt(s.slice(i, j), 10) });
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(ch)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      toks.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`unexpected character '${ch}'`);
  }
  return toks;
}

/** Parse a linear expression (integers, + - * /, parens, variable names). */
export function parseForm(input: string): Form {
  const toks = tokenize(normalizeAngleNotation(input));
  let pos = 0;
  const peek = (): Tok | undefined => toks[pos];
  const eat = (): Tok => {
    const t = toks[pos++];
    if (!t) throw new Error("unexpected end of expression");
    return t;
  };
  const isOp = (v: string) => {
    const t = peek();
    return t && t.t === "op" && t.v === v;
  };

  function parseExpr(): Val {
    let left = parseTerm();
    for (;;) {
      if (isOp("+")) {
        eat();
        left = vadd(left, parseTerm());
      } else if (isOp("-")) {
        eat();
        left = vsub(left, parseTerm());
      } else break;
    }
    return left;
  }
  function parseTerm(): Val {
    let left = parseUnary();
    for (;;) {
      if (isOp("*")) {
        eat();
        left = vmul(left, parseUnary());
      } else if (isOp("/")) {
        eat();
        left = vdiv(left, parseUnary());
      } else break;
    }
    return left;
  }
  function parseUnary(): Val {
    if (isOp("-")) {
      eat();
      return vmul({ k: "c", r: rat(-1) }, parseUnary());
    }
    if (isOp("+")) {
      eat();
      return parseUnary();
    }
    return parsePrimary();
  }
  function parseAngleCall(): Val {
    eat(); // "("
    const pts: string[] = [];
    for (;;) {
      const tk = eat();
      if (tk.t !== "id") throw new Error("expected a point label in angle(...)");
      pts.push(tk.v);
      if (isOp(",")) {
        eat();
        continue;
      }
      break;
    }
    if (!isOp(")")) throw new Error("missing ')' in angle(...)");
    eat();
    if (pts.length !== 3) throw new Error("angle(...) takes 3 points: angle(A, B, C)");
    return { k: "f", f: varForm(encodeAngle(pts[0], pts[1], pts[2])) };
  }
  function parsePrimary(): Val {
    if (isOp("(")) {
      eat();
      const v = parseExpr();
      if (!isOp(")")) throw new Error("missing ')'");
      eat();
      return v;
    }
    const t = eat();
    if (t.t === "num") return { k: "c", r: rat(t.v) };
    if (t.t === "id") {
      if (t.v === "angle" && isOp("(")) return parseAngleCall();
      return { k: "f", f: varForm(t.v) };
    }
    throw new Error(`unexpected token '${t.v}'`);
  }

  const result = parseExpr();
  if (pos !== toks.length) throw new Error("trailing characters in expression");
  return toForm(result);
}
