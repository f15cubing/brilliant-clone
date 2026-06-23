# Roadmap — Interactive Olympiad Geometry

Concrete, prioritized expansion opportunities, tied to the **actual current
state** of the code (see [PROJECT_STATUS.md](./PROJECT_STATUS.md)). Items are
grouped into **near-term** (quick wins), **mid-term** (meaningful features), and
**long-term** (ambitious). Each notes *what it involves* and *why it's valuable*.

Nothing here invents features that already exist — these are gaps and natural
extensions of what is shipped today.

---

## Near-term — quick wins

Low effort, high leverage; mostly engineering hygiene and small UX fills.

- [ ] **Fix the `lint` script.** *What:* add `eslint` (+ `typescript-eslint`,
  ```
  `eslint-plugin-react-hooks`) to `devDependencies` and add an
  `eslint.config.js`. _Why:_ `npm run lint` currently fails (ESLint is
  neither installed nor configured); a working linter is the cheapest
  guardrail for a `strict` TypeScript codebase.
  ```

- [ ] **Seed automated tests for the pure logic.** *What:* add Vitest and unit
  ```
  test the deterministic, high-risk modules first — `grading/algebra.ts`
  (`latexToMathExpr`, `isAlgebraicallyEquivalent`), `geometry/measure.ts`,
  `circleAngles.ts`, `parallelAngles.ts`, and the `recordAttempt` reducer in
  `ProgressContext`. _Why:_ correctness of the whole app hinges on this math;
  these functions are pure and trivial to test, so coverage-per-hour is high.
  ```

- [ ] **Add a minimal CI workflow.** *What:* a `.github/workflows/ci.yml` that
  ```
  runs `npm ci`, `npm run build` (which already type-checks via
  `tsc --noEmit`), `npm run lint`, and tests on push/PR. _Why:_ catches
  breakages before deploy; the `build` script already does the type-check.
  ```

- [ ] **Commit the repo & ignore build artifacts.** *What:* make an initial
  ```
  commit and ensure `dist/` and `.env` are git-ignored. _Why:_ there is
  currently no commit history; a clean baseline makes review and rollback
  possible.
  ```

- [ ] **Surface the data already collected.** *What:* on the lesson-complete or
  ```
  Dashboard view, show per-problem `attempts` / time from `problemStats`
  (e.g. "you found these the trickiest"). _Why:_ the data is already
  persisted but unused — pure UI work, no new schema.
  ```

- [ ] **Persisted "reveal" / hint affordance polish.** *What:* a progressive
  ```
  hint step before full reveal, reusing the existing `explanations[]` +
  overlay mechanism. _Why:_ the overlay engine and `triggerCondition` system
  already support it; adds pedagogical value with little new code.
  ```

- [ ] **Auth UX hardening.** *What:* friendly error messages, password reset
  ```
  (`sendPasswordResetEmail`), and loading/disabled states in `Login`/`Signup`.
  _Why:_ Firebase Auth is already wired; these are small, high-visibility
  gaps.
  ```

---

## Mid-term — meaningful features

Multi-file features that materially improve learning or extensibility, building
on existing abstractions.

- [ ] **Add the two "stretch" lessons from the PRD.** *What:* author
  ```
  _Tangent–Chord Angle_ and a multi-step _"putting it together"_ angle chase
  as new files in `src/lib/content/lessons/`, registered in `course.ts`.
  _Why:_ the data-driven content model means this needs **no engine changes**;
  it directly deepens the one course learners have.
  ```

- [ ] **Spaced repetition / review mode.** *What:* use the already-persisted
  ```
  `problemStats` (attempts, time, `lastMistakeId`) to build a "Review" queue
  that resurfaces problems a learner struggled with. _Why:_ the PRD calls
  this out as the intended use of `problemStats`; it addresses the biggest
  learning-science gap (Brilliant-style apps over-index on intuition, under
  on retention — see `[BRAINLIFT.md](../BRAINLIFT.md)`).
  ```

- [ ] **Generality-testing interactions.** *What:* "drag-and-predict" problems
  ```
  where the learner must move the figure to a configuration, predict a value,
  then verify against the live readout — extending the existing `geometric`
  answer type and drag constraints. _Why:_ `BRAINLIFT.md` SPOV #4 argues most
  "interactive" learning is performative; this is a differentiator the board
  engine already makes feasible.
  ```

- [ ] **Make "read the explanation after a correct answer" deliberate.** *What:*
  ```
  after a correct answer, optionally show the `solutionText` / overlay and a
  one-line "why" before "Continue." _Why:_ `BRAINLIFT.md` Insight #2 / SPOV #5
  identify the post-success explanation as the strongest learning moment;
  `ProblemPlayer` already has the solution content on hand.
  ```

- [ ] **Accessibility & mobile-touch acceptance pass.** *What:* larger touch hit
  ```
  targets for draggable points, keyboard/ARIA for MC options and the math
  field, and explicit testing on touch devices. _Why:_ the PRD flags touch as
  a top risk and only partially mitigated today.
  ```

- [ ] **Lesson gating & a real course map progression.** *What:* optional soft
  ```
  prerequisites (later lessons unlock as earlier ones complete) visualized in
  `CourseMap`. _Why:_ the data model already tracks `completedLessonIds`;
  this turns a flat list into a guided path.
  ```

---

## Long-term — ambitious

Bigger bets that change the product's scope or moat.

- [ ] **Multi-course architecture.** *What:* generalize `course.ts` (currently a
  ```
  single exported `COURSE`) into a registry; make progress, achievements, and
  routing course-aware (e.g. `/course/:courseId`). Then add EGMO follow-on
  units (Circles, Power of a Point, Lengths & Ratios) per the PRD's "future"
  section. _Why:_ unlocks growth beyond one chapter; the content/types layer
  is already clean enough to extend, but progress/achievements are hard-coded
  to one course today.
  ```

- [ ] **Content authoring tooling / CMS.** *What:* a way to author or edit
  ```
  `Problem`/`Lesson` objects (and preview boards) without a redeploy — e.g. a
  schema-validated JSON variant of `JSXGraphDef` plus an in-app preview.
  _Why:_ content is build-time only now; lowering authoring cost is what lets
  the catalog scale.
  ```

- [ ] **AI tutor (Koji-style, screen-aware).** *What:* a Socratic helper that can
  ```
  read the live board state (`getRefs()` already exposes element values) and
  ask guiding questions without giving the answer. _Why:_ `BRAINLIFT.md`
  SPOV #3 argues the tutor — not the puzzles — is the real moat; the board
  already exposes the state such a tutor would need. (Explicitly a non-goal
  for the current release — this is a later bet.)
  ```

- [ ] **Mastery analytics & dashboards.** *What:* aggregate `problemStats` into
  ```
  mistake-pattern insights and a "concepts to revisit" view; optionally a
  parent/teacher view. _Why:_ moves the product from "feeling of
  understanding" toward measured mastery (a recurring `BRAINLIFT.md` theme).
  ```

- [ ] **Shareable proofs / open-ended (DOK 3–4) problems.** *What:* multi-step
  ```
  angle-chase problems where learners assemble a sequence of justified steps,
  not just a final value. _Why:_ addresses the ceiling identified in
  `BRAINLIFT.md` SPOV #6 (intuition vs. contest-level proof) — the hardest but
  most distinctive direction for an _olympiad_ product.
  ```

---

## Suggested sequencing

A pragmatic order that front-loads safety, then value:

1. **Stabilize:** fix lint → add Vitest for pure logic → add CI → initial commit.
2. **Extend cheaply:** surface `problemStats` in the UI → author the two stretch
  lessons (no engine changes).
3. **Deepen learning:** review/spaced-repetition mode → deliberate
  post-correct explanations → generality-testing problems.
4. **Scale scope:** multi-course architecture → content tooling → AI tutor.

