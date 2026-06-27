# Project Status — Interactive Olympiad Geometry

_Last reviewed: June 27, 2026 (the **Competitive Freeplay** proof mode now has a
TypeScript DDAR proof-checker with a length/ratio (`eqratio`) layer, 31 deduction
rules, 14 curated puzzles, natural-language step input (off by default), a per-user
proof archive, a Vitest suite wired into CI, and an isolated
`research/freeplay-rules/` rule-discovery lab)._

This document describes **what the project actually is today**: its purpose, tech
stack, architecture, an honest feature inventory (done / partial / missing), and
current limitations. For where it could go next, see [ROADMAP.md](./ROADMAP.md).

---

## 1. What it is

A **Brilliant-style interactive learning web app** built around a single course:
**Introductory Geometry — Angle Chasing**, modeled on an introductory geometry
textbook.

The core idea: learn by _doing_. Every problem renders a **draggable geometric
construction**. Learners drag points and watch a theorem hold for any
configuration, then answer a question. Wrong answers trigger a visual,
diagram-based explanation drawn directly on top of the learner's current figure
(not a separate static image).

A second mode, **Competitive Freeplay** (`/freeplay`), turns the app from a
quiz into a **proof environment**: the learner assembles a multi-step proof by
citing premises and applying named theorems, and each step is machine-checked by
a from-scratch TypeScript **DDAR proof-checker** (deductive database + algebraic
reasoning, inspired by AlphaGeometry). See
[`docs/PRD-competitive-freeplay.md`](./PRD-competitive-freeplay.md) for the
formal model. Candidate new deduction rules are prototyped and tested in an
isolated lab at [`research/freeplay-rules/`](../research/freeplay-rules/) (kept
outside the shipped bundle).

The package name is `interactive-olympiad-geometry` (`package.json`), version
`0.1.0`. The product requirements live in [`PRD.md`](../PRD.md); a research
"BrainLift" on Brilliant.org and learning science lives in
[`BRAINLIFT.md`](../BRAINLIFT.md).

---

## 2. Tech stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Language | TypeScript | `^5.9.3` | `strict` mode, `noUnusedLocals`/`noUnusedParameters` on |
| Build / dev server | Vite | `^6.4.3` | `@vitejs/plugin-react` |
| UI framework | React | `^18.3.1` | Function components + hooks |
| Routing | react-router-dom | `^6.30.4` | `BrowserRouter` |
| Styling | Tailwind CSS | `^4.3.1` | Via `@tailwindcss/vite` plugin (no `tailwind.config`) |
| Interactive geometry | JSXGraph | `^1.12.2` | Imperative engine wrapped by `useJSXGraph` |
| Math input | MathLive | `^0.105.3` | `<math-field>` web component |
| Symbolic checking (CAS) | math.js | `^15.2.0` | Numeric-equivalence grading of algebraic answers |
| Math rendering | KaTeX + react-katex | `^0.16.47` / `^3.1.0` | Prompts, options, explanations |
| Auth & data | Firebase | `^11.10.0` | Email/Password Auth + Cloud Firestore |
| Hosting | Firebase Hosting | — | Serves the Vite `dist/` build as an SPA |
| Linting | ESLint + typescript-eslint | `^10.5.0` / `^8.62.0` | Flat config (`eslint.config.js`); React Hooks + Refresh plugins |
| Testing | Vitest | `^2.1.9` | Unit/integration tests (`npm test`); covers the Freeplay DDAR engine, the `research/` rule lab, **and** the course-app pure logic (grading, geometry math, progress reducer) |
| NL backend (optional) | Firebase Cloud Functions + OpenAI | — | `functions/`: `translateStep` callable holds the OpenAI key server-side (Auth + App Check); **off by default**, app uses a local mock translator |
| E2E / demo capture | Playwright | `^1.61.1` | `demo:record` script captures walkthrough videos (`demo/`); excluded from Vitest |
| CI | GitHub Actions | — | `.github/workflows/ci.yml`: lint, type-check, **test**, build on Node 22 |

