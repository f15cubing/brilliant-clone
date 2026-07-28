# Interactive Olympiad Geometry

[![CI](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml)

A geometry proof checker written from scratch in TypeScript, and the learning app
built on top of it. You prove olympiad problems one step at a time and a machine
decides whether each step holds.

## The engine

[`src/lib/freeplay/`](src/lib/freeplay/) implements DDAR (Deductive Database +
Algebraic Reasoning), the symbolic method behind DeepMind's AlphaGeometry. There
is no external solver and no Python in the loop. `ar.ts` follows the design of
AlphaGeometry's `ar.py`: Gaussian elimination over exact rationals on directed
angles mod 180°. `lengths/lengthAR.ts` does the same over log-distances, which
turns length and ratio chasing into linear algebra.

You claim a geometric fact and cite the facts it follows from. The engine accepts
the step only if all three of these hold:

1. **It is true in five different figures.** Every puzzle ships a parametric
   `construct(rng)` that resamples a generic figure satisfying the givens. A
   claim that fails in any sample is rejected, so a coincidence in the diagram on
   screen earns nothing.
2. **It is one step.** The claim has to follow from the cited facts by a single
   deduction rule, one directed-angle algebra step, or one length-ratio algebra
   step.
3. **Every citation does work.** Drop any premise you cited and the step must
   break. Citing a superset is rejected.

The rule library holds 38 rules: 29 over angles and incidence (13 hand-written,
16 promoted from the research lab) and 9 over lengths and ratios.

This is a checker, not a solver. It will not search for your proof, invent an
auxiliary point, or compute the deductive closure of a figure. Those bounds are
deliberate and [`docs/DDAR_ENGINE.md`](docs/DDAR_ENGINE.md) says where they sit.

### Watch it check a real proof

```bash
npm install
npx vitest run src/lib/freeplay/__tests__/imo2019p2.test.ts
```

That test feeds the published solution to IMO 2019 Problem 2 through the shipped
`verify()`, one step at a time, and asserts that dropping any cited premise
breaks the step it belongs to. Sibling tests cover the 2024 IMO Shortlist G1–G5.
G1, G2 and G4 verify end to end; G3 and G5 stop at a documented gap where the
official proof needs an auxiliary construction the engine cannot invent.

### Where new rules come from

Rules do not get written straight into `src/`. They are prototyped, unit-tested,
and played against real contest problems in
[`research/freeplay-rules/`](research/freeplay-rules/), which sits outside the
shipped bundle, and promoted into `src/lib/freeplay/rules/` once they hold up.

### Reading order

Start with [`docs/FREEPLAY_EXPLAINER.md`](docs/FREEPLAY_EXPLAINER.md) for a
plain-language tour of the checker and the step parser. Then
[`docs/DDAR_ENGINE.md`](docs/DDAR_ENGINE.md) for the internals, the design notes,
and the known limitations.

## The app

Two surfaces sit on the engine.

**Freeplay** (`/freeplay`) is the proof environment: 20 curated puzzles running
from a first inscribed-angle exercise up to the IMO Shortlist. Each gives you a
figure, a set of premises, and a goal. You build the proof by citing facts and
naming theorems, either in the structured builder or by typing the step in
English. The translator holds no authority; whatever it produces goes back
through the same `verify()`. It runs on a deterministic offline mock by default,
with an OpenAI path behind a flag (see [`docs/NL_GOLIVE.md`](docs/NL_GOLIVE.md)).

**The course** (`/course`) teaches angle chasing the way Brilliant does: 7
lessons, 44 solvable steps, each built on a draggable JSXGraph construction. Drag
a vertex and the theorem still holds.

1. Angles in a Triangle (6)
2. Parallel Lines & Transversals (6)
3. The Inscribed Angle Theorem (6)
4. Cyclic Quadrilaterals (6)
5. The Incenter–Excenter Lemma (10)
6. The Orthocenter Exists (6)
7. Orthocenter = Incenter of the Orthic Triangle (4)

Answers come in three types (multiple choice, algebraic, geometric), progress
syncs through Firebase when it is configured, and `/proofs` keeps every
machine-checked proof you have finished. `/sketch` is a free-form construction
sandbox with no grading attached.

### Routes

| Path | Description |
|------|-------------|
| `/login`, `/signup` | Email/password auth |
| `/` | Dashboard: XP, progress, achievements, continue learning |
| `/course` | Lesson map with completion state |
| `/lesson/:lessonId` | Interactive problem player |
| `/freeplay` | Puzzle catalog |
| `/freeplay/:puzzleId` | Proof environment (DDAR-checked multi-step proofs) |
| `/proofs` | Proof archive: your saved machine-checked proofs |
| `/sketch`, `/sketch/:id` | Interactive geometry sketch sandbox |

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). With no configuration the
app runs in guest mode and saves progress to `localStorage`.

### Firebase setup (optional)

Firebase adds accounts and cross-device sync.

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable Email/Password authentication.
3. Create a Cloud Firestore database.
4. Copy `.env.example` to `.env` and fill in your web app config keys.
5. Deploy the Firestore rules in `firestore.rules`.

```bash
cp .env.example .env
# edit .env with your keys
npm run dev
```

## Stack

- **Vite + React + TypeScript + Tailwind CSS**
- **JSXGraph** for the interactive constructions (`useJSXGraph` hook)
- **MathLive + math.js** for algebraic answer input and equivalence checking
- **KaTeX** for math rendering
- **Firebase Auth + Firestore** for accounts and progress
- **Vitest** for the test suite: 1,184 tests across 119 files, covering the
  engine, the rule lab, and the course-app logic. Component and UI tests are the
  gap.

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Start the dev server (http://localhost:5173) |
| `npm run build` | `tsc --noEmit && vite build` | Type-check, then bundle to `dist/` |
| `npm run preview` | `vite preview` | Serve the production build locally |
| `npm test` | `vitest run` | Run the test suite once |
| `npm run test:watch` | `vitest` | Run tests in watch mode |
| `npm run lint` | `eslint .` | Lint the project (flat config in `eslint.config.js`) |
| `npm run deploy` | build + `firebase-tools ... deploy --only hosting` | Build and deploy to Firebase Hosting |

Deploying needs a real Firebase project id in `.firebaserc`; the committed value
is a placeholder.

## Adding lessons

Lessons are data-driven TypeScript in `src/lib/content/lessons/`. Register a new
one in `src/lib/content/course.ts`. Each `Problem` specifies:

- `boardConfig`, a declarative JSXGraph construction (helpers in
  `src/lib/content/boards.ts`)
- `answerConfig`, one of `multiple-choice`, `algebraic`, or `geometric`
- `explanations[]`, wrong-answer text plus an optional `boardOverlayConfig` drawn
  on the learner's current board

## Further documentation

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md): architecture, feature
  inventory, current limitations.
- [`docs/ROADMAP.md`](docs/ROADMAP.md): what comes next, in priority order.
- [`docs/PRD-competitive-freeplay.md`](docs/PRD-competitive-freeplay.md): the
  original design for the proof mode and the engine.
- [`PRD.md`](PRD.md): the original product requirements for the course app.
- [`BRAINLIFT.md`](BRAINLIFT.md): research on Brilliant.org and the learning
  science behind the course design.
- [`BRAINLIFT-freeplay.md`](BRAINLIFT-freeplay.md): the argument for grading
  reasons instead of answers.
