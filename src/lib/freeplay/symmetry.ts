/**
 * "By symmetry" / analogous arguments.
 *
 * A point relabeling σ that maps the puzzle's GIVENS onto themselves is an
 * automorphism of the hypotheses. Because every rule in the library is
 * relabeling-invariant (it never depends on specific point names), any
 * established fact F then guarantees that σ(F) has an identical proof. So the
 * learner can assert σ(F) "analogously" — the same calculation with switched
 * letters — and we accept it soundly after checking σ is such a symmetry.
 */
import { aval, canonicalKey, isAmong, rel, type Fact, type PointId } from "./dsl";
import { decodeAngle, encodeAngle, isAngleToken, type Form } from "./form";
import { radd, rzero, type Rat } from "./rational";

/** A point relabeling. Unlisted points map to themselves. */
export type Subst = Record<PointId, PointId>;

const mapPoint = (s: Subst, p: PointId): PointId => s[p] ?? p;

/** Relabel the variables of a linear form (angle tokens and named vars). */
function mapForm(form: Form, s: Subst): Form {
  const v: Record<string, Rat> = {};
  for (const key of Object.keys(form.v)) {
    let nk: string;
    if (isAngleToken(key)) {
      const [x, b, z] = decodeAngle(key);
      nk = encodeAngle(mapPoint(s, x), mapPoint(s, b), mapPoint(s, z));
    } else {
      nk = s[key] ?? key;
    }
    v[nk] = radd(v[nk] ?? rzero, form.v[key]);
  }
  return { c: form.c, v };
}

/** Apply a relabeling to a fact (points, angle tokens, named variables). */
export function applySubst(f: Fact, s: Subst): Fact {
  if (f.kind === "aval") {
    const [a, b, c] = f.angle;
    return aval(
      [mapPoint(s, a), mapPoint(s, b), mapPoint(s, c)],
      mapForm(f.form, s),
    );
  }
  return rel(
    f.name,
    f.points.map((p) => mapPoint(s, p)),
  );
}

/** Is σ a bijection of the given point universe? */
export function isBijection(s: Subst, points: PointId[]): boolean {
  const set = new Set(points);
  const image = points.map((p) => mapPoint(s, p));
  return new Set(image).size === points.length && image.every((p) => set.has(p));
}

/**
 * Does σ map the set of givens onto itself? (Up to each relation's symmetries.)
 * This is the soundness condition for a "by symmetry" step.
 */
export function isGivenSymmetry(
  s: Subst,
  givens: Fact[],
  points: PointId[],
): boolean {
  if (Object.keys(s).length === 0) return false; // identity is not an argument
  if (!isBijection(s, points)) return false;
  return givens.every((g) => isAmong(applySubst(g, s), givens));
}

/**
 * Diagnose why σ fails to be a symmetry of the givens (for live UI feedback).
 * Returns null when σ *is* a valid symmetry.
 */
export function symmetryProblem(
  s: Subst,
  givens: Fact[],
  points: PointId[],
):
  | { kind: "identity" }
  | { kind: "not_bijection" }
  | { kind: "breaks"; given: Fact }
  | null {
  if (Object.keys(s).length === 0) return { kind: "identity" };
  if (!isBijection(s, points)) return { kind: "not_bijection" };
  for (const g of givens) {
    if (!isAmong(applySubst(g, s), givens)) return { kind: "breaks", given: g };
  }
  return null;
}

/** The established fact whose σ-image equals `target`, if any. */
export function analogSource(
  target: Fact,
  s: Subst,
  established: Fact[],
): Fact | undefined {
  const key = canonicalKey(target);
  return established.find((f) => canonicalKey(applySubst(f, s)) === key);
}

/**
 * Parse a swap spec like "A-B, P-Q, A1-B1" into a relabeling (disjoint
 * transpositions). Returns null on malformed input or unknown/overlapping
 * points. Separators `-`, `↔`, `=` are all accepted between a pair.
 */
export function parseSwaps(text: string, valid: Set<string>): Subst | null {
  const s: Subst = {};
  const pairs = text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (pairs.length === 0) return null;
  for (const pair of pairs) {
    const parts = pair
      .split(/[-↔=]/)
      .map((x) => x.trim())
      .filter(Boolean);
    if (parts.length !== 2) return null;
    const [a, b] = parts;
    if (a === b || !valid.has(a) || !valid.has(b)) return null;
    if (s[a] !== undefined || s[b] !== undefined) return null; // overlapping swap
    s[a] = b;
    s[b] = a;
  }
  return s;
}
