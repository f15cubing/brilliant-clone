# Contest geometry problems for the DDAR engine

Six new problems authored under `research/freeplay-rules/problems/**`, each with a
`ResearchProblem`/`LResearchProblem` definition and a replay test. Every problem
is verified END-TO-END through the research harness (`researchVerify` /
`researchVerifyL`): all givens are numerically true in the coordinates, every
proof step is accepted with its expected rule, the cited premises are minimal
(load-bearing), and the goal is reached. We deliberately did NOT duplicate the
shipped examples (IMO 2018 P1, Simson line).

Full research suite: **`npx vitest run research/freeplay-rules` → 35 files, 274
tests, all green** (existing + the new replay tests).

## Problems authored

| id | citation | difficulty | goal fact | rules used | verified |
|----|----------|-----------|-----------|-----------|----------|
| `arc_midpoint_lemma` | Classical — arc-midpoint / incenter (trillium) lemma | easy | `cong(M,B,M,C)` (MB = MC) | algebraic angle-chase; isosceles (base angles ⇒ sides) | yes |
| `jbmo_shortlist_2004_g1` | JBMO Shortlist 2004 G1 | medium | `eqangle(M,B,Q, N,B,P)` (∠MBQ = ∠NBP) | isosceles (sides ⇒ base angles) ×2; algebraic angle-chase | yes |
| `jbmo_shortlist_2015_g1` | JBMO Shortlist 2015 G1 (Montenegro) | medium | `cyclic(A,B,D,E)` | algebraic angle-chase (tangent-chord); converse of inscribed angle | yes |
| `squares_on_two_sides` | Classical — squares on two sides of a triangle (Coxeter & Greitzer) | medium | `cong(B,G,C,E)` (BG = CE) | algebraic angle-chase; SAS about a common vertex | yes |
| `jbmo_shortlist_2010_g3_pop` | (reduced from) JBMO Shortlist 2010 G3 | medium | `eqratio(A,D,A,E,A,C,A,B)` (AD·AB = AE·AC) | power of a point (length subsystem) | yes |
| `imo_shortlist_2010_g1` | IMO Shortlist 2010 G1 (United Kingdom) | hard | `cong(A,P,A,Q)` (AP = AQ) | algebraic angle-chase ×4; converse of inscribed angle; isosceles | yes |

Citations: four are literal contest problems (the two IMO/JBMO shortlist angle
problems plus the 2004 and 2015 JBMO shortlist problems); one is a literal
shortlist problem reduced to its provable length core (per the "(reduced from) …"
convention — the full G3 ends in `O1O2 = R`, a metric statement about circle
centers that the length subsystem cannot express); two are standard, named
classical configurations that exercise rule families not otherwise covered by a
literal problem (the spiral SAS congruence and the easy inscribed-angle/isosceles
kernel).

### Rule coverage of the new set

- **Directed-angle / AR**: every problem (the tangent-chord chase in 2015 G1 is a
  good stress test — the engine recovers the tangent–chord = inscribed angle from
  the equal radii + `perp(O,C,C,T)` alone).
- **Isosceles** both directions: `arc_midpoint_lemma`, `imo_shortlist_2010_g1`
  (sides ⇐ base angles); `jbmo_shortlist_2004_g1` (base angles ⇐ sides).
- **Converse of inscribed angle**: `jbmo_shortlist_2015_g1`, `imo_shortlist_2010_g1`.
- **SAS about a common vertex** (spiral congruence): `squares_on_two_sides`.
- **Power of a point** (length subsystem `eqratio`): `jbmo_shortlist_2010_g3_pop`
  (the EXTERNAL-point / two-secant configuration, complementing the shipped
  intersecting-chords example).

## What works cleanly vs. what the engine cannot reach

The engine is essentially complete for **directed-angle conclusions** and closes
quickly when the goal is an equal-angle, a concyclicity whose converse-inscribed
feeder is itself a directed-angle consequence on the four target points, an equal
length via isosceles/SAS, or a power-of-a-point ratio. The decisive practical
test was forward-chaining the givens with `researchDeriveAll` (or a 1–2 step
`researchVerify`) and confirming the goal actually appears.

Problems whose crux is **projective/metric machinery outside the rule set** —
pole–polar / tangent-from-a-point incidence, radical axes, or the incidence of a
point defined as the meet of two lines — do not close, and we did not force them.

## Rejected / not pursued (and why)

| candidate | reason |
|-----------|--------|
| USAMO 2008 P2 | All known solutions need a radical center / symmedian / inversion; the "angle-chasing solution" still finishes via "Q is the radical center of three circles". No directed-angle path the rule set can package. |
| JBMO SL 2005 G1 (ANDE cyclic, isosceles trapezoid + reflection) | Forward-chaining the natural givens never produces `cyclic(A,N,D,E)`; the concyclicity does not reduce to an AR-derivable converse-inscribed feeder. |
| JBMO SL 2011 G2 (∠CGH = 90°, orthocenter + parallel) | True, but the key `cyclic(C,D,G,H)` (G defined by a parallel) is not AR-reachable; forward chaining reaches a fixpoint of 88 facts without the goal. |
| JBMO SL 2013 G1 (M,O,N,P concyclic, tangents) | Needs `∠OMP = 90°` for the point M on `OC`, which is a pole/polar (power) fact, not derivable from the perp-to-radius encodings. |
| JBMO SL 2009 G1 (∠ZCA = 90°) | Z is the meet of `BD` and `GL`; the conclusion is that Z lies on the tangent at C — a pole–polar incidence the rule set cannot reach (fixpoint without the goal). |
| JBMO SL 2015 G2 / 2005 G2 (AD ∥ BP / AP ∥ CS) | Both turn on a tangent-length power relation (`MA² = MB·MR`) with a midpoint; the length subsystem has no tangent-segment / numeric-constant facility. |
| JBMO SL 2011 G1 (A,E,D,Z concyclic) | The realization is genuinely concyclic, but the missing link `∠EDZ = 90°` reduces (via the reflection over the perpendicular bisector) to `∠EBZ = 90°`, which is not given and is itself equivalent to the result — no independent AR derivation. |

## Notes for puzzle conversion

- Each problem file documents the human-readable proof and the exact engine
  mapping (fact / rule / cited premises) step by step in its header comment.
- Coordinates are faithful, generic (scalene) realizations built by construction,
  re-checked numerically in the tests, so a degenerate realization cannot make a
  wrong step look valid. The tests additionally spot-check scalene/acute/between-
  ness and minimality, and the length problem includes soundness checks (a false
  ratio and a non-concyclic figure are both rejected).
