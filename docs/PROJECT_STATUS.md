# Project Status — Interactive Olympiad Geometry

_Last reviewed: June 23, 2026_

This document describes **what the project actually is today**: its purpose, tech
stack, architecture, an honest feature inventory (done / partial / missing), and
current limitations. For where it could go next, see [ROADMAP.md](./ROADMAP.md).

---

## 1. What it is

A **Brilliant-style interactive learning web app** built around a single course:
**Olympiad Geometry — Angle Chasing**, modeled on Chapter 1 of Evan Chen's
_Euclidean Geometry in Mathematical Olympiads (EGMO)_.

The core idea: learn by _doing_. Every problem renders a **draggable geometric
construction**. Learners drag points and watch a theorem hold for any
configuration, then answer a question. Wrong answers trigger a visual,
diagram-based explanation drawn directly on top of the learner's current figure
(not a separate static image).

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
| Symbolic checking (CAS) | math.js | `^14.9.1` | Numeric-equivalence grading of algebraic answers |
| Math rendering | KaTeX + react-katex | `^0.16.47` / `^3.1.0` | Prompts, options, explanations |
| Auth & data | Firebase | `^11.10.0` | Email/Password Auth + Cloud Firestore |
| Hosting | Firebase Hosting | — | Serves the Vite `dist/` build as an SPA |

### npm scripts (`package.json`)

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Local dev server (http://localhost:5173) |
| `build` | `tsc --noEmit && vite build` | Type-check, then bundle to `dist/` |
| `preview` | `vite preview` | Serve the production build locally |
| `lint` | `eslint .` | **Currently non-functional** — see Limitations |
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
             └─ LessonPlayer    (/lesson/:lessonId)
                 └─ ProblemPlayer
                     ├─ GeometryBoard ──┐
                     │                  └─ useJSXGraph (the only imperative bridge)
                     ├─ MathField / MathText (MathLive / KaTeX)
                     └─ FeedbackBanner
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

### Directory map

```
brilliant-clone/
├─ index.html
├─ package.json              # deps + scripts
├─ vite.config.ts            # React + Tailwind plugins, "@/..." alias
├─ tsconfig.json             # strict; "@/*" → "src/*"
├─ firebase.json             # Hosting (dist + SPA rewrite) + Firestore rules ref
├─ firestore.rules           # per-user read/write isolation
├─ .firebaserc               # default project: sandbox-7d4a1
├─ .env.example              # VITE_FIREBASE_* keys template
├─ README.md / PRD.md / BRAINLIFT.md
├─ public/
│  └─ favicon.svg
├─ dist/                     # build output (committed/present)
├─ scripts/                  # (empty)
└─ src/
   ├─ main.tsx, App.tsx, index.css
   ├─ pages/
   │  ├─ Login.tsx, Signup.tsx
   │  ├─ Dashboard.tsx        # XP, progress %, achievements, "continue learning"
   │  ├─ CourseMap.tsx        # lesson list with completion state
   │  └─ LessonPlayer.tsx     # problem sequencing, resume, lesson-complete screen
   ├─ components/
   │  ├─ Layout.tsx, ProtectedRoute.tsx, Spinner.tsx
   │  ├─ MathField.tsx        # MathLive wrapper (+ mathlive.d.ts)
   │  ├─ MathText.tsx         # KaTeX/markdown-ish renderer
   │  ├─ geometry/GeometryBoard.tsx       # imperative handle over useJSXGraph
   │  └─ solvables/
   │     ├─ ProblemPlayer.tsx  # answer UI + grading + overlay orchestration
   │     └─ FeedbackBanner.tsx # correct/wrong/revealed banner
   └─ lib/
      ├─ auth/AuthContext.tsx
      ├─ progress/
      │  ├─ ProgressContext.tsx  # snapshot, recordAttempt, resume, persistence
      │  ├─ achievements.ts      # 7 predicate-based achievements
      │  └─ types.ts
      ├─ firebase/
      │  ├─ config.ts            # init + isFirebaseConfigured guard
      │  └─ progressService.ts   # Firestore read/write helpers
      ├─ content/
      │  ├─ types.ts             # Problem / Lesson / Course / AnswerConfig
      │  ├─ course.ts            # course assembly + lookups
      │  ├─ boards.ts            # declarative board element helpers
      │  └─ lessons/             # the 5 authored lessons (see below)
      ├─ geometry/
      │  ├─ useJSXGraph.ts       # the single React↔JSXGraph bridge
      │  ├─ board-types.ts       # JSXGraphDef schema
      │  ├─ measure.ts, circleAngles.ts, parallelAngles.ts  # angle math
      └─ grading/algebra.ts      # LaTeX→math.js + symbolic-equivalence check
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
- [x] **One full course**: _Olympiad Geometry — Angle Chasing_, **5 lessons ×
      5 problems = 25 problems**:
      1. `triangle-angle-sum` — Angles in a Triangle
      2. `parallel-lines` — Parallel Lines & Transversals
      3. `inscribed-angle` — The Inscribed Angle Theorem
      4. `cyclic-quadrilaterals` — Cyclic Quadrilaterals
      5. `incenter-lemma` — Incenter & Excenter Lemma
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

- [ ] **Automated tests** — no test runner, no test files, no coverage.
- [ ] **CI / CD** — no `.github/` workflows or other CI config.
- [ ] **Working lint** — see Limitations; ESLint is referenced but unusable as-is.
- [ ] **More than one course** (explicit non-goal for this release).
- [ ] **AI tutor / Socratic hints** (Koji-style) — explanations are static
      authored content.
- [ ] **Streaks, leagues, leaderboards, notifications** (explicit non-goals).
- [ ] **Runtime/CMS content authoring** — content is compiled into the bundle.

---

## 5. Maturity assessment

**Functional MVP, feature-complete against its own PRD.** The full happy path
works end to end: sign up / log in (or play as guest), work through 25
interactive problems across 5 lessons with three distinct answer types, get
diagram-based feedback on mistakes, earn XP and achievements, and have progress
persist and resume. The React↔JSXGraph architecture described in the PRD is
genuinely implemented through the single `useJSXGraph` hook.

It is **early-stage from an engineering-hygiene standpoint**: no tests, no CI,
a broken `lint` script, and (at time of review) the git repository has **no
commits yet**. The product surface is solid; the supporting safety net is not.

---

## 6. Current limitations & known gaps

- **`npm run lint` does not work.** The `lint` script runs `eslint .`, but
  `eslint` is **not listed in `devDependencies`** and there is **no ESLint
  config file** (`eslint.config.js` / `.eslintrc`). Running it will fail until
  ESLint is installed and configured.
- **No tests and no CI.** Nothing guards against regressions — risky for a code
  base whose correctness depends on subtle geometry math (`measure.ts`,
  `circleAngles.ts`, `parallelAngles.ts`) and answer grading (`algebra.ts`).
- **Single hard-coded course.** Adding a _course_ (vs. a lesson) would require
  code changes; `course.ts` exports one `COURSE` constant and much of
  progress/achievements is written against it.
- **Content is build-time only.** Authoring or editing problems requires a code
  change + redeploy; there is no admin UI or CMS.
- **Captured-but-unused learning data.** `problemStats` is persisted but not
  surfaced or acted upon (no spaced repetition, no "your weak spots").
- **Firebase optional but progress sync depends on it.** Without keys the app is
  fully usable in guest mode, but progress is device-local only.
- **Repo state.** A populated `dist/` is present and the working tree is
  untracked/uncommitted; there is no commit history to review.

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
