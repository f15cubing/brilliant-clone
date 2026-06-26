# Closing the Simson–Wallace line: the "coincident direction ⇒ collinear" bridge

**Gap closed:** README Gap #8 — *Coincident-direction ⇒ collinear*
(`para(X,A,X,B) ⇒ coll(X,A,B)`).

**New rule:** `research/freeplay-rules/rules/coincident_direction_collinear.ts`
**Closed problem:** `research/freeplay-rules/problems/simson_line.ts` (now reaches
`coll(D,E,F)` end-to-end).

---

## 1. The gap

The Simson–Wallace line ("the feet `D,E,F` of the perpendiculars from a point `P`
on the circumcircle of `△ABC` to the sides are collinear") is a *directed-angle*
collinearity. The engine's angle layer (AR) already proves the entire angle
content of the theorem: a two-pedal-circle chase establishes

```
para(D, E, D, F)        i.e.   direction(DE) = direction(DF)
```

Lines `DE` and `DF` share the point `D`, so this parallelism is *logically* the
collinearity of `D, E, F`. Yet the shipped engine could not emit the literal
`coll(D,E,F)`:

- **AR consumes `coll` but never emits it.** `ar.ts` uses collinearity to *merge*
  line-direction generators; `AngleAR.equation()` returns `null` for a `coll`
  candidate, so `AngleAR.implies(coll(...))` is hard-wired `false`. AR can prove
  every directed-angle *theorem*, but it cannot *package* a direction identity
  back into an incidence fact.
- **The only `coll`-producers are projective.** `pappus` (shipped) and `pascal`
  (research) both emit `coll`, but neither applies here: the three feet are not
  six concyclic points (Pascal), and the three side-lines `BC, CA, AB` pairwise
  share a triangle vertex, so no two of them expose the six *distinct* points
  Pappus needs.

So a collinearity that is *fully reduced to an angle identity AR already proves*
was nonetheless unreachable — purely a packaging gap.

## 2. The rule and its soundness

```
coincident_direction_collinear:
    para(X, A, X, B)   ⇒   coll(X, A, B)
```

**Statement.** If two segments `XA` and `XB` share the endpoint `X` and are
parallel, then `X, A, B` are collinear.

**Soundness (exact, not approximate).** Through a fixed point `X` there is exactly
one line of any given direction. If `XA ∥ XB` and both pass through `X`, the two
lines coincide; hence `A` and `B` lie on that single line together with `X`. The
converse never fails — this is an iff, so the rule cannot emit a false `coll`.

**Coordinate guards (defense in depth).** The rule fires only when:

1. the cited `para` has **exactly one shared endpoint** `X` (two genuine segments
   from a common vertex — handled for every symmetric ordering of `para`);
2. all three points have coordinates and `A ≠ B`; and
3. `isCollinear(X, A, B)` holds **numerically** in the figure.

Because `para` and `isCollinear` are direction-only (sign-agnostic), the rule
works whether `X` lies *between* `A` and `B` or *outside* the segment `AB`.

**Why the shared-endpoint requirement is essential.** Two *distinct* parallel
segments (no shared point) are **not** collinear — they are two separate parallel
lines. The rule therefore ignores any `para` whose two segments do not share
exactly one endpoint. (The soundness test feeds `para(C,D,E,F)` with `CD ∥ EF`
but `C,D,E,F` non-collinear and confirms nothing is emitted.)

## 3. Why AR alone could not do it

AR is an angles-only Gaussian table mod 180°. It is *cite-driven* and treats
`coll` as an **input** that collapses two direction generators into one. It has
no output mode for incidence: the candidate `coll(D,E,F)` is rejected by
`equation() === null` before any elimination runs. The missing capability is not
more angle-chasing (AR already derives `para(D,E,D,F)`) but a one-line *bridge*
from the direction algebra back into the incidence DSL — precisely what this DD
rule supplies.

## 4. The closed proof (Simson line)

| Step | Fact | Rule | Cited |
|------|------|------|-------|
| 1 | `∠PDC = 180 − ∠PEC` | algebraic angle-chase | `perp(P,D,B,C), coll(B,D,C), perp(P,E,C,A), coll(C,E,A)` |
| 2 | `cyclic(P,C,D,E)` | converse of inscribed angle | step 1 |
| 3 | `∠PDB = 180 − ∠PFB` | algebraic angle-chase | `perp(P,D,B,C), coll(B,D,C), perp(P,F,A,B), coll(A,F,B)` |
| 4 | `cyclic(P,B,D,F)` | converse of inscribed angle | step 3 |
| 5 | `para(D,E,D,F)` | algebraic angle-chase | `cyclic(P,C,D,E), cyclic(P,B,D,F), cyclic(A,B,C,P), coll(C,E,A), coll(A,F,B)` |
| **6** | **`coll(D,E,F)`** | **coincident direction ⇒ collinear** | **`para(D,E,D,F)`** |

Step 6 cites **only** `para(D,E,D,F)`: the pedal-circle `cyclic` facts are no
longer needed (and citing them is flagged `extraneous_premises` by the
minimality gate). The replay asserts `goalReached === true` and
`allValid === true`.

## 5. Tests (all green)

- `rules/__tests__/coincident_direction_collinear.test.ts` (8 tests): isolation
  derivation; pivot recognition under every `para` symmetry; isolation
  verification citing exactly the `para`; **minimality** (no `para` → invalid);
  **soundness negatives** — distinct parallel segments emit nothing, and a real
  triangle (non-collinear pivot) emits nothing and is rejected by the truth gate;
  and **the gap** — neither shipped `RULES` nor the full research set can do it.
- `problems/__tests__/simson_line.test.ts` (12 tests): all six steps fire with
  the expected rule names; the goal is reached end-to-end; a regression guard
  shows the gap persists *without* the bridge; and a minimality guard shows the
  cyclics are extraneous to step 6.

Suite results: `research/freeplay-rules` → **233 passed (29 files)**;
`src` → **45 passed (2 files)** (no `src/` change).

> Note on harness wiring: the shipped `replayProblem` runs `researchVerify`,
> whose rule set is the orchestrator-maintained `rules/index.ts`. Per the
> contributor brief this candidate is intentionally **not** registered there yet,
> so the problem test replays with an explicit rule list
> (`[...RULES, ...RESEARCH_RULES, coincident_direction_collinear]`), exactly as
> the per-rule tests do. Promotion = add the rule to `rules/index.ts` (and,
> eventually, to `src/lib/freeplay/rules.ts`).

## 6. Generality and limitations

- **Generalizes broadly.** Any theorem that proves three points share a direction
  through a common pivot — pedal/Simson lines, Newton–Gauss-style direction
  chases, "the foot lies on line `XY`" lemmas — can now package that into `coll`.
  It is the natural incidence-output dual of AR's incidence-input handling of
  `coll`.
- **Pivot must be explicit.** The rule needs the parallelism stated *from the
  shared point* (`para(X,A,X,B)`). A direction equality phrased over four
  distinct points (`para(A,B,C,D)`) is deliberately **not** accepted, even if the
  four happen to be collinear in the coordinates — distinguishing "same line"
  from "two parallel lines" there would require trusting coordinates over cited
  structure, which would be unsound in general. (A separate, clearly-scoped
  "four collinear points from a `para` + a shared `coll`" rule could be added if a
  problem needs it, but it is out of scope here.)
- **No edge-case asymmetry.** `X` between `A` and `B` vs. outside segment `AB`
  are handled identically, because both `para` and the `isCollinear` guard are
  direction-only. The only excluded configurations are genuinely degenerate ones
  (`A = B`, a zero-length segment, or a missing coordinate), where no meaningful
  `coll` exists.
- **Not unsound anywhere found.** The conclusion is an exact iff; the guards only
  ever *restrict* firing, never widen it.
