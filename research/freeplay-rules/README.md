# Freeplay rule-discovery research

Isolated R&D for **new deduction rules** for the freeplay geometry DDAR engine
(`src/lib/freeplay/`). Nothing here is wired into the website — this folder is
outside `tsconfig.json`'s `include`, so it is never bundled or deployed. Rules
are prototyped + tested here, then (separately, if desired) promoted into
`src/lib/freeplay/rules.ts`.

See [`CONTEXT.md`](./CONTEXT.md) for the full engine brief and conventions.

## Layout

```
research/freeplay-rules/
├─ CONTEXT.md            engine brief for contributors / subagents
├─ harness/
│  ├─ verify.ts          verifyWith(rules, input) — parametrized clone of the
│  │                     production verifier (DD + AR + minimality + symmetry)
│  └─ index.ts           researchVerify() = RULES + RESEARCH_RULES
├─ rules/
│  ├─ <id>.ts            one candidate angle/incidence Rule per file
│  ├─ index.ts           RESEARCH_RULES registry (orchestrator-maintained)
│  └─ __tests__/         per-rule Vitest tests
├─ lengths/             length/ratio subsystem (parallel to the angle engine)
│  ├─ dsl.ts             adds the `eqratio` fact + `factHoldsL`
│  ├─ lengthAR.ts        LengthAR — log-distance Gaussian table (ratios)
│  ├─ verify.ts          verifyL() / researchVerifyL() (ratio-aware verifier)
│  └─ rules/             length rules (similar/Thales/SAS-sim/power-of-a-point)
└─ problems/
   ├─ types.ts           ResearchProblem shape
   ├─ replay.ts          replayProblem() play-test harness
   ├─ <id>.ts            one contest problem per file
   └─ __tests__/         per-problem replay tests
```

**Totals:** 13 promotable rules (+ Reim, a subsumed example) and 12 contest
play-test problems, all covered by the research Vitest suite. 10 of the 12
problems verify end-to-end; the remaining 2 (Simson line, plus the external-
division note) document precisely-characterized open gaps. See the tables below.

## Key finding

The engine's **AR layer already proves every directed-angle theorem** (verified:
Reim's theorem needs no new rule — it is derived as `algebraic angle-chase`).
Therefore genuinely new rules must produce what AR cannot:

1. **Lengths / congruence** (`cong`) — there is no length table in AR.
2. **Ratios / similarity** — not in the base DSL (needs a DSL extension).
3. **Non-angle projective incidence** — collinearity/concurrence that is not
   reducible to angle-chasing (Pappus is shipped; Pascal is open).

## Status

### Rules

| Rule | File | Produces | Gap vs. shipped engine | Status |
|------|------|----------|------------------------|--------|
| Reim's theorem | `rules/reim.ts` | `para` | none — AR proves it | ⚠️ subsumed by AR (harness example only) |
| midpoint gives equal halves | `rules/midpoint_congruence.ts` | `cong` | yes (no length AR) | ✅ verified (4 tests) |
| perpendicular bisector ⇒ equidistant | `rules/perp_bisector.ts` | `cong` | yes (no length AR) | ✅ verified (7 tests) |
| SAS congruent triangles | `rules/sas_congruence.ts` | `cong` (+ remaining `eqangle`) | yes (third side is metric) | ✅ verified (9 tests) |
| Pascal's theorem | `rules/pascal.ts` | `coll` (+ `para` at ∞) | yes (non-angle projective) | ✅ verified (9 tests) |
| equal segments chain (cong transitivity) | `rules/cong_transitivity.ts` | `cong` | yes (no length table) | ✅ verified (7 tests) |
| SAS about a common vertex (rotation) | `rules/sas_shared_vertex.ts` | `cong` | yes (metric, spiral configs) | ✅ verified (9 tests) |
| isosceles: equal sides ⇒ equal base angles | `rules/isosceles_converse.ts` | `eqangle` | yes (length→angle) | ✅ verified (6 tests) |
| SSS congruent triangles | `rules/sss_congruence.ts` | `eqangle` ×3 | yes (length→angle) | ✅ verified (8 tests) |
| shared-side congruence (4-point) | `rules/shared_side_congruence.ts` | `eqangle` ×3 | yes (kite/4-point, no 6-vertex SSS) | ✅ verified (7 tests) |
| equal radii ⇒ concyclic | `rules/concyclic_equal_radii.ts` | `cyclic` | yes (circle from `cong`-star; dual of `perp_bisector`) | ✅ verified (8 tests) |
| AA similar triangles | `lengths/rules/similar_triangles_aa.ts` | `eqratio` | yes (needs ratio table) | ✅ verified (7 tests) |
| Thales / basic proportionality | `lengths/rules/thales_basic_proportionality.ts` | `eqratio` ×2 | yes (ratio table) | ✅ verified (6 tests) |
| SAS similar triangles | `lengths/rules/sas_similarity.ts` | `eqratio` + `eqangle` ×2 | yes (ratio table) | ✅ verified (9 tests) |
| power of a point (chords/secants) | `lengths/rules/power_of_a_point.ts` | `eqratio` ×2 (PA·PB=PC·PD) | yes (one-step; subsumes the 3-step proof) | ✅ verified (10 tests) |

