/**
 * Numeric "truth check" for facts against a concrete realization of the figure.
 * Decides whether an asserted fact actually holds (not whether it follows).
 */
import type { Fact, PointId } from "./dsl";
import { decodeAngle, fevalNumeric, isAngleToken } from "./form";
import {
  angleDeg,
  circumcenter,
  cross,
  dot,
  norm,
  sub,
  unit,
  type V,
} from "./geom";

export type Coords = Record<PointId, V>;
/** Maps each angle variable (e.g. "A") to the point-triple whose measure it is. */
export type VarBindings = Record<string, [PointId, PointId, PointId]>;

const EPS = 1e-6;

/** Numeric value (degrees) of each angle variable, from its bound triple. */
export function evalVars(coords: Coords, bindings: VarBindings): Record<string, number> {
  const out: Record<string, number> = {};
  for (const name of Object.keys(bindings)) {
    const [a, b, c] = bindings[name];
    const pa = coords[a];
    const pb = coords[b];
    const pc = coords[c];
    if (!pa || !pb || !pc) throw new Error(`variable ${name} has unknown points`);
    out[name] = angleDeg(pa, pb, pc);
  }
  return out;
}

/** Degrees for one form variable: an angle token, or a named (bound) variable. */
export function angleVarValue(
  name: string,
  coords: Coords,
  bindings: VarBindings,
): number {
  const triple = isAngleToken(name) ? decodeAngle(name) : bindings[name];
  if (!triple) throw new Error(`unknown angle variable ${name}`);
  const [a, b, c] = triple;
  const pa = coords[a];
  const pb = coords[b];
  const pc = coords[c];
  if (!pa || !pb || !pc) throw new Error(`angle variable ${name} has unknown points`);
  return angleDeg(pa, pb, pc);
}

/** Returns true when the fact holds numerically in `coords`. */
export function factHolds(
  fact: Fact,
  coords: Coords,
  bindings: VarBindings = {},
): boolean {
  if (fact.kind === "aval") {
    const [a, b, c] = fact.angle;
    const pa = coords[a];
    const pb = coords[b];
    const pc = coords[c];
    if (!pa || !pb || !pc) return false;
    const measured = angleDeg(pa, pb, pc);
    try {
      const vals: Record<string, number> = {};
      for (const name of Object.keys(fact.form.v)) {
        vals[name] = angleVarValue(name, coords, bindings);
      }
      const expected = fevalNumeric(fact.form, vals);
      return Math.abs(measured - expected) < 1e-3;
    } catch {
      return false;
    }
  }

  const v = fact.points.map((id) => coords[id]);
  if (v.some((x) => x === undefined)) return false;

  switch (fact.name) {
    case "coll": {
      // every point lies on the line through the first two
      const base = unit(sub(v[1], v[0]));
      if (!base) return true; // first two coincide → degenerate
      for (let i = 2; i < v.length; i++) {
        const ui = unit(sub(v[i], v[0]));
        if (ui && Math.abs(cross(base, ui)) > EPS) return false;
      }
      return true;
    }
    case "para": {
      const u1 = unit(sub(v[1], v[0]));
      const u2 = unit(sub(v[3], v[2]));
      if (!u1 || !u2) return false;
      return Math.abs(cross(u1, u2)) < EPS;
    }
    case "perp": {
      const u1 = unit(sub(v[1], v[0]));
      const u2 = unit(sub(v[3], v[2]));
      if (!u1 || !u2) return false;
      return Math.abs(dot(u1, u2)) < EPS;
    }
    case "cong": {
      const l1 = norm(sub(v[1], v[0]));
      const l2 = norm(sub(v[3], v[2]));
      return Math.abs(l1 - l2) < EPS * Math.max(1, l1, l2);
    }
    case "cyclic": {
      const o = circumcenter(v[0], v[1], v[2]);
      if (!o) return false;
      const r = norm(sub(v[0], o));
      const r4 = norm(sub(v[3], o));
      return Math.abs(r - r4) < EPS * Math.max(1, r);
    }
    case "midp": {
      const mid: V = [(v[1][0] + v[2][0]) / 2, (v[1][1] + v[2][1]) / 2];
      return norm(sub(v[0], mid)) < EPS * Math.max(1, norm(sub(v[1], v[2])));
    }
    case "eqangle": {
      const a1 = angleDeg(v[0], v[1], v[2]);
      const a2 = angleDeg(v[3], v[4], v[5]);
      return Math.abs(a1 - a2) < 1e-4;
    }
  }
}
