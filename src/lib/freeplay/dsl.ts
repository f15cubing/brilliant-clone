/**
 * Freeplay formal language.
 *
 * A `Fact` is either:
 *  - a `Rel` (relation): coll/para/perp/cong/cyclic/midp/eqangle over points, or
 *  - an `Aval` (angle value): the measure of angle (a,b,c) (vertex b) equals a
 *    linear form in named angle variables, e.g. ∠BIA = 180 - A/2 - B/2.
 *
 * `eqangle` uses the friendly 3+3 vertex form `eqangle(a,b,c,d,e,f)` meaning the
 * angle (a,b,c) equals the angle (d,e,f) (b,e are the vertices).
 */
import { feq, fstr, type Form } from "./form";

export type PointId = string;

export type RelName =
  | "coll" // collinear: 3 points
  | "para" // AB ∥ CD: 4 points
  | "perp" // AB ⊥ CD: 4 points
  | "cong" // AB = CD: 4 points
  | "cyclic" // concyclic: 4 points
  | "midp" // M is midpoint of AB: 3 points (M first)
  | "eqangle" // ∠(a,b,c) = ∠(d,e,f): 6 points
  | "similar"; // △ABC ~ △DEF: 6 points (correspondence A↔D, B↔E, C↔F)

export interface Rel {
  kind: "rel";
  name: RelName;
  points: PointId[];
}

export interface Aval {
  kind: "aval";
  /** angle (a, b, c) with vertex b */
  angle: [PointId, PointId, PointId];
  /** measure in degrees as a linear form over angle variables */
  form: Form;
}

/**
 * A proportion AB/CD = EF/GH over the 8 points [A,B,C,D,E,F,G,H] (the ratio of
 * the unordered segment AB to CD equals the ratio of EF to GH). This is the
 * LENGTH/RATIO subsystem's fact kind. It is deliberately kept OUT of the shipped
 * `Fact` union (so the angle-only consumers — `symmetry.ts`, the UI, etc. — are
 * untouched) and lives only in the additive `LFact` union below. The shipped
 * canonical-key / equality / label helpers are widened to accept `LFact`, so an
 * `eqratio`-shaped fact is handled explicitly instead of crashing the `aval`
 * branch (see `canonicalKey`).
 */
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

/** The shipped (angle/incidence) fact language. */
export type Fact = Rel | Aval;

/**
 * The length-aware fact union: a shipped `Fact` or an `EqRatio`. Everything is
 * additive — ordinary `Fact`s keep their shipped canonical keys, so the length
 * layer interoperates with the angle layer unchanged.
 */
export type LFact = Fact | EqRatio;

/** A rule id from the engine's theorem library (display only). */
export type RuleId = string;

export interface Justification {
  premises: Fact[];
  rule?: RuleId;
}

export const rel = (name: RelName, points: PointId[]): Rel => ({ kind: "rel", name, points });
export const aval = (angle: [PointId, PointId, PointId], form: Form): Aval => ({
  kind: "aval",
  angle,
  form,
});

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

export interface RelMeta {
  arity: number;
  slots: string[];
  label: string;
  /** coll accepts 3 or more points (a whole line in one fact). */
  variadic?: boolean;
}

export const RELS: Record<RelName, RelMeta> = {
  coll: { arity: 3, slots: ["P", "Q", "R"], label: "Collinear (3+ points)", variadic: true },
  para: { arity: 4, slots: ["A", "B", "C", "D"], label: "Parallel  AB ∥ CD" },
  perp: { arity: 4, slots: ["A", "B", "C", "D"], label: "Perpendicular  AB ⊥ CD" },
  cong: { arity: 4, slots: ["A", "B", "C", "D"], label: "Equal segments  AB = CD" },
  cyclic: { arity: 4, slots: ["A", "B", "C", "D"], label: "Concyclic (4 points)" },
  midp: { arity: 3, slots: ["M", "A", "B"], label: "Midpoint  M of AB" },
  eqangle: {
    arity: 6,
    slots: ["A", "B", "C", "D", "E", "F"],
    label: "Equal angles  ∠ABC = ∠DEF",
  },
  similar: {
    arity: 6,
    slots: ["A", "B", "C", "D", "E", "F"],
    label: "Similar triangles  △ABC ~ △DEF",
  },
};

const sortPair = (a: PointId, b: PointId): [PointId, PointId] =>
  a <= b ? [a, b] : [b, a];

/** Canonical token for an angle (vertex middle), accounting for ∠ABC = ∠CBA. */
export function angleKey(a: PointId, b: PointId, c: PointId): string {
  const [x, z] = sortPair(a, c);
  return `${x}${b}${z}`;
}

function relKey(p: Rel): string {
  const pts = p.points;
  switch (p.name) {
    case "coll":
    case "cyclic":
      return `${p.name}(${[...pts].sort().join(",")})`;
    case "para":
    case "perp":
    case "cong": {
      const l1 = sortPair(pts[0], pts[1]);
      const l2 = sortPair(pts[2], pts[3]);
      const [a, b] = [l1.join(""), l2.join("")].sort();
      return `${p.name}(${a},${b})`;
    }
    case "midp":
      return `midp(${pts[0]};${[...pts.slice(1)].sort().join(",")})`;
    case "eqangle": {
      const a1 = angleKey(pts[0], pts[1], pts[2]);
      const a2 = angleKey(pts[3], pts[4], pts[5]);
      return `eqangle(${[a1, a2].sort().join("=")})`;
    }
    case "similar":
      return similarKey(pts);
  }
}