### Length/ratio subsystem (`lengths/`)

The deepest gap — **ratios** — required a small parallel engine, since the shipped
DSL has no ratio predicate and AR is angles-only:

- `lengths/dsl.ts` — adds the `eqratio(A,B,C,D,E,F,G,H)` fact (AB/CD = EF/GH) and
  `factHoldsL`.
- `lengths/lengthAR.ts` — `LengthAR`: a log-distance Gaussian table (mirrors
  `ar.ts`) where each segment is a `log|PQ|` generator; `cong`/`eqratio`/`midp`
  become linear equalities over logs. Sound (symbolic, no coordinate collapse).
- `lengths/verify.ts` — `verifyL()` / `researchVerifyL()`: the full verifier
  contract (truth + one-step DD/AR/LengthAR + minimality) extended to ratios.
- Scope limit: numeric-constant ratios (e.g. `AB = 2·MA`) are out of scope (would
  need a `log 2` generator); only pure equalities/ratio-equalities are handled.

Batch 1 conclusion: every genuinely new rule produces a **length** (`cong`) or a
**non-angle incidence** (`coll`) fact — exactly the two things the angles-only AR
table cannot reach.

### Problems

| Problem | File | Exercises | Outcome |
|---------|------|-----------|---------|
| Pascal hexagon collinearity | `problems/pascal_hexagon.ts` | `pascal` | ✅ goal reached |
| Isosceles-trapezoid equal diagonals | `problems/isosceles_trapezoid_diagonals.ts` | `sas_congruence` | ✅ goal reached |
| Circumcenter equidistant | `problems/circumcenter_equidistant.ts` | `perp_bisector`, `cong_transitivity` | ✅ goal reached (Batch 2 closed the gap) |
| Equilateral triangles on two sides (CD=BE) | `problems/equilateral_on_two_sides.ts` | `sas_shared_vertex` + AR | ✅ goal reached |
| Kite: ∠ABC = ∠ADC | `problems/kite_equal_angles.ts` | `isosceles_converse` + AR | ✅ goal reached |
| Power of a point (intersecting chords) | `problems/power_of_a_point.ts` | `inscribed_angle` → `similar_triangles_aa` → `LengthAR` | ✅ goal reached (no new rule — already derivable) |
| Thales intercept (two parallels cut sides proportionally) | `problems/thales_midline.ts` | `thales_basic_proportionality` → `LengthAR` | ✅ goal reached |
| Converse power-of-a-point (SAS similarity) | `problems/sas_similarity_problem.ts` | `sas_similarity` → `LengthAR` | ✅ goal reached |
| Isosceles median bisects apex angle | `problems/shared_side_congruence_problem.ts` | `midpoint_congruence` → `shared_side_congruence` | ✅ goal reached |
| Angle Bisector Theorem (Euclid VI.3) | `problems/angle_bisector_theorem.ts` | AR → `isosceles` → `thales_basic_proportionality` → `LengthAR` | ✅ goal reached (no new rule) |
| IMO 2018 P1 (DE ∥ FG) | `problems/imo_2018_p1.ts` | AR + `isosceles` + `concyclic_equal_radii` + Reim | ✅ goal reached end-to-end (Batch 7 closed the gap) |
| Simson–Wallace line (D,E,F collinear) | `problems/simson_line.ts` | AR + `converse_inscribed`; **blocked at `coll` from `para`** | ⚠️ angle content fully proven; one gap (see below) |

