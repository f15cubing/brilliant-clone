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
  | "eqangle"; // ∠(a,b,c) = ∠(d,e,f): 6 points

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

export type Fact = Rel | Aval;

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
  }
}

/** A canonical string key for a fact, accounting for its symmetries. */
export function canonicalKey(f: Fact): string {
  if (f.kind === "rel") return relKey(f);
  return `aval(${angleKey(f.angle[0], f.angle[1], f.angle[2])}=${fstr(f.form)})`;
}

export function factEqual(a: Fact, b: Fact): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "aval" && b.kind === "aval") {
    return (
      angleKey(a.angle[0], a.angle[1], a.angle[2]) ===
        angleKey(b.angle[0], b.angle[1], b.angle[2]) && feq(a.form, b.form)
    );
  }
  return canonicalKey(a) === canonicalKey(b);
}

export function isAmong(fact: Fact, facts: Fact[]): boolean {
  const key = canonicalKey(fact);
  return facts.some((f) => canonicalKey(f) === key);
}

/** A KaTeX/markdown label (wrap math in `$...$` for `MathText`). */
export function factLabel(f: Fact): string {
  if (f.kind === "aval") {
    const [a, b, c] = f.angle;
    return `$\\angle ${a}${b}${c} = ${fstr(f.form)}$`;
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
  }
}
