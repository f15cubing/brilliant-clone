/**
 * Strict input validation for the untrusted request payload AND a shape re-check
 * of the model's output. Pure (no firebase/openai imports) so it can be unit
 * tested without installing deps. The client mapper + `verify()` remain the real
 * gates; this just caps cost/abuse and rejects obviously malformed data early.
 */
import {
  REL_NAMES,
  type FactDescriptor,
  type RelName,
  type TranslateRequest,
  type TranslationResult,
} from "./types";

export const LIMITS = {
  text: 280,
  puzzleId: 64,
  maxPoints: 32,
  maxVariables: 32,
  maxEstablished: 256,
  pointLabel: /^[A-Za-z][A-Za-z0-9]?$/,
} as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const isString = (x: unknown): x is string => typeof x === "string";
const isRelName = (x: unknown): x is RelName =>
  isString(x) && (REL_NAMES as string[]).includes(x);

function validateDescriptor(d: unknown, points: Set<string>, where: string): FactDescriptor {
  if (!d || typeof d !== "object") {
    throw new ValidationError(`${where} is not an object.`);
  }
  const obj = d as Record<string, unknown>;
  if (obj.kind === "rel") {
    if (!isRelName(obj.name)) throw new ValidationError(`${where} has an invalid relation name.`);
    if (!Array.isArray(obj.points) || obj.points.length < 3 || obj.points.length > 8) {
      throw new ValidationError(`${where} has an invalid point count.`);
    }
    for (const p of obj.points) {
      if (!isString(p) || !points.has(p)) {
        throw new ValidationError(`${where} references an unknown point.`);
      }
    }
    return { kind: "rel", name: obj.name, points: obj.points as string[] };
  }
  if (obj.kind === "aval") {
    if (!Array.isArray(obj.angle) || obj.angle.length !== 3) {
      throw new ValidationError(`${where} has an invalid angle.`);
    }
    for (const p of obj.angle) {
      if (!isString(p) || !points.has(p)) {
        throw new ValidationError(`${where} references an unknown point.`);
      }
    }
    if (!isString(obj.expr) || obj.expr.length === 0 || obj.expr.length > LIMITS.text) {
      throw new ValidationError(`${where} has an invalid expression.`);
    }
    const angle = obj.angle as string[];
    return { kind: "aval", angle: [angle[0], angle[1], angle[2]], expr: obj.expr };
  }
  throw new ValidationError(`${where} has an unknown kind.`);
}

/** Validate + normalize the inbound request. Throws `ValidationError`. */
export function validateRequest(data: unknown): TranslateRequest {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Request body must be an object.");
  }
  const obj = data as Record<string, unknown>;

  if (!isString(obj.text) || obj.text.trim().length === 0) {
    throw new ValidationError("`text` is required.");
  }
  if (obj.text.length > LIMITS.text) {
    throw new ValidationError(`\`text\` exceeds ${LIMITS.text} characters.`);
  }
  if (!isString(obj.puzzleId) || obj.puzzleId.length === 0 || obj.puzzleId.length > LIMITS.puzzleId) {
    throw new ValidationError("`puzzleId` is required and must be ≤64 chars.");
  }
  if (
    !Array.isArray(obj.points) ||
    obj.points.length < 1 ||
    obj.points.length > LIMITS.maxPoints
  ) {
    throw new ValidationError(`\`points\` must have 1..${LIMITS.maxPoints} entries.`);
  }
  for (const p of obj.points) {
    if (!isString(p) || !LIMITS.pointLabel.test(p)) {
      throw new ValidationError(`Invalid point label: ${String(p)}`);
    }
  }
  const variables = Array.isArray(obj.variables) ? obj.variables : [];
  if (variables.length > LIMITS.maxVariables) {
    throw new ValidationError("Too many variables.");
  }
  for (const v of variables) {
    if (!isString(v)) throw new ValidationError("Variable names must be strings.");
  }
  const established = Array.isArray(obj.established) ? obj.established : [];
  if (established.length > LIMITS.maxEstablished) {
    throw new ValidationError("Too many established facts.");
  }

  const pointSet = new Set(obj.points as string[]);
  // Established facts are context only; tolerate (drop) ones that don't validate
  // rather than failing the whole request.
  const establishedClean: FactDescriptor[] = [];
  for (let i = 0; i < established.length; i++) {
    try {
      establishedClean.push(validateDescriptor(established[i], pointSet, `established[${i}]`));
    } catch {
      /* skip malformed context */
    }
  }

  return {
    text: obj.text,
    puzzleId: obj.puzzleId,
    points: obj.points as string[],
    variables: variables as string[],
    established: establishedClean,
  };
}

/** Re-validate the model's output shape against the figure. Throws on bad shape. */
export function validateResultShape(data: unknown, points: string[]): TranslationResult {
  if (!data || typeof data !== "object") {
    throw new ValidationError("Model output is not an object.");
  }
  const obj = data as Record<string, unknown>;
  const pointSet = new Set(points);
  const conclusion = validateDescriptor(obj.conclusion, pointSet, "conclusion");
  const premisesRaw = Array.isArray(obj.premises) ? obj.premises : [];
  if (premisesRaw.length > 32) throw new ValidationError("Too many premises.");
  const premises = premisesRaw.map((p, i) =>
    validateDescriptor(p, pointSet, `premises[${i}]`),
  );
  const result: TranslationResult = { conclusion, premises };
  if (isString(obj.ruleHint)) result.ruleHint = obj.ruleHint.slice(0, 120);
  if (isString(obj.notes)) result.notes = obj.notes.slice(0, 500);
  return result;
}
