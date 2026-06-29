import type { Puzzle } from "@/lib/freeplay/types";
import { inscribedAngle } from "./inscribedAngle";
import { midsegment } from "./midsegment";
import { incenterExcenter } from "./incenterExcenter";
import { imo2019p2 } from "./imo2019p2";
// Wave 2 — contest + classical problems promoted from the research lab. Each is
// re-verified end-to-end against the SHIPPED engine in its own test.
import { arcMidpointLemma } from "./arc_midpoint_lemma";
import { alternateAngles } from "./alternate_angles";
import { kiteEqualAngles } from "./kite_equal_angles";
import { jbmoShortlist2004G1 } from "./jbmo_shortlist_2004_g1";
import { jbmo_shortlist_2015_g1 } from "./jbmo_shortlist_2015_g1";
import { squares_on_two_sides } from "./squares_on_two_sides";
import { shared_side_congruence_problem } from "./shared_side_congruence_problem";
import { imo_shortlist_2010_g1 } from "./imo_shortlist_2010_g1";
// Wave 2 — length/ratio (eqratio) problems, now playable via the StepBuilder's
// ratio input.
import { sas_similarity_problem } from "./sas_similarity_problem";
import { jbmo_shortlist_2005_g2 } from "./jbmo_shortlist_2005_g2";
import { jbmo_shortlist_2010_g3_pop } from "./jbmo_shortlist_2010_g3_pop";
// Wave 3 — IMO 2024 Shortlist G1–G5 (faithful encodings). G2 is a complete
// machine-verified proof; G1, G3, G4, G5 ship the longest engine-verifiable
// chain with `solutionReachesGoal: false` and a documented engine gap.
import { imo_shortlist_2024_g1 } from "./imo_shortlist_2024_g1";
import { imo_shortlist_2024_g2 } from "./imo_shortlist_2024_g2";
import { imo_shortlist_2024_g3 } from "./imo_shortlist_2024_g3";
import { imo_shortlist_2024_g4 } from "./imo_shortlist_2024_g4";
import { imo_shortlist_2024_g5 } from "./imo_shortlist_2024_g5";

/** Ordered registry of curated freeplay puzzles (intro → core → challenge). */
export const FREEPLAY_PUZZLES: Puzzle[] = [
  // intro
  inscribedAngle,
  alternateAngles,
  arcMidpointLemma,
  kiteEqualAngles,
  // core
  midsegment,
  jbmoShortlist2004G1,
  jbmo_shortlist_2015_g1,
  squares_on_two_sides,
  shared_side_congruence_problem,
  sas_similarity_problem,
  jbmo_shortlist_2005_g2,
  // challenge
  incenterExcenter,
  imo_shortlist_2010_g1,
  jbmo_shortlist_2010_g3_pop,
  imo2019p2,
  // challenge — IMO 2024 Shortlist
  imo_shortlist_2024_g1,
  imo_shortlist_2024_g2,
  imo_shortlist_2024_g3,
  imo_shortlist_2024_g4,
  imo_shortlist_2024_g5,
];

export function getPuzzle(id: string): Puzzle | undefined {
  return FREEPLAY_PUZZLES.find((p) => p.id === id);
}
