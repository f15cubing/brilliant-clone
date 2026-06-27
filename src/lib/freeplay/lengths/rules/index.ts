/**
 * Registry of LENGTH/RATIO rules — rules that may emit `eqratio` (and other
 * length) facts. Composed into the engine's `RULES` by `../../rules.ts` and run
 * by the verifier alongside the angle/incidence rules; ratio outputs are routed
 * to the `LengthAR` length-chase branch of `deriveOnce`.
 */
import type { LRule } from "../dsl";
import { similar_triangles_aa } from "./similar_triangles_aa";
import { aa_similar } from "./aa_similar";
import { similar_proportional_sides } from "./similar_proportional_sides";
import { similar_equal_angles } from "./similar_equal_angles";
import { thales_basic_proportionality } from "./thales_basic_proportionality";
import { sas_similarity } from "./sas_similarity";
import { power_of_a_point } from "./power_of_a_point";
import { tangent_secant_power } from "./tangent_secant_power";

export const RATIO_RULES: LRule[] = [
  similar_triangles_aa,
  aa_similar,
  similar_proportional_sides,
  similar_equal_angles,
  thales_basic_proportionality,
  sas_similarity,
  power_of_a_point,
  tangent_secant_power,
];
