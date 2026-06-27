# Design Spec — Olympiad Problems via Promote-Then-Author

_Status: **IMPLEMENTED** (this plan has shipped). Originally produced by the
olympiad/rule-promotion planning agent and reviewed by the Team Lead. Companion:
[`DDAR_ENGINE.md`](../DDAR_ENGINE.md). Strategy was: promote proven research-lab
rules into the shipped engine first, then author ~6–8 graded olympiad problems —
most reusable verbatim from already-vetted `research/freeplay-rules/problems/*.ts`._

> **Update (shipped):** the Tier-A rules **and** the Tier-B/C ratio subsystem below
> have all landed. The shipped engine now has **26 angle/incidence rules** (13
> `CORE_RULES` in `rules.ts` + 13 `PROMOTED_RULES` in `rules/`) + **5 `RATIO_RULES`**
> (`lengths/rules/`) = **31 total**, `eqratio` is a first-class fact, and **14
> puzzles** ship (incl. IMO 2019 P2 end-to-end). The sections below are preserved as
> the original promotion plan; treat their "current state" claims as the
> pre-implementation baseline.

## Orientation (pre-implementation baseline — now superseded)

_At plan time:_ Shipped DSL = `coll/para/perp/cong/cyclic/midp/eqangle` + `aval`;
**no `eqratio`**, no length table; `RULES` held 13 rules inline in `rules.ts`.
_Now:_ `eqratio`/`LengthAR` have shipped, the core was refactored to
`RULES = [...CORE_RULES, ...PROMOTED_RULES]`, and all the rules below are promoted.
Research rules import only from `@/lib/freeplay/*`, so angle/incidence rules ported
into `src/` with essentially no edits beyond moving + registering them.

## Tier A — easy wins (produce `cong`/`eqangle`/`coll`/`cyclic`; NO DSL change)

Copy file → `src/lib/freeplay/rules/<id>.ts`, import + append to `RULES`, port tests.
Each is already coordinate-guarded + numerically gated.

| # | Rule | Produces | Tests | Notes |
|---|------|----------|-------|-------|
| A1 | `midpoint_congruence` | `cong` | 4 | trivial, zero deps |
| A2 | `cong_transitivity` | `cong` | 7 | unblocks circumcenter (P2) |
| A3 | `perp_bisector` | `cong` | 7 | consumes midp+perp |
| A4 | `isosceles_converse` | `eqangle` | 6 | converse of shipped `isosceles` |
| A5 | `sas_congruence` | `cong` (+eqangle×2) | 9 | distinct-vertex SAS |
| A6 | `sas_shared_vertex` | `cong` | 9 | shared-apex (rotation/spiral) |
| A7 | `sss_congruence` | `eqangle`×3 | 8 | 6-distinct-vertex SSS |
| A8 | `shared_side_congruence` | `eqangle`×3 | 7 | 4-point kite SSS |
| A9 | `concyclic_equal_radii` | `cyclic` | 8 | cong-star ⇒ circle; closes IMO 2018 P1 |
| A10 | `pascal` | `coll` (+para at ∞) | 9 | projective; watch perm-search perf |
| A11 | `coincident_direction_collinear` | `coll` | 8 | **ALREADY AUTHORED + merged** (Simson bridge); ready to promote |

> A11 was the lab's open Gap #8; it is now written, reviewed, and merged into the
> research lab (closes the Simson line). Promoting it = same mechanics as A1–A10.

## Tier B — ratio subsystem (produce `eqratio`; needs a DSL/AR extension FIRST)