### npm scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Local dev server (http://localhost:5173) |
| `build` | `tsc --noEmit && vite build` | Type-check, then bundle to `dist/` |
| `preview` | `vite preview` | Serve the production build locally |
| `test` | `vitest run` | Run the test suite once (CI-friendly) |
| `test:watch` | `vitest` | Run tests in watch mode |
| `lint` | `eslint .` | Lints the project via `eslint.config.js` (passes; 2 benign `react-refresh` warnings) |
| `demo:record` | `playwright test -c demo/playwright.config.ts` | Record walkthrough demo videos |
| `deploy` | `npm run build && npx -y firebase-tools@latest deploy --only hosting` | Build + deploy hosting |

---

## 3. Architecture

A pure client-side SPA. Firebase is the only backend (Auth + Firestore);
there is no custom server. All course content is shipped in the JS bundle as
typed TypeScript — only _user progress_ lives in Firestore.

### Data / control flow

```
App (BrowserRouter)
 └─ AuthProvider          ← Firebase Auth state (or guest mode if unconfigured)
     └─ ProgressProvider  ← progress snapshot, hydrated from Firestore/localStorage
         └─ ProtectedRoute → Layout
             ├─ Dashboard       (/)        XP, progress, achievements, continue
             ├─ CourseMap       (/course)  lesson list + completion
             ├─ LessonPlayer    (/lesson/:lessonId)
             │   └─ ProblemPlayer
             │       ├─ GeometryBoard ──┐
             │       │                  └─ useJSXGraph (the only imperative bridge)
             │       ├─ MathField / MathText (MathLive / KaTeX)
             │       └─ FeedbackBanner
             ├─ FreeplayList    (/freeplay)             puzzle catalog
             └─ FreeplayArena   (/freeplay/:puzzleId)   proof environment
                 ├─ FixedFigure (read-only JSXGraph figure)
                 ├─ FactList / GoalPanel (premises + target)
                 ├─ StepBuilder (cite premises → apply a theorem)
                 └─ verify() → DDAR proof-checker (src/lib/freeplay)
```

### The React ↔ JSXGraph boundary

The key architectural decision (per `PRD.md` §8a): JSXGraph is imperative,
React is declarative. A **single hook**, `src/lib/geometry/useJSXGraph.ts`, owns
board creation, element construction, overlay add/remove, and teardown on
unmount. Content files never touch JSXGraph directly — they emit a serializable
`JSXGraphDef` (see `src/lib/geometry/board-types.ts`) that the hook interprets.
`board-types.ts` allows `{ fn }` arguments so labels/coordinates can recompute
live as points are dragged, and `{ ref }` arguments to reference earlier
elements.

### The Freeplay DDAR proof-checker

`src/lib/freeplay/` is a self-contained, from-scratch geometry proof-checker
(no external solver), modeled on AlphaGeometry's DDAR. See
[`docs/DDAR_ENGINE.md`](./DDAR_ENGINE.md) for the full internals and
[`docs/FREEPLAY_EXPLAINER.md`](./FREEPLAY_EXPLAINER.md) for a plain-language tour.

- `dsl.ts` — the fact language: `Rel` relations (`coll`, `para`, `perp`, `cong`,
  `cyclic`, `midp`, `eqangle`), `Aval` angle values, and the length/ratio
  `EqRatio` (`AB/CD = EF/GH`) carried in the `LFact = Fact | EqRatio` union, with
  canonical keys so symmetric facts compare equal.
- `rules.ts` + `rules/` — the **31** named deduction rules: 13 hand-written
  `CORE_RULES`, 13 `PROMOTED_RULES` (promoted from the research lab, e.g. `pascal`,
  `sas_congruence`, `thales_diameter`, `concyclic_from_directed_angles`), and 5
  length/ratio `RATIO_RULES` (`lengths/rules/`, e.g. `power_of_a_point`,
  `sas_similarity`). Each is **coordinate-guarded** so it only fires when the
  figure numerically supports it.
