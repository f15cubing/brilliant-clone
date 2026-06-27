# Roadmap — Interactive Olympiad Geometry

Concrete, prioritized expansion opportunities, tied to the **actual current
state** of the code (see [PROJECT_STATUS.md](./PROJECT_STATUS.md)). Items are
grouped into **near-term** (quick wins), **mid-term** (meaningful features), and
**long-term** (ambitious). Each notes *what it involves* and *why it's valuable*.

Nothing here invents features that already exist — these are gaps and natural
extensions of what is shipped today.

---

## ✅ Recently completed (June 2026)

**Competitive Freeplay + DDAR proof-checker.** Shipped a second mode
(`/freeplay`) where learners build machine-checked multi-step proofs, backed by a
from-scratch TypeScript **DDAR** checker (`src/lib/freeplay/`: a fact DSL,
coordinate-guarded deduction rules, an exact-rational directed-angle algebra
table, and a minimality-enforcing step verifier). See
[`PRD-competitive-freeplay.md`](./PRD-competitive-freeplay.md).

**Multi-case verification.** The checker no longer trusts a single figure: each
puzzle ships a parametric `construct(rng)`, `realize.ts` samples several
independent generic realizations (all satisfying the givens), and `verify()`
accepts a step only if it holds in **all** of them — closing the "true in one
diagram by accident" gap. This construction model is the foundation for the
planned **movable freeplay figures** ([`design/MOVABLE_FIGURES.md`](./design/MOVABLE_FIGURES.md)).

**Vitest test suite (now in CI).** Added Vitest (`npm test`), wired into CI. It
covers the Freeplay engine (`src/lib/freeplay/__tests__/`), the **course-app pure
logic** (grading, geometry math, the `recordAttempt`/`reconcile`/`achievements`
progress logic), and an isolated rule-discovery lab at `research/freeplay-rules/`
with an extensive suite of candidate rules, a parallel length/ratio subsystem
(`eqratio` + `LengthAR`), and **replayed contest problems** (incl. IMO 2018 P1, the
Angle Bisector Theorem, power-of-a-point, and the **now-closed Simson–Wallace
line**). The lab is kept outside the shipped bundle (excluded from `tsconfig`
include).

**Length/ratio subsystem + rule promotion.** Promoted **13 research rules** into the
shipped angle/incidence engine (`src/lib/freeplay/rules/`, e.g. `pascal`,
`sas_congruence`, `thales_diameter`, `concyclic_from_directed_angles`,
`coincident_direction_collinear`) and shipped a **length/ratio layer**
(`lengths/`: `eqratio` facts, `LengthAR`, and 5 `RATIO_RULES` incl.
`power_of_a_point` and `sas_similarity`) — **31 rules total**. The catalog grew to
**14 curated puzzles** (intro/core/challenge, with literal JBMO/IMO-shortlist
citations), and **IMO 2019 P2 now verifies end-to-end**.

**Natural-language step input + proof archive.** Shipped an NL step path
(`src/lib/freeplay/nl/` + `functions/`): a step typed in English is translated by a
deterministic offline mock (default) or an OpenAI-backed Cloud Function (off by
default; signed-in only, Auth + App Check, key server-side) and re-checked by the
**same** `verify()`. On a win, the full compiled proof is persisted (Firestore /
`localStorage`).

Engineering-hygiene baseline established (see commit history):

- [x] **Git repo + GitHub.** Initial commit made; pushed to a private GitHub
  repo (`f15cubing/brilliant-clone`). `dist/`, `.env`, `*.tsbuildinfo`,
  generated `vite.config.{js,d.ts}`, and local agent/IDE tooling are
  git-ignored; `.env.example` is the committed template.
- [x] **Working `lint` script.** Installed `eslint` (v10), `typescript-eslint`,
  `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`, and
  `@eslint/js`, with a flat `eslint.config.js`. `npm run lint` now passes
  (uses the classic Rules-of-Hooks; the experimental React Compiler rules are
  deliberately deferred — see config comment).
