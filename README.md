# Interactive Olympiad Geometry

[![CI](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml)

A Brilliant-style interactive learning app for introductory geometry (Angle Chasing). Every problem features a draggable geometric construction — drag the triangle and watch the theorem hold. A second **Competitive Freeplay** mode lets you build machine-checked, multi-step proofs validated by a from-scratch DDAR proof-checker.

> **Status:** functional MVP — one full course (5 lessons × 5 problems), three answer types, auth, and progress sync, **plus a Competitive Freeplay proof mode** backed by a TypeScript DDAR engine. Engineering baseline in place (lint + CI + 0 audit vulnerabilities) and a **Vitest suite** covering the Freeplay engine; widening test coverage to the course app and wiring `npm test` into CI is the main remaining gap. See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for an honest breakdown.

## Documentation

- [`docs/teamlead/ENGINEERING_REPORT.md`](docs/teamlead/ENGINEERING_REPORT.md) — latest engineering report + roadmap, the API-key go-live TODO, and a hands-on "try it out" QA guide.
- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) — tech stack, architecture, full feature inventory, and current limitations.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — prioritized near-/mid-/long-term expansion opportunities.
- [`docs/PRD-competitive-freeplay.md`](docs/PRD-competitive-freeplay.md) — the Competitive Freeplay proof mode + DDAR engine design.
- [`research/freeplay-rules/README.md`](research/freeplay-rules/README.md) — the isolated lab for discovering & testing new DDAR deduction rules against contest problems.
- [`PRD.md`](PRD.md) — original product requirements.
- [`BRAINLIFT.md`](BRAINLIFT.md) — research on Brilliant.org and the learning science behind the design.

## Stack

- **Vite + React + TypeScript + Tailwind CSS**
- **JSXGraph** — interactive geometry (`useJSXGraph` hook)
- **MathLive + math.js** — algebraic answer input and equivalence checking
- **KaTeX** — math rendering
- **Firebase Auth + Firestore** — accounts and progress persistence
- **Vitest** — test suite (`npm test`); covers the Freeplay DDAR engine + rule lab
- **Custom DDAR proof-checker** (`src/lib/freeplay/`) — from-scratch deductive-database + directed-angle algebra for Competitive Freeplay

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Firebase setup (optional for local dev)

Without Firebase, the app runs in **guest mode** with progress saved to `localStorage`.

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

## Course content

5 lessons, 5 problems each:

1. Angles in a Triangle
2. Parallel Lines & Transversals
3. The Inscribed Angle Theorem
4. Cyclic Quadrilaterals
5. Incenter & Excenter Lemma

## Competitive Freeplay (proof mode)

`/freeplay` turns the app into a proof environment. Each puzzle gives a fixed
figure, a set of premises, and a goal; you build a proof step by step by citing
facts and applying named theorems. Every step is machine-checked by a
from-scratch **DDAR** proof-checker (`src/lib/freeplay/`): a step is accepted
only if it is numerically true in the figure and follows from **exactly** the
cited premises by a single deduction rule or directed-angle algebra step.

New deduction rules are not developed directly in `src/`. They are prototyped,
unit-tested, and play-tested against real IMO/USAMO problems in the isolated
[`research/freeplay-rules/`](research/freeplay-rules/) lab (outside the shipped
bundle), then promoted into the engine if desired. Run the whole test suite with
`npm test`.