### Gaps discovered (feed later batches)

1. ~~**`cong` transitivity / substitution**~~ — ✅ done (`cong_transitivity`).
2. ~~**Shared-apex SAS** (rotation / spiral similarity / Fermat configs)~~ — ✅
   done (`sas_shared_vertex`).
3. ~~**Length/ratio reasoning**~~ — ✅ done: `lengths/` foundation (`eqratio` +
   `LengthAR`) plus AA similarity, **Thales / basic proportionality**, and
   **SAS similarity** (Batch 4). Power-of-a-point is derivable on top, no new rule.
4. ~~**SSS/SAS across a shared side**~~ — ✅ done (`shared_side_congruence`,
   Batch 4): handles two triangles sharing a base with only 4 distinct points
   (kite/4-point configs the 6-vertex `sss_congruence` cannot reach).
5. **Open for later batches:** numeric-constant ratios (`AB = 2·MA`, needs a
   `log 2` generator in `LengthAR`); Menelaus/Ceva (signed-ratio products).
   ~~power-of-a-point as a first-class `eqratio` producer~~ — ✅ done
   (`lengths/rules/power_of_a_point.ts`, one-step chords + secants).
6. **External division (signed ratios)** — `thales_basic_proportionality` guards
   only *internal* cuts (`isBetween`); a parallel meeting the *extensions* of the
   sides (where Thales still holds with signed ratios) is rejected. Also, without
   a length-constant generator the chord-to-base ratio `DE/BC = AD/AB` is still
   unreachable. (Found by the Thales play-test.)
7. ~~**Concyclic from equal radii** (`cong`-star ⇒ `cyclic`)~~ — ✅ done
   (`rules/concyclic_equal_radii.ts`, the circle-producing dual of
   `perp_bisector`). This closed **IMO 2018 P1 end-to-end**.
8. **Coincident-direction ⇒ collinear** (`para(X,A,X,B) ⇒ coll(X,A,B)`) — NEW,
   found by the Simson–Wallace play-test. AR *consumes* `coll` (to merge line
   directions) but `AngleAR.equation()` returns `null` for a `coll` candidate, so
   AR never *emits* collinearity; the only `coll`-producers are the projective
   `pappus`/`pascal`, which don't apply here. The Simson feet are proven
   codirectional (`para(D,E,D,F)`) yet `coll(D,E,F)` can't be packaged. A one-line
   bridge rule (two segments from a shared point that are parallel ⇒ collinear)
   would close the Simson line end-to-end. **Top candidate for the next batch.**
   Distinct from the "non-angle projective incidence" item in *Key finding* above:
   there the collinearity isn't angle-reducible; here it fully reduces to an angle
   identity AR already proves — only the `coll` packaging is missing.
9. **Robustness (production `src/`, not a research gap):** the shipped verifier's
   `canonicalKey`/`isAmong` path *throws* (not just rejects) when handed an
   `eqratio`-shaped premise, since that fact type isn't in the shipped DSL. Harmless
   today (no ratios ship), but worth a guard if `eqratio` is ever promoted. (Found
   by the SAS-similarity play-test.)

## Running

```
npx vitest run research/freeplay-rules   # all research tests
npx vitest run src                       # shipped engine (must stay green)
```