/** The 6 permutations of the three triangle-vertex positions {0,1,2}. */
const TRI_PERMS: readonly [number, number, number][] = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

/**
 * Canonical key for the similarity △ABC ~ △DEF over [A,B,C,D,E,F], collapsing
 * the two symmetries of the relation:
 *   - swapping the two triangles:   △ABC ~ △DEF  ⇔  △DEF ~ △ABC;
 *   - applying the SAME vertex permutation to BOTH triangles at once (the 6
 *     permutations of {0,1,2}), which only re-lists the SAME correspondence
 *     (A↔D, B↔E, C↔F) — e.g. △BCA ~ △EFD is the same statement.
 * We emit every equivalent encoding (6 permutations × the unordered triangle
 * pair) and keep the lexicographically smallest. Vertices are comma-separated so
 * multi-character labels (A2, B2, …) never run together ambiguously.
 */
export function similarKey(pts: PointId[]): string {
  const t1 = [pts[0], pts[1], pts[2]];
  const t2 = [pts[3], pts[4], pts[5]];
  const tri = (t: string[], [i, j, k]: readonly [number, number, number]): string =>
    `${t[i]},${t[j]},${t[k]}`;
  const forms = TRI_PERMS.map((p) => [tri(t1, p), tri(t2, p)].sort().join("~"));
  forms.sort();
  return `similar(${forms[0]})`;
}

/** Canonical token for the UNORDERED segment {p, q} (so PQ = QP). */
const segKey = (p: PointId, q: PointId): string => (p <= q ? `${p}|${q}` : `${q}|${p}`);

/**
 * Canonical key for a proportion AB/CD = EF/GH, accounting for:
 *   - endpoints unordered within a segment (AB = BA), via `segKey`;
 *   - swapping the two ratios:   AB/CD = EF/GH  ⇔  EF/GH = AB/CD;
 *   - inverting both ratios:     AB/CD = EF/GH  ⇔  CD/AB = GH/EF;
 *   - and the composition:                       ⇔  GH/EF = CD/AB.
 * We emit all four equivalent strings and keep the lexicographically smallest.
 */
export function eqratioKey(pts: EqRatio["points"]): string {
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

/**
 * A canonical string key for a fact, accounting for its symmetries. Accepts an
 * `LFact`: an `eqratio`-shaped fact is keyed explicitly here rather than falling
 * into the `aval` branch (which would throw reading `f.angle`).
 */
export function canonicalKey(f: LFact): string {
  if (f.kind === "rel") return relKey(f);
  if (f.kind === "eqratio") return eqratioKey(f.points);
  return `aval(${angleKey(f.angle[0], f.angle[1], f.angle[2])}=${fstr(f.form)})`;
}

export function factEqual(a: LFact, b: LFact): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "aval" && b.kind === "aval") {
    return (
      angleKey(a.angle[0], a.angle[1], a.angle[2]) ===
        angleKey(b.angle[0], b.angle[1], b.angle[2]) && feq(a.form, b.form)
    );
  }
  // Both `rel`/`rel` and `eqratio`/`eqratio` compare by canonical key.
  return canonicalKey(a) === canonicalKey(b);
}

export function isAmong(fact: LFact, facts: LFact[]): boolean {
  const key = canonicalKey(fact);
  return facts.some((f) => canonicalKey(f) === key);
}

/** A KaTeX/markdown label (wrap math in `$...$` for `MathText`). */
export function factLabel(f: LFact): string {
  if (f.kind === "aval") {
    const [a, b, c] = f.angle;
    return `$\\angle ${a}${b}${c} = ${fstr(f.form)}$`;
  }
  if (f.kind === "eqratio") {
    const [a, b, c, d, e, h, i, j] = f.points;
    return `$\\frac{${a}${b}}{${c}${d}} = \\frac{${e}${h}}{${i}${j}}$`;
  }
  const [a, b, c, d, e, g] = f.points;
  switch (f.name) {
    case "coll":
      return `$${f.points.join(", ")}$ are collinear`;
    case "para":
      return `$${a}${b} \\parallel ${c}${d}$`;
    case "perp":
      return `$${a}${b} \\perp ${c}${d}$`;
    case "cong":
      return `$${a}${b} = ${c}${d}$`;
    case "cyclic":
      return `$${a}, ${b}, ${c}, ${d}$ are concyclic`;
    case "midp":
      return `$${a}$ is the midpoint of $${b}${c}$`;
    case "eqangle":
      return `$\\angle ${a}${b}${c} = \\angle ${d}${e}${g}$`;
    case "similar":
      return `$\\triangle ${a}${b}${c} \\sim \\triangle ${d}${e}${g}$`;
  }
}
