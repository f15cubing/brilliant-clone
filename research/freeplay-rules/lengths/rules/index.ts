/**
 * Registry of research LENGTH rules — rules that may emit `eqratio` (and other
 * length) facts. Verified by tests under `../__tests__/` via `verifyL`, which
 * runs them alongside the shipped `RULES` and the angle-only `RESEARCH_RULES`.
 */
import type { LRule } from "../dsl";
import { similar_triangles_aa } from "./similar_triangles_aa";
import { thales_basic_proportionality } from "./thales_basic_proportionality";
import { sas_similarity } from "./sas_similarity";
import { power_of_a_point } from "./power_of_a_point";

export const LENGTH_RULES: LRule[] = [
  similar_triangles_aa,
  thales_basic_proportionality,
  sas_similarity,
  power_of_a_point,
];