- [x] **Minimal CI.** `.github/workflows/ci.yml` runs `npm ci` → lint →
  `tsc --noEmit` → build on Node 22 for pushes/PRs to `master`/`main`.
  First run is green.
- [x] **Security: patched `mathjs`.** Upgraded `^14.9.1 → ^15.2.0`, resolving
  two expression-parser advisories (GHSA-jvff-x2qm-6286, GHSA-29qv-4j9f-fjw5).
  `npm audit` now reports **0 vulnerabilities**. The v15 breaking changes do
  not affect our scalar `evaluate(expr, scope)` usage.

---

## Near-term — quick wins

Low effort, high leverage; mostly engineering hygiene and small UX fills.

- [ ] **Add component / integration tests.** *What:* the pure logic is now
  well-covered and `npm test` runs in CI (see Recently completed), but React
  components, hooks, and end-to-end flows (`ProblemPlayer`, `FreeplayArena`, the
  `StepBuilder`, auth/progress wiring) have no automated tests yet — only the
  Playwright demo-recording specs. Add React Testing Library / Playwright
  assertions for the critical flows. _Why:_ the highest-risk *math* is tested;
  the remaining regression risk is in the UI glue.

- [ ] **Surface the data already collected.** *What:* on the lesson-complete or
  Dashboard view, show per-problem `attempts` / time from `problemStats`
  (e.g. "you found these the trickiest"). _Why:_ the data is already
  persisted but unused — pure UI work, no new schema.

- [ ] **Persisted "reveal" / hint affordance polish.** *What:* a progressive
  hint step before full reveal, reusing the existing `explanations[]` +
  overlay mechanism. _Why:_ the overlay engine and `triggerCondition` system
  already support it; adds pedagogical value with little new code.

- [ ] **Auth UX hardening.** *What:* friendly error messages, password reset
  (`sendPasswordResetEmail`), and loading/disabled states in `Login`/`Signup`.
  _Why:_ Firebase Auth is already wired; these are small, high-visibility
  gaps.

---

## Mid-term — meaningful features

Multi-file features that materially improve learning or extensibility, building
on existing abstractions.

- [ ] **Close the remaining DDAR engine gaps.** *What:* the first wave of
  promotions has landed (13 angle/incidence rules incl. the
  "coincident-direction ⇒ collinear" Simson bridge, plus the `eqratio`/`LengthAR`
  ratio layer with power-of-a-point, similarity, and tangent-secant power — see
  Recently completed). The remaining, research-characterized gaps are: a
  **shared-harness change** to feed `eqratio` premises into `rule.derive` (unlocks
  **converse power-of-a-point ⇒ `cyclic`**), **numeric-constant ratios** (a `log 2`
  generator for `LengthAR`), and a **signed** length table for **Menelaus/Ceva** and
  external division. _Why:_ each unlocks a class of provable olympiad problems; see
  `research/freeplay-rules/findings/unsolved-rules-plan.md`.

- [ ] **Movable freeplay figures.** *What:* make the freeplay board draggable on
  the construction model the verifier already uses — render each puzzle's
  `freePoints` as draggable points/gliders, recompute dependents via
  `construct` on drag, and re-validate the in-progress proof against the live
  position (surfacing "valid across N sampled positions"), while keeping the
  givens enforced so dragging can't break a hypothesis. _Why:_ restores the
  interactivity of course-mode boards and makes the multi-case soundness
  tangible to learners. Full staged plan in
  [`design/MOVABLE_FIGURES.md`](./design/MOVABLE_FIGURES.md).

- [ ] **Add the two "stretch" lessons from the PRD.** *What:* author
  _Tangent–Chord Angle_ and a multi-step _"putting it together"_ angle chase
  as new files in `src/lib/content/lessons/`, registered in `course.ts`.
  _Why:_ the data-driven content model means this needs **no engine changes**;
  it directly deepens the one course learners have.

- [ ] **Spaced repetition / review mode.** *What:* use the already-persisted
  `problemStats` (attempts, time, `lastMistakeId`) to build a "Review" queue
  that resurfaces problems a learner struggled with. _Why:_ the PRD calls
  this out as the intended use of `problemStats`; it addresses the biggest
  learning-science gap (Brilliant-style apps over-index on intuition, under
  on retention — see [BRAINLIFT.md](../BRAINLIFT.md)).

