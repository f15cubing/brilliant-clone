/**
 * Registry of research (candidate) rules — NOT wired into the shipped engine.
 *
 * Each rule lives in its own file and is verified by tests under `__tests__/`
 * via the research harness (`../harness/verify`), which runs them alongside the
 * real shipped `RULES`. Promote a rule by copying it into
 * `src/lib/freeplay/rules.ts` and appending it to that file's `RULES` array.
 */
import type { Rule } from "@/lib/freeplay/rules";
import { reim } from "./reim";
import { midpoint_congruence } from "./midpoint_congruence";
import { perp_bisector } from "./perp_bisector";
import { sas_congruence } from "./sas_congruence";
import { pascal } from "./pascal";
import { cong_transitivity } from "./cong_transitivity";
import { sas_shared_vertex } from "./sas_shared_vertex";
import { isosceles_converse } from "./isosceles_converse";
import { sss_congruence } from "./sss_congruence";
import { shared_side_congruence } from "./shared_side_congruence";
import { concyclic_equal_radii } from "./concyclic_equal_radii";
import { concyclic_from_directed_angles } from "./concyclic_directed_angles";

export const RESEARCH_RULES: Rule[] = [
  // reim is subsumed by AR (kept as a harness example), so it is intentionally
  // omitted from the promotable set below.
  // -- Batch 1 --
  midpoint_congruence,
  perp_bisector,
  sas_congruence,
  pascal,
  // -- Batch 2 (close gaps surfaced by play-tests) --
  cong_transitivity,
  sas_shared_vertex,
  isosceles_converse,
  sss_congruence,
  shared_side_congruence,
  // -- Batch 7 (circle-producing dual of perp_bisector) --
  concyclic_equal_radii,
  // -- Batch 8 (directed converse of the inscribed-angle theorem) --
  concyclic_from_directed_angles,
];

/** Everything, including the subsumed/example rules, for harness completeness. */
export const ALL_RESEARCH_RULES: Rule[] = [reim, ...RESEARCH_RULES];
