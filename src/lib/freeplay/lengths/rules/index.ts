/**
 * Registry of LENGTH/RATIO rules — rules that may emit `eqratio` (and other
 * length) facts. Composed into the engine's `RULES` by `../../rules.ts` and run
 * by the verifier alongside the angle/incidence rules; ratio outputs are routed
 * to the `LengthAR` length-chase branch of `deriveOnce`.
 */
import type { LRule } from "../dsl";
import { similar_triangles_aa } from "./similar_triangles_aa";
import { thales_basic_proportionality } from "./thales_basic_proportionality";
import { sas_similarity } from "./sas_similarity";
import { power_of_a_point } from "./power_of_a_point";

export const RATIO_RULES: LRule[] = [
  similar_triangles_aa,
  thales_basic_proportionality,
  sas_similarity,
  power_of_a_point,
];