- [ ] **Generality-testing interactions.** *What:* "drag-and-predict" problems
  where the learner must move the figure to a configuration, predict a value,
  then verify against the live readout — extending the existing `geometric`
  answer type and drag constraints. _Why:_ `BRAINLIFT.md` SPOV #4 argues most
  "interactive" learning is performative; this is a differentiator the board
  engine already makes feasible.

- [ ] **Make "read the explanation after a correct answer" deliberate.** *What:*
  after a correct answer, optionally show the `solutionText` / overlay and a
  one-line "why" before "Continue." _Why:_ `BRAINLIFT.md` Insight #2 / SPOV #5
  identify the post-success explanation as the strongest learning moment;
  `ProblemPlayer` already has the solution content on hand.

- [ ] **Accessibility & mobile-touch acceptance pass.** *What:* larger touch hit
  targets for draggable points, keyboard/ARIA for MC options and the math
  field, and explicit testing on touch devices. _Why:_ the PRD flags touch as
  a top risk and only partially mitigated today.

- [ ] **Lesson gating & a real course map progression.** *What:* optional soft
  prerequisites (later lessons unlock as earlier ones complete) visualized in
  `CourseMap`. _Why:_ the data model already tracks `completedLessonIds`;
  this turns a flat list into a guided path.

---

## Long-term — ambitious

Bigger bets that change the product's scope or moat.

- [ ] **Multi-course architecture.** *What:* generalize `course.ts` (currently a
  single exported `COURSE`) into a registry; make progress, achievements, and
  routing course-aware (e.g. `/course/:courseId`). Then add follow-on
  units (Circles, Power of a Point, Lengths & Ratios) per the PRD's "future"
  section. _Why:_ unlocks growth beyond one chapter; the content/types layer
  is already clean enough to extend, but progress/achievements are hard-coded
  to one course today.

- [ ] **Content authoring tooling / CMS.** *What:* a way to author or edit
  `Problem`/`Lesson` objects (and preview boards) without a redeploy — e.g. a
  schema-validated JSON variant of `JSXGraphDef` plus an in-app preview.
  _Why:_ content is build-time only now; lowering authoring cost is what lets
  the catalog scale.

- [ ] **AI tutor (Koji-style, screen-aware).** *What:* a Socratic helper that can
  read the live board state (`getRefs()` already exposes element values) and
  ask guiding questions without giving the answer. _Why:_ `BRAINLIFT.md`
  SPOV #3 argues the tutor — not the puzzles — is the real moat; the board
  already exposes the state such a tutor would need. (Explicitly a non-goal
  for the current release — this is a later bet.)

- [ ] **Mastery analytics & dashboards.** *What:* aggregate `problemStats` into
  mistake-pattern insights and a "concepts to revisit" view; optionally a
  parent/teacher view. _Why:_ moves the product from "feeling of
  understanding" toward measured mastery (a recurring `BRAINLIFT.md` theme).

- [ ] **Shareable proofs / open-ended (DOK 3–4) problems.** *What:* multi-step
  angle-chase problems where learners assemble a sequence of justified steps,
  not just a final value. _Why:_ addresses the ceiling identified in
  `BRAINLIFT.md` SPOV #6 (intuition vs. contest-level proof) — the hardest but
  most distinctive direction for an _olympiad_ product.

---

## Suggested sequencing

A pragmatic order that front-loads safety, then value:

1. **Stabilize:** ~~fix lint → add CI → initial commit → add Vitest for the pure
  logic + wire `test` into CI~~ ✅ *(done — see Recently completed)*. Remaining:
  **component / integration tests** for the UI glue.
2. **Extend cheaply:** surface `problemStats` in the UI → author the two stretch
  lessons (no engine changes).
3. **Deepen learning:** review/spaced-repetition mode → deliberate
  post-correct explanations → generality-testing problems.
4. **Scale scope:** multi-course architecture → content tooling → AI tutor.