- `ar.ts` / `lengths/lengthAR.ts` — `AngleAR`, a Gaussian-elimination table over
  exact rationals that closes directed-angle chases (mod 180°), and `LengthAR`,
  the dual log-distance table that closes equal-length / ratio chases.
- `check.ts` / `geom.ts` — numeric truth checks and geometry helpers.
- `realize.ts` — samples several independent generic realizations of a puzzle
  (from its `construct(rng)`, `DEFAULT_REALIZATIONS = 5`), each validated to
  satisfy the givens.
- `verify.ts` — the step verifier: a proposed step is accepted only if it is
  numerically true and derivable by a **single** rule (DD, AngleAR, or LengthAR)
  from **exactly** the cited premises (minimality) **across all sampled
  realizations**, with "by symmetry" support (`symmetry.ts`). Checking many cases
  (not one fixed figure) rejects steps that only hold by coincidence in the
  canonical diagram.
- `nl/` — optional natural-language step input: a step typed in English is
  translated to a structured `(conclusion, premises)` by a deterministic local
  **mock** (default) or an OpenAI-backed Cloud Function, then routed through the
  **same** `verify()` — the translator has no authority. Off by default.
- `proofRecord.ts` / `useProofRecorder.ts` — on a win, the full machine-checked
  proof is compiled and persisted (Firestore for signed-in users, `localStorage`
  for guests).
- `puzzles/` — the **14** shipped Freeplay problems (each with a `construct(rng)`),
  incl. classical lemmas and literal contest citations (JBMO/IMO shortlist) up to
  **IMO 2019 P2, now solvable end-to-end**; `api.ts` selects local (TypeScript) or
  remote checking. Making the figure itself draggable is scoped in
  `docs/design/MOVABLE_FIGURES.md`.

