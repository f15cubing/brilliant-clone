/**
 * Contract types for natural-language step input.
 *
 * The AI (mock or Firebase-backed) is UNTRUSTED. It only ever produces
 * `FactDescriptor`s — strings, never engine `Form`/`Fact` objects — which the
 * pure mapper in `map.ts` lowers + validates before the *existing* `verify()`
 * decides truth. Angle values are a degree-expression string lowered through
 * `parseForm` (so `180 - A/2 - B/2`, `angle(B,I,A)`, etc. all work).
 */
import type { RelName } from "../dsl";

export type FactDescriptor =
  | { kind: "rel"; name: RelName; points: string[] }
  | { kind: "aval"; angle: [string, string, string]; expr: string };

export interface TranslationResult {
  premises: FactDescriptor[];
  conclusion: FactDescriptor;
  /** Cosmetic only — `verify()` auto-discovers the real rule. */
  ruleHint?: string;
  notes?: string;
}

export interface TranslateRequest {
  text: string;
  puzzleId: string;
  /** The figure's point labels (the only points the AI may reference). */
  points: string[];
  /** Named angle variables in scope (e.g. "A", "B"). */
  variables: string[];
  /** Already-established facts, as descriptors, for context. */
  established: FactDescriptor[];
}

export interface Translator {
  readonly id: "mock" | "firebase";
  translate(req: TranslateRequest): Promise<TranslationResult>;
}
