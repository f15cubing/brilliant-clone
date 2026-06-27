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
import { aval, canonicalKey, rel, RELS, type RelName } from "../dsl";
import { formToExpr, parseForm } from "../form";
import { eqratio, type LFact } from "../lengths/dsl";
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

/** Lower a single descriptor to an `LFact`, validating points/arity/expr. */
export function descriptorToFact(d: FactDescriptor, points: string[]): LFact {
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
      // Pass `points` so a LaTeX-angle fallback (`\angle A2B2C`) can split
      // multi-character labels correctly instead of into single characters.
      form = parseForm(d.expr, points);
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

  if (d.kind === "eqratio") {
    if (!Array.isArray(d.points)) {
      throw new MapError("bad_descriptor", "A ratio needs a list of points.");
    }
    if (d.points.length !== 8) {
      throw new MapError("bad_arity", "A ratio needs exactly 8 points (AB/CD = EF/GH).");
    }
    assertPoints(d.points, figure);
    const p = d.points;
    return eqratio(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]);
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
  established: LFact[],
  points: string[],
): LFact[] {
  const byKey = new Map(established.map((f) => [canonicalKey(f), f]));
  return descriptors.map((d) => {
    const fact = descriptorToFact(d, points);
    return byKey.get(canonicalKey(fact)) ?? fact;
  });
}

// --- Premise grounding ------------------------------------------------------
//
// The AI translator is prone to PADDING a step with premises the learner never
// wrote (pulled from the established-facts context), which then trips verify()'s
// minimality check (`extraneous_premises`). To keep that check honest WITHOUT
// blaming the learner for the AI's additions, every premise descriptor may carry
// a `source`: the span of the learner's sentence that states it. `groundPremises`
// drops any premise whose `source` is not actually present in the sentence, so
// AI-invented premises are removed BEFORE verify() — while premises the learner
// really wrote survive and stay subject to the minimality check.

/** A 1–2 char "source" is too weak to count as a genuine quote. */
const GROUND_MIN_LEN = 3;
/** Above this normalized sentence length, apply the near-whole-echo guard. */
const ECHO_MIN_HAYSTACK = 16;
/** A source covering this fraction of a long sentence is the "echo" bypass. */
const ECHO_FRACTION = 0.9;

/** Fold case and strip everything but [a-z0-9] so punctuation/spacing/glyphs
 * (·, =, /, …) never defeat a substring match. */
function normalizeForGrounding(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Is `source` a faithful quote from the (already-normalized) sentence? */
function isGrounded(source: string | undefined, haystack: string): boolean {
  if (typeof source !== "string" || haystack.length === 0) return false;
  const needle = normalizeForGrounding(source);
  if (needle.length < GROUND_MIN_LEN) return false;
  if (!haystack.includes(needle)) return false;
  // Anti-abuse: a `source` that IS (or nearly is) the whole sentence isn't a
  // pointer to a specific premise — it's the trivial "echo the sentence" bypass.
  if (needle === haystack) return false;
  if (haystack.length >= ECHO_MIN_HAYSTACK && needle.length >= haystack.length * ECHO_FRACTION) {
    return false;
  }
  return true;
}

/**
 * Drop premises the learner did not actually write. A premise is KEPT only when
 * its `source` is a verbatim (normalization-tolerant) substring of `text`.
 * Returns the kept descriptors plus how many were dropped (for a UI note).
 * This runs on descriptors, BEFORE lowering/verify, so it's backend-agnostic
 * (both the OpenAI and mock translators emit `source`).
 */
export function groundPremises(
  premises: FactDescriptor[],
  text: string,
): { kept: FactDescriptor[]; dropped: number } {
  const haystack = normalizeForGrounding(text);
  const kept = premises.filter((p) => isGrounded(p.source, haystack));
  return { kept, dropped: premises.length - kept.length };
}

/**
 * Inverse of `descriptorToFact`: serialize an established `Fact` back to a
 * descriptor (used to give the translator context about what's already known).
 * Angle expressions use `formToExpr` (the SAME `angle(A,B,C)` syntax `parseForm`
 * accepts and the prompt asks for) — NOT `fstr`'s `\angle ABC` LaTeX — so the
 * context the model mirrors round-trips cleanly back through `descriptorToFact`.
 */
export function factToDescriptor(f: LFact): FactDescriptor {
  if (f.kind === "aval") {
    return { kind: "aval", angle: [...f.angle], expr: formToExpr(f.form) };
  }
  if (f.kind === "eqratio") {
    // Lossless: there's no `Form` to stringify, unlike the `aval` branch.
    return { kind: "eqratio", points: [...f.points] };
  }
  return { kind: "rel", name: f.name, points: [...f.points] };
}