Candidate **new** rules are not developed in `src/`; they are prototyped, unit-
tested, and play-tested against contest problems in `research/freeplay-rules/`
(see that folder's README), then promoted into `rules/` (or `lengths/rules/`)
only if desired.

### Directory map

```
brilliant-clone/
├─ index.html
├─ package.json              # deps + scripts
├─ vite.config.ts            # React + Tailwind plugins, "@/..." alias
├─ eslint.config.js          # flat ESLint config (TS + React Hooks/Refresh)
├─ .github/workflows/ci.yml  # CI: lint + type-check + test + build (Node 22)
├─ tsconfig.json             # strict; "@/*" → "src/*"
├─ firebase.json             # Hosting (dist + SPA rewrite) + Firestore rules + functions
├─ firestore.rules           # per-user read/write isolation; ratelimits locked
├─ .firebaserc               # default project: sandbox-7d4a1
├─ .env.example              # VITE_FIREBASE_* keys template
├─ README.md / PRD.md / BRAINLIFT.md / BRAINLIFT-freeplay.md
├─ docs/                     # PROJECT_STATUS, ROADMAP, DDAR_ENGINE, FREEPLAY_EXPLAINER,
│                            #   PRD-competitive-freeplay, SECURITY_AUDIT, design/, security/
├─ functions/               # NL backend Cloud Function (OpenAI translateStep); off by default
├─ research/
│  └─ freeplay-rules/        # isolated DDAR rule-discovery lab (NOT bundled)
├─ demo/                     # Playwright demo-recording specs + videos
├─ public/
│  └─ favicon.svg
├─ dist/                     # build output (git-ignored)
└─ src/
   ├─ main.tsx, App.tsx, index.css
   ├─ pages/
   │  ├─ Login.tsx, Signup.tsx
   │  ├─ Dashboard.tsx        # XP, progress %, achievements, "continue learning"
   │  ├─ CourseMap.tsx        # lesson list with completion state
   │  ├─ LessonPlayer.tsx     # problem sequencing, resume, lesson-complete screen
   │  ├─ FreeplayList.tsx     # Freeplay puzzle catalog
   │  └─ FreeplayArena.tsx    # Freeplay proof environment
   ├─ components/
   │  ├─ Layout.tsx, ProtectedRoute.tsx, Spinner.tsx
   │  ├─ MathField.tsx        # MathLive wrapper (+ mathlive.d.ts)
   │  ├─ MathText.tsx         # KaTeX/markdown-ish renderer
   │  ├─ geometry/GeometryBoard.tsx       # imperative handle over useJSXGraph
   │  ├─ freeplay/            # FixedFigure, FactList, GoalPanel, StepBuilder,
   │  │                       #   ProofSummary, DevPanel
   │  └─ solvables/
   │     ├─ ProblemPlayer.tsx  # answer UI + grading + overlay orchestration
   │     └─ FeedbackBanner.tsx # correct/wrong/revealed banner
   └─ lib/
      ├─ auth/AuthContext.tsx
      ├─ progress/
      │  ├─ ProgressContext.tsx  # snapshot, resume, persistence
      │  ├─ recordAttempt.ts     # extracted attempt/XP reducer (unit-tested)
      │  ├─ reconcile.ts         # merge local + remote progress
      │  ├─ achievements.ts      # 7 predicate-based achievements
      │  └─ types.ts
      ├─ firebase/
      │  ├─ config.ts            # init + isFirebaseConfigured guard (+ App Check)
      │  ├─ progressService.ts   # Firestore read/write helpers
      │  └─ proofService.ts      # Freeplay proof-archive read/write helpers
      ├─ content/
      │  ├─ types.ts             # Problem / Lesson / Course / AnswerConfig
      │  ├─ course.ts            # course assembly + lookups
      │  ├─ boards.ts            # declarative board element helpers
      │  └─ lessons/             # the 7 authored lessons (see below)
      ├─ geometry/
      │  ├─ useJSXGraph.ts       # the single React↔JSXGraph bridge
      │  ├─ board-types.ts       # JSXGraphDef schema
      │  ├─ measure.ts, circleAngles.ts, parallelAngles.ts  # angle math (tested)
      ├─ freeplay/              # the DDAR proof-checker: dsl, rules + rules/, ar,
      │                         #   lengths/ (LengthAR + ratio rules), realize, verify,
      │                         #   symmetry, nl/, puzzles/, proofRecord + __tests__
      └─ grading/algebra.ts      # LaTeX→math.js + symbolic-equivalence check (tested)
```

---

## 4. Feature inventory

### Done ✅

- [x] **Email/password authentication** via Firebase Auth (`AuthContext`,
      `Login`, `Signup`).
- [x] **Guest mode** — when no Firebase keys are present
      (`isFirebaseConfigured === false`), the app runs without auth and persists
      progress to `localStorage`.
- [x] **Route protection** — `ProtectedRoute` gates `/`, `/course`, `/lesson/:id`.
- [x] **One full course**: _Olympiad Geometry — Angle Chasing_, **7 lessons,
      39 problems**:
      1. `triangle-angle-sum` — Angles in a Triangle (5)
      2. `parallel-lines` — Parallel Lines & Transversals (5)
      3. `inscribed-angle` — The Inscribed Angle Theorem (4)
      4. `cyclic-quadrilaterals` — Cyclic Quadrilaterals (5)
      5. `incenter-lemma` — The Incenter–Excenter Lemma (10)
      6. `orthocenter` — The Orthocenter Exists (6)
      7. `orthic-incenter` — Orthocenter = Incenter of the Orthic Triangle (4)
- [x] **Three answer types** (`src/lib/content/types.ts`):
      `multiple-choice` (multi-try, no penalty), `algebraic` (MathLive input
      graded by math.js symbolic equivalence over random variable assignments),
      and `geometric` (a predicate run against live board state).
- [x] **Interactive boards** — draggable points, gliders, polygons, circles,
      angle markers, and **live readout labels** that update on drag, plus
      reusable drag **constraints** (keep a glider on an arc, keep concyclic
      points convex, etc.) in `boards.ts`.
- [x] **Diagram-based wrong-answer explanations** — explanations are drawn as
      **overlays on the learner's current board** (`applyOverlay` /
      `clearOverlays`), keyed to a `triggerCondition` (`default_wrong`,
      `selected_<optionId>`, or `reveal`), shown alongside a text banner.
