# Interactive Olympiad Geometry

[![CI](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml)

A Brilliant-style interactive learning app for introductory geometry (Angle Chasing). Every problem features a draggable geometric construction — drag the triangle and watch the theorem hold. A second **Competitive Freeplay** mode lets you build machine-checked, multi-step proofs validated by a from-scratch DDAR proof-checker.

> **Status:** functional MVP — one full course (7 lessons, 44 solvable steps), three answer types, auth, and progress sync, **plus a Competitive Freeplay proof mode** backed by a TypeScript DDAR engine (38 deduction rules incl. a length/ratio layer, 20 curated puzzles, optional natural-language step input, and a per-user proof archive), and an interactive **Sketch Sandbox**. Engineering baseline in place (lint + CI + a Vitest suite of 1,100+ tests wired into CI covering the Freeplay engine, the rule lab, and the course-app pure logic). Component/UI tests are the main remaining gap. See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for a full feature breakdown.

## Documentation

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) — tech stack, architecture, full feature inventory, and current limitations.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — prioritized near-/mid-/long-term expansion opportunities.
- [`docs/FREEPLAY_EXPLAINER.md`](docs/FREEPLAY_EXPLAINER.md) — a plain-language explainer of the DDAR proof-checker and the natural-language step parser (start here).
- [`docs/DDAR_ENGINE.md`](docs/DDAR_ENGINE.md) — the developer reference for the DDAR engine internals, design notes, and known limitations.
- [`docs/NL_GOLIVE.md`](docs/NL_GOLIVE.md) — how to switch the natural-language step input from the offline mock to the live OpenAI path.
- [`docs/PRD-competitive-freeplay.md`](docs/PRD-competitive-freeplay.md) — the Competitive Freeplay proof mode + DDAR engine design (historical draft).
- [`research/freeplay-rules/README.md`](research/freeplay-rules/README.md) — the isolated lab for discovering & testing new DDAR deduction rules against contest problems.
- [`PRD.md`](PRD.md) — original product requirements.
- [`BRAINLIFT.md`](BRAINLIFT.md) — research on Brilliant.org and the learning science behind the design.
- [`BRAINLIFT-freeplay.md`](BRAINLIFT-freeplay.md) — the pedagogy thesis behind Freeplay (grading reasons, not answers).

## Stack

- **Vite + React + TypeScript + Tailwind CSS**
- **JSXGraph** — interactive geometry (`useJSXGraph` hook)
- **MathLive + math.js** — algebraic answer input and equivalence checking
- **KaTeX** — math rendering
- **Firebase Auth + Firestore** — accounts and progress persistence
- **Vitest** — test suite (`npm test`, in CI); covers the Freeplay DDAR engine, the rule lab, and the course-app pure logic
- **Custom DDAR proof-checker** (`src/lib/freeplay/`) — from-scratch deductive-database + directed-angle algebra (`AngleAR`) + a length/ratio table (`LengthAR`) for Competitive Freeplay

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app runs in **guest mode** with no configuration — progress is saved to `localStorage`.

### Firebase setup (optional for local dev)

Firebase enables accounts and cross-device sync. Without it, the app runs in guest mode.

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Email/Password** authentication.
3. Create a **Cloud Firestore** database.
4. Copy `.env.example` to `.env` and fill in your web app config keys.
5. Deploy Firestore rules (see `firestore.rules`).

```bash
cp .env.example .env
# edit .env with your keys
npm run dev
```

## Routes

| Path | Description |
|------|-------------|
| `/login`, `/signup` | Email/password auth |
| `/` | Dashboard — XP, progress, achievements, continue learning |
| `/course` | Lesson map with completion state |
| `/lesson/:lessonId` | Interactive problem player |
| `/freeplay` | Competitive Freeplay — puzzle catalog |
| `/freeplay/:puzzleId` | Proof environment (DDAR-checked multi-step proofs) |
| `/proofs` | Proof archive — your saved machine-checked proofs |
| `/sketch`, `/sketch/:id` | Interactive geometry sketch sandbox |

## Adding lessons

Lessons are data-driven TypeScript in `src/lib/content/lessons/`. Register a new lesson in `src/lib/content/course.ts`.

Each `Problem` specifies:

- `boardConfig` — declarative JSXGraph construction (see `src/lib/content/boards.ts` helpers)
- `answerConfig` — `multiple-choice`, `algebraic`, or `geometric`
- `explanations[]` — wrong-answer text + optional `boardOverlayConfig` drawn on the learner's current board

## Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run dev` | `vite` | Start the dev server (http://localhost:5173) |
| `npm run build` | `tsc --noEmit && vite build` | Type-check, then bundle to `dist/` |
| `npm run preview` | `vite preview` | Serve the production build locally |
| `npm test` | `vitest run` | Run the test suite once |
| `npm run test:watch` | `vitest` | Run tests in watch mode |
| `npm run deploy` | build + `firebase-tools ... deploy --only hosting` | Build and deploy to Firebase Hosting |
| `npm run lint` | `eslint .` | Lint the project (flat config in `eslint.config.js`) |

## Build & deploy

```bash
npm run build
npm run deploy   # builds, then deploys hosting via firebase-tools
```

> Deploying requires a real Firebase project id in `.firebaserc` (the committed value is a placeholder).

## Course content

7 lessons, 44 solvable steps (interactive problems plus direct-instruction and comprehension stages):

1. Angles in a Triangle (6)
2. Parallel Lines & Transversals (6)
3. The Inscribed Angle Theorem (6)
4. Cyclic Quadrilaterals (6)
5. The Incenter–Excenter Lemma (10)
6. The Orthocenter Exists (6)
7. Orthocenter = Incenter of the Orthic Triangle (4)

## Competitive Freeplay (proof mode)

`/freeplay` turns the app into a proof environment. Each of the **20 curated
puzzles** (intro → core → challenge, incl. literal contest citations up to full
IMO-level problems) gives a fixed figure, a
set of premises, and a goal; you build a proof step by step by citing facts and
applying named theorems. Every step is machine-checked by a from-scratch **DDAR**
proof-checker (`src/lib/freeplay/`): a step is accepted only if it is numerically
true across **several independent realizations** of the figure and follows from
the cited premises by a single deduction rule or one angle/length algebra step —
and citing an unnecessary premise is rejected. You can build steps with the
structured builder or, optionally, by typing them in **natural language** (a
deterministic offline mock by default; an OpenAI-backed path is available behind a
flag — see [`docs/NL_GOLIVE.md`](docs/NL_GOLIVE.md)) — the translation is always
re-checked by the same verifier, so the translator has no authority.

For the engine's design and known limitations, see
[`docs/DDAR_ENGINE.md`](docs/DDAR_ENGINE.md).

New deduction rules are not developed directly in `src/`. They are prototyped,
unit-tested, and play-tested against real contest problems in the isolated
[`research/freeplay-rules/`](research/freeplay-rules/) lab (outside the shipped
bundle), then promoted into the engine if desired. Run the whole test suite with
`npm test`.
