/**
 * Convenience entry point for research tests.
 *
 * `researchVerify` runs the production `RULES` PLUS every candidate rule in
 * `RESEARCH_RULES`, so a step that needs a new rule can be checked end-to-end
 * exactly as the live verifier would once the rule is promoted.
 */
import { RESEARCH_RULES } from "../rules";
import {
  RULES,
  verifyWith,
  deriveAllWith,
  type VerifyInput,
  type VerifyResult,
} from "./verify";
import type { Coords, VarBindings } from "@/lib/freeplay/check";
import type { Fact } from "@/lib/freeplay/dsl";

export const ALL_RULES = [...RULES, ...RESEARCH_RULES];

export function researchVerify(input: VerifyInput): VerifyResult {
  return verifyWith(ALL_RULES, input);
}

export function researchDeriveAll(
  facts: Fact[],
  coords: Coords,
  bindings: VarBindings = {},
) {
  return deriveAllWith(ALL_RULES, facts, coords, bindings);
}

export { verifyWith, deriveAllWith, RULES, RESEARCH_RULES };
export type { VerifyInput, VerifyResult };