- [x] **Reveal answer** after ≥1 attempt (awards 0 XP).
- [x] **Progress + gamification**: total XP, per-problem and per-lesson XP,
      lesson-completion bonus XP, course completion %, **7 achievements**
      (predicate-based, e.g. _First Steps_, _Century_, _Angle Chasing Champion_),
      and XP/achievement toasts.
- [x] **Resume / "continue learning"** — `LessonPlayer` resumes the bookmarked
      problem or first unsolved one; Dashboard mirrors this logic.
- [x] **Persistence** — optimistic in-memory update + Firestore writes
      (`progressService.ts`) with a `localStorage` mirror as recovery cache;
      `flushProgress` lets logout await in-flight writes.
- [x] **Firestore security rules** — per-user isolation
      (`request.auth.uid == userId`).
- [x] **Deploy path** — `firebase.json` configures Hosting (SPA rewrite to
      `index.html`) and a `deploy` script.
- [x] **Working lint** — ESLint flat config (`eslint.config.js`); `npm run lint`
      passes (classic Rules-of-Hooks; React Compiler rules deferred).
- [x] **CI** — GitHub Actions (`.github/workflows/ci.yml`) runs lint,
      type-check, and build on every push/PR; first run green.
- [x] **Source control** — committed and pushed to a private GitHub repo, with
      build artifacts and secrets git-ignored.
- [x] **Dependency security** — `mathjs` upgraded to `^15.2.0`; `npm audit`
      reports 0 vulnerabilities.
- [x] **Competitive Freeplay proof mode** (`/freeplay`, `/freeplay/:puzzleId`) —
      a second mode where learners build machine-checked multi-step proofs:
      a read-only figure, a premise/goal panel, and a `StepBuilder` that cites
      facts and applies named theorems, each step validated by the DDAR checker.
      Ships with **14 curated puzzles** (`src/lib/freeplay/puzzles/`) across
      intro/core/challenge tiers, incl. literal contest citations (JBMO/IMO
      shortlist) and **IMO 2019 P2, solvable end-to-end**.
- [x] **DDAR proof-checker** (`src/lib/freeplay/`) — from-scratch deductive
      database + algebraic reasoning over **31 rules**, with both a directed-angle
      table (`AngleAR`) and a length/ratio table (`LengthAR`, `eqratio` facts),
      coordinate-guarded rules, and a minimality-enforcing step verifier. (See §3.)
- [x] **Natural-language step input** (`src/lib/freeplay/nl/` + `functions/`) —
      type a step in English; a deterministic local **mock** (default) or an
      OpenAI-backed Cloud Function proposes a structured step that is routed through
      the **same** `verify()`. The translator has no authority. Live OpenAI path is
      off by default (signed-in only, Auth + App Check, key server-side).
- [x] **Proof archive** — on a Freeplay win, the full compiled proof is persisted
      (Firestore for signed-in users, `localStorage` for guests).
- [x] **Automated test suite** — Vitest (`npm test`, **wired into CI**). Covers the
      Freeplay DDAR engine (`src/lib/freeplay/__tests__/`), the **course-app pure
      logic** (`grading/algebra`, `geometry/measure`/`circleAngles`/`parallelAngles`,
      the `recordAttempt`/`reconcile`/`achievements` progress logic), and the
      `research/freeplay-rules/` rule/problem lab.

### Partial / present-but-thin ⚠️

- [~] **Per-problem analytics captured but unused** — `problemStats` records
      `attempts`, `timeSpentMs`, and `lastMistakeId` per problem (and the PRD
      anticipates spaced repetition / stuck-point analysis), but nothing in the
      UI consumes this data yet.
