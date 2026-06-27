# Research context brief (read this first)

You are extending the **freeplay geometry DDAR engine** with new deduction
rules, kept ISOLATED from the live website. Everything here lives under
`research/freeplay-rules/` and is excluded from the production build
(`tsconfig.json` only includes `src/`). Do **not** edit anything in `src/`.

## The engine in one screen

Source of truth: `src/lib/freeplay/`.

- **Facts** (`dsl.ts`): a `Fact` is a `Rel` or an `Aval`.
  - `Rel` names: `coll` (3+ pts), `para` (AB∥CD), `perp` (AB⊥CD),
    `cong` (AB=CD), `cyclic` (4 concyclic pts), `midp` (M of AB), `eqangle`
    (∠ABC=∠DEF, 6 pts). Build with `rel(name, [pts])`.
  - `Aval`: an angle value `∠(a,b,c) = Form` (vertex b). `Form` is a linear
    expression with exact rational coefficients over named variables and/or
    `angle(...)` tokens. Build with `aval([a,b,c], parseForm("180 - A/2"))`.
- **DD rules** (`rules.ts`): each `Rule` has `{ id, name, derive(cited, ctx) }`.
  `derive` returns EVERY fact obtainable by one application of the theorem from
  the cited facts. `ctx = { coords, bindings, points }`. Rules are
  **coordinate-guarded**: only emit a fact when the numeric figure licenses it
  (use `geom.ts`: `isCollinear`, `isBetween`, `sameRayFrom`, `sameSideOfLine`,
  `rayBetween`, `lineIntersect`, `cross`, `sub`, `unit`, `angleDeg`, ...).
- **AR** (`ar.ts`): a directed-angle Gaussian-elimination table (mod 180°).
  It is **cite-driven** and **angles-only** (para/perp/eqangle/aval/coll).
- **Verifier** (`verify.ts`): a step is valid iff (1) the candidate fact is
  numerically true AND (2) one DD rule OR one AR angle-chase derives it from
  exactly the cited premises, AND (3) **minimality**: dropping any cited fact
  must break the derivation (else `extraneous_premises`).

## CRITICAL STRATEGIC FINDING

The AR layer + `inscribed_angle` **already proves any directed-angle theorem**
(we confirmed Reim's theorem is derived with no new rule). So a new rule is only
genuinely useful if it produces something the angle layer cannot:

- **Lengths / congruence** (`cong`) — `AngleAR` has no length table.
- **Ratios / similarity** (`eqratio`) — handled by the length subsystem
  (`lengths/`: `eqratio` + `LengthAR`), which has since shipped here **and** in
  `src/`. New ratio rules go in `lengths/rules/`.
- **Non-angle projective incidence** (`coll` from concyclicity, etc.) — e.g.
  Pappus and Pascal (both shipped).

Before claiming a rule adds value, CHECK that the shipped engine does not already
prove the target step: run `verifyWith(RULES, ...)` and confirm it is NOT valid.

## How to add a rule

1. Create `research/freeplay-rules/rules/<id>.ts` exporting a `Rule`
   (`import type { Rule } from "@/lib/freeplay/rules"`). Model it on
   `research/freeplay-rules/rules/reim.ts`. Keep it SOUND and coordinate-guarded.
2. Create `research/freeplay-rules/rules/__tests__/<id>.test.ts`. It MUST:
   - build an explicit, generic (scalene / non-degenerate) coordinate figure;
   - prove the rule fires in isolation: `verifyWith([yourRule], ...)` → valid;
   - prove **minimality**: dropping a needed premise → not valid;
   - prove a **soundness** negative: in a figure where the conclusion is false,
     the rule does NOT emit it (or the step is rejected);
   - assert the GAP: `verifyWith(RULES, ...)` is NOT valid (shipped engine can't
     already do it). If the shipped engine CAN already do it, say so in the test
     name and pick a different target — do not ship a redundant rule.
3. Do **not** edit `rules/index.ts` or any shared file — the orchestrator
   aggregates. Only touch your own `<id>.ts` and `<id>.test.ts`.

Helpers available from the harness: `import { verifyWith, researchVerify, RULES }
from "../../harness"`.

## How to add a problem (play-test)

1. Create `research/freeplay-rules/problems/<id>.ts` exporting a
   `ResearchProblem` (see `problems/types.ts`): real contest source, statement,
   generic coords, givens, goal, and an ordered `steps` proof.
2. Create `research/freeplay-rules/problems/__tests__/<id>.test.ts` that calls
   `replayProblem(problem)` (from `../replay`) and asserts `goalReached === true`
   and `allValid === true`. Every `given` and every step `fact` must be
   numerically true in the coords.
3. Pick coordinates carefully: they must be a faithful, NON-degenerate
   realization of the configuration (verify each given with `factHolds`).

## Running tests

```
npx vitest run research/freeplay-rules           # all research tests
npx vitest run research/freeplay-rules/rules/__tests__/<id>.test.ts
```

The shipped suite (`npx vitest run src`) must stay green — you are not allowed to
change `src/`, so it will.

## Soundness rules (non-negotiable)

- A rule must NEVER emit a fact that is false in the figure. Guard with coords.
- Prefer directed/observed geometry checks over assuming a configuration.
- Use generic coordinates in tests (no isosceles/right/equilateral unless the
  theorem needs it) so coincidences don't make a wrong rule look correct.