Blocked on **B0** (the big task): port the lab's `lengths/` foundation into `src/` —
add `eqratio` to the DSL (extend `Fact`/`canonicalKey`/`factEqual`/`isAmong`/`factLabel`,
*or* mirror the lab's parallel-function approach inside `verify.ts`), port `LengthAR`
(log-distance Gaussian table), wire a length-chase branch into `deriveOnce`, and add the
ratio numeric gate. Scope limit (keep): no numeric-constant ratios (`AB = 2·MA`),
internal cuts only.

| Rule | Produces | Tests |
|------|----------|-------|
| `similar_triangles_aa` | `eqratio`×3 | 7 |
| `thales_basic_proportionality` | `eqratio`×2 | 6 |
| `sas_similarity` | `eqratio`+eqangle×2 | 9 |
| `power_of_a_point` | `eqratio`×2 | 10 |

## Tier C — MANDATORY before any ratio work

The shipped `canonicalKey` (`dsl.ts:112`) **throws** on an `eqratio`-shaped fact (no
`.angle`, falls into the `aval` branch) → crashes the verifier via `isAmong`
(`verify.ts:121`). Add an explicit `eqratio` branch to `canonicalKey`/`isAmong` BEFORE
Tier B. (Also flagged in `SECURITY_AUDIT.md` adjacent context.)

## Problem slate (graded easy → hard; mostly verbatim reuse)

| # | Diff. | Source | Goal | Rules | Reuse |
|---|-------|--------|------|-------|-------|
| P1 | intro | Kite (classical) | ∠ABC=∠ADC | A4 + AR | `kite_equal_angles.ts` ✅ |
| P2 | core | Circumcenter equidistant | OB=OC | A3 + A2 | `circumcenter_equidistant.ts` ✅ (final step now closes with A2) |
| P3 | core | Isosceles median bisects apex | ∠BAM=∠CAM | A1 + A8 | `shared_side_congruence_problem.ts` ✅ |
| P4 | core | Isosceles-trapezoid diagonals | BD=AC | A5 | `isosceles_trapezoid_diagonals.ts` ✅ |
| P5 | core/chal | Equilaterals on two sides (Pompeiu/Fermat) | CD=BE | A6 + AR | `equilateral_on_two_sides.ts` ✅ |
| P6 | chal | **IMO 2018 P1** | DE∥FG | A4 + A9 + AR | `imo_2018_p1.ts` ✅ (real contest #) |
| P7 | chal | Pascal hexagon | X,Y,Z collinear | A10 | `pascal_hexagon.ts` ✅ |
| P8 | chal | Simson–Wallace line | D,E,F collinear | AR + `converse_inscribed` + A11 | `simson_line.ts` ✅ (now closes via A11) |

**Second wave (Tier-B-gated, ratio):** power-of-a-point, Angle Bisector Theorem
(Euclid VI.3), Thales intercept, SAS-similarity — all vetted in the lab.

**Honesty note:** P6 is a genuine contest problem (IMO 2018 P1). P1–P5, P7, P8 are
classical *named lemmas/theorems* (kite, circumcenter, isosceles median, trapezoid
diagonals, Pompeiu/Fermat rotation, Pascal, Simson) — legitimate olympiad building
blocks but not "year/competition/number" citations. Present them as named theorems.

## Shipped puzzle format + registration

A `Puzzle` (`types.ts:16-41`): `id`, `title`, `blurb`, `difficulty`
(`intro|core|challenge`), `coords` (faithful non-degenerate), optional `variables`,
`figure[]`, `given[]`, `goal`, optional `equivalentGoals[]`, `solution[]` (each step's
`rule` must equal the name `verify()` returns), `solutionReachesGoal`. Register by
importing into `puzzles/index.ts` `FREEPLAY_PUZZLES`; `FreeplayList.tsx` renders
automatically. Converting a `ResearchProblem`→`Puzzle`: rename `steps`→`solution`, add a
`rule` string per step, add `title`/`blurb`/`difficulty`/`figure`, verify via an engine
test. Ratio puzzles also need `factLabel` extended to render `eqratio`.

## Dependency order / parallelization

- **Wave 1 (parallel):** A1–A11 — one rule per agent. Only shared file is the `RULES`
  array; use a `rules/` folder + a single integrator (or serialize the registry edit) to
  avoid merge conflicts.
- **Wave 2 (parallel):** P1–P8 puzzles, each depends only on its Wave-1 rules. (P2 needs
  A2; P6 needs A9; P8 needs A11.)
- **Separate independent track:** C + B0 (can start immediately, parallel to everything),
  then ratio rules, then ratio problems.

## Risks

Soundness regressions (port every soundness-negative test); the Tier C `canonicalKey`
throw (mandatory pre-Tier-B); coordinate degeneracy (use generic coords, re-check every
fact with `factHolds`); keeping shipped tests green (new rules can change the *reported
rule name* or flip a minimality case — puzzle tests assert exact rule names; re-run
`vitest run src` after each promotion); `pascal` permutation-search perf; ratio-subsystem
scope creep (prefer the additive parallel-function approach; keep the out-of-scope limits).