- [~] **Mobile touch handling** — the board sets `pan`/`zoom` to require
      shift/two-finger gestures so single-finger drags move points, but the
      PRD's larger-hit-target and explicit touch-acceptance work is not evidently
      complete.
- [~] **LaTeX → math.js conversion** (`grading/algebra.ts`) is intentionally
      scoped to this course's answer shapes (linear expressions, simple
      fractions, powers, degrees), not a general LaTeX parser.

### Missing / not started ❌

- [ ] **Component / integration tests** — the pure logic (engine, grading,
      geometry math, progress reducer) and the research lab are well-covered and
      `npm test` runs in CI, but React components, hooks, and end-to-end UI flows
      have no automated tests yet (only the Playwright demo-recording specs).
- [ ] **More than one course** (explicit non-goal for this release).
- [ ] **AI tutor / Socratic hints** (Koji-style) — explanations are static
      authored content.
- [ ] **Streaks, leagues, leaderboards, notifications** (explicit non-goals).
- [ ] **Runtime/CMS content authoring** — content is compiled into the bundle.

---

## 5. Maturity assessment

**Functional MVP, feature-complete against its own PRD.** The full happy path
works end to end: sign up / log in (or play as guest), work through 39
interactive problems across 7 lessons with three distinct answer types, get
diagram-based feedback on mistakes, earn XP and achievements, and have progress
persist and resume. The React↔JSXGraph architecture described in the PRD is
genuinely implemented through the single `useJSXGraph` hook.

Beyond the course, the app now also has a **Competitive Freeplay** proof mode
backed by a from-scratch DDAR proof-checker — a substantially more ambitious
piece of engineering than the quiz flow, and the most actively developed area
(see the `research/freeplay-rules/` rule lab).

Engineering hygiene has a solid **baseline**: the project is under source control
on GitHub, `npm run lint` works, CI (lint + type-check + **test** + build) runs on
every push/PR, dependencies are clean (`npm audit` → 0 vulnerabilities), and the
**Vitest suite** now covers the Freeplay engine, the research rule lab, **and** the
course-app pure logic (grading, geometry math, progress reducer). The remaining
test gap is **component/UI coverage**: React components, hooks, and end-to-end
flows are not yet automated (only the Playwright demo specs).

---

## 6. Current limitations & known gaps

- **No component/UI tests.** The Vitest suite (in CI) thoroughly covers the
  Freeplay DDAR engine, the `research/` rule lab, and the course-app pure logic
  (geometry math `measure.ts`/`circleAngles.ts`/`parallelAngles.ts`, answer grading
  `algebra.ts`, and the `recordAttempt`/`reconcile`/`achievements` progress logic),
  but React components, hooks, and end-to-end flows have no automated tests yet
  (only the Playwright demo-recording specs). Adding component/integration tests is
  the top remaining gap.
- **Lint runs but is not strict-zero.** `npm run lint` passes with 2 benign
  `react-refresh` warnings, and the experimental React Compiler rules
  (`purity`/`refs`/`set-state-in-effect`) are deliberately disabled for now.
- **Single hard-coded course.** Adding a _course_ (vs. a lesson) would require
  code changes; `course.ts` exports one `COURSE` constant and much of
  progress/achievements is written against it.
- **Content is build-time only.** Authoring or editing problems requires a code
  change + redeploy; there is no admin UI or CMS.
- **Captured-but-unused learning data.** `problemStats` is persisted but not
  surfaced or acted upon (no spaced repetition, no "your weak spots").
- **Firebase optional but progress sync depends on it.** Without keys the app is
  fully usable in guest mode, but progress is device-local only.

---

## 7. Running it locally

See the root [`README.md`](../README.md) for full setup. Quick version:

```bash
npm install
npm run dev      # http://localhost:5173 (guest mode if no .env)
```

Firebase is optional for local development. To enable accounts and cross-device
sync, copy `.env.example` to `.env`, fill in your `VITE_FIREBASE_*` keys, enable
Email/Password auth + Cloud Firestore in the Firebase console, and deploy
`firestore.rules`.
