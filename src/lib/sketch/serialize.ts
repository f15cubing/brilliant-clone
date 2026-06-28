/**
 * Serialize / validate a `Construction` for JSON export-import (and, in phase 2,
 * Firestore round-tripping).
 *
 * Validation enforces the model's core invariant: steps are a topologically
 * ordered DAG, so every id reference must point to an EARLIER step. That single
 * check rejects unknown refs, forward refs, and cycles — so a malformed or
 * corrupt sketch never reaches `compile`/the board.
 */
import type { Construction, SketchStep, StepArg, StepKind } from "./types";

const STEP_KINDS: readonly StepKind[] = [
  "point",
  "glider",
  "segment",
  "line",
  "circle",
  "intersection",
  "midpoint",
  "perpendicular",
  "parallel",
  "polygon",
];

function isStepKind(v: unknown): v is StepKind {
  return typeof v === "string" && (STEP_KINDS as readonly string[]).includes(v);
}

function validArg(a: unknown): a is StepArg {
  if (typeof a === "string" || typeof a === "number") return true;
  return (
    typeof a === "object" &&
    a !== null &&
    typeof (a as { x: unknown }).x === "number" &&
    typeof (a as { y: unknown }).y === "number"
  );
}

/** Validate a raw steps array; throws on the first structural problem. */
export function validateSteps(raw: unknown): SketchStep[] {
  if (!Array.isArray(raw)) throw new Error("sketch: `steps` must be an array");
  const seen = new Set<string>();
  const out: SketchStep[] = [];
  for (const r of raw) {
    const s = r as Partial<SketchStep>;
    if (typeof s.id !== "string" || !isStepKind(s.kind) || !Array.isArray(s.args)) {
      throw new Error("sketch: malformed step");
    }
    if (seen.has(s.id)) throw new Error(`sketch: duplicate step id ${s.id}`);
    for (const a of s.args) {
      if (!validArg(a)) throw new Error(`sketch: step ${s.id} has a malformed arg`);
      // A reference must resolve to an EARLIER step (DAG / no cycles / no forward refs).
      if (typeof a === "string" && !seen.has(a)) {
        throw new Error(`sketch: step ${s.id} references unknown or forward id ${a}`);
      }
    }
    seen.add(s.id);
    out.push({ id: s.id, kind: s.kind, args: s.args, label: s.label, style: s.style });
  }
  return out;
}

/** Parse + validate a JSON string into a `Construction` (a fresh `updatedAt`). */
export function parseConstruction(json: string): Construction {
  const obj = JSON.parse(json) as Partial<Construction>;
  const now = Date.now();
  return {
    id: typeof obj.id === "string" ? obj.id : freshId(),
    title: typeof obj.title === "string" && obj.title.trim() ? obj.title : "Untitled sketch",
    steps: validateSteps(obj.steps),
    boundingBox: obj.boundingBox,
    createdAt: typeof obj.createdAt === "number" ? obj.createdAt : now,
    updatedAt: now,
    ownerUid: obj.ownerUid,
  };
}

/** Pretty-printed JSON for download/export. */
export function serializeConstruction(c: Construction): string {
  return JSON.stringify(c, null, 2);
}

/** A unique id for a construction (crypto UUID when available, else a fallback). */
export function freshId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  return c?.randomUUID ? c.randomUUID() : `sketch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
