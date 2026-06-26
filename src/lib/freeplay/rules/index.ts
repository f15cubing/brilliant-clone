/**
 * Registry of rules promoted from the research lab (`research/freeplay-rules/`)
 * into the shipped engine.
 *
 * HOW TO PROMOTE A RULE (no other shipped file needs editing):
 *   1. Add `src/lib/freeplay/rules/<id>.ts` exporting a `Rule` (copy the vetted
 *      research file; its `@/lib/freeplay/*` imports already resolve here).
 *   2. Import it below and append it to `PROMOTED_RULES`.
 *   3. Port the research test into `src/lib/freeplay/__tests__/<id>.test.ts`.
 *
 * `rules.ts` composes `RULES = [...CORE_RULES, ...PROMOTED_RULES]`, so adding a
 * rule here automatically makes the verifier aware of it.
 */
import type { Rule } from "../rules";

export const PROMOTED_RULES: Rule[] = [];
