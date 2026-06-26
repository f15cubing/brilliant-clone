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

// -- Tier A (promoted from research/freeplay-rules; produce cong/eqangle/coll/cyclic) --
import { midpoint_congruence } from "./midpoint_congruence";
import { cong_transitivity } from "./cong_transitivity";
import { perp_bisector } from "./perp_bisector";
import { isosceles_converse } from "./isosceles_converse";
import { sas_congruence } from "./sas_congruence";
import { sas_shared_vertex } from "./sas_shared_vertex";
import { sss_congruence } from "./sss_congruence";
import { shared_side_congruence } from "./shared_side_congruence";
import { concyclic_equal_radii } from "./concyclic_equal_radii";
import { pascal } from "./pascal";
import { coincident_direction_collinear } from "./coincident_direction_collinear";
import { concyclic_from_directed_angles } from "./concyclic_directed_angles";

export const PROMOTED_RULES: Rule[] = [
  midpoint_congruence,
  cong_transitivity,
  perp_bisector,
  isosceles_converse,
  sas_congruence,
  sas_shared_vertex,
  sss_congruence,
  shared_side_congruence,
  concyclic_equal_radii,
  pascal,
  coincident_direction_collinear,
  concyclic_from_directed_angles,
];
