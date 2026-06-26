/**
 * Pure, dependency-free mapper: lowers untrusted `FactDescriptor`s into engine
 * `Fact`s with strict CLIENT-SIDE, PRE-VERIFY validation:
 *   - every referenced point must exist in the figure (no invented points),
 *   - correct arity (`coll` is 3..MAX_COLL; everything else is exact),
 *   - angle-value expressions must `parseForm`.
 *
 * Mapping failures are surfaced as `MapError` with a machine code so the UI can
 * show a specific message WITHOUT ever calling `verify()`. Premises additionally
 * resolve against the established facts by `canonicalKey`.
 */
import { aval, canonicalKey, rel, RELS, type Fact, type RelName } from "../dsl";
import { fstr, parseForm } from "../form";
import type { FactDescriptor } from "./types";

export const MAX_COLL = 8;

export type MapErrorCode =
  | "unknown_point"
  | "bad_arity"
  | "bad_expr"
  | "unknown_relation"
  | "bad_descriptor";

export class MapError extends Error {
  constructor(
    readonly code: MapErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MapError";
  }
}

const isRelName = (name: string): name is RelName =>
  Object.prototype.hasOwnProperty.call(RELS, name);

function assertPoints(points: string[], figure: Set<string>): void {
  for (const p of points) {
    if (!figure.has(p)) {
      throw new MapError("unknown_point", `"${p}" is not a point in this figure.`);
    }
  }
}

/** Lower a single descriptor to a `Fact`, validating points/arity/expr. */
export function descriptorToFact(d: FactDescriptor, points: string[]): Fact {
  const figure = new Set(points);

  if (!d || typeof d !== "object" || !("kind" in d)) {
    throw new MapError("bad_descriptor", "The translator returned an unreadable fact.");
  }

  if (d.kind === "aval") {
    const angle = d.angle;
    if (!Array.isArray(angle) || angle.length !== 3) {
      throw new MapError("bad_arity", "An angle value needs exactly 3 points.");
    }
    assertPoints(angle, figure);
    if (typeof d.expr !== "string" || d.expr.trim().length === 0) {
      throw new MapError("bad_expr", "The angle value has no expression.");
    }
    let form;
    try {
      form = parseForm(d.expr);
    } catch (e) {
      throw new MapError(
        "bad_expr",
        `Couldn't read the expression "${d.expr}": ${(e as Error).message}`,
      );
    }
    return aval([angle[0], angle[1], angle[2]], form);
  }

  if (d.kind === "rel") {
    if (typeof d.name !== "string" || !isRelName(d.name)) {
      throw new MapError("unknown_relation", `"${String(d.name)}" is not a known relation.`);
    }
    const name = d.name;
    if (!Array.isArray(d.points)) {
      throw new MapError("bad_descriptor", "A relation needs a list of points.");
    }
    const meta = RELS[name];
    if (meta.variadic) {
      if (d.points.length < 3 || d.points.length > MAX_COLL) {
        throw new MapError(
          "bad_arity",
          `${name} takes 3 to ${MAX_COLL} points (got ${d.points.length}).`,
        );
      }
    } else if (d.points.length !== meta.arity) {
      throw new MapError(
        "bad_arity",
        `${name} takes exactly ${meta.arity} points (got ${d.points.length}).`,
      );
    }
    assertPoints(d.points, figure);
    return rel(name, d.points);
  }

  throw new MapError("bad_descriptor", "The translator returned an unknown fact kind.");
}

/**
 * Lower premise descriptors and resolve each (by `canonicalKey`) to the matching
 * established fact when present. Descriptors that don't match an established fact
 * are still returned (as their lowered `Fact`) so `verify()` can reject them with
 * the usual `unknown_premise` reason. Throws `MapError` on a malformed descriptor.
 */
export function matchPremises(
  descriptors: FactDescriptor[],
  established: Fact[],
  points: string[],
): Fact[] {
  const byKey = new Map(established.map((f) => [canonicalKey(f), f]));
  return descriptors.map((d) => {
    const fact = descriptorToFact(d, points);
    return byKey.get(canonicalKey(fact)) ?? fact;
  });
}

/**
 * Inverse of `descriptorToFact`: serialize an established `Fact` back to a
 * descriptor (used to give the translator context about what's already known).
 * Angle expressions are serialized with `fstr`; this is lossy for angle-token
 * forms but is only ever used as model context, never for verification.
 */
export function factToDescriptor(f: Fact): FactDescriptor {
  if (f.kind === "aval") {
    return { kind: "aval", angle: [...f.angle], expr: fstr(f.form) };
  }
  return { kind: "rel", name: f.name, points: [...f.points] };
}
