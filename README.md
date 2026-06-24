# Interactive Olympiad Geometry

[![CI](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/f15cubing/brilliant-clone/actions/workflows/ci.yml)

A Brilliant-style interactive learning app for olympiad geometry (EGMO Chapter 1: Angle Chasing). Every problem features a draggable geometric construction — drag the triangle and watch the theorem hold.

> **Status:** functional MVP — one full course (5 lessons × 5 problems), three answer types, auth, and progress sync. Engineering baseline in place (lint + CI + 0 audit vulnerabilities); **automated tests are the main remaining gap**. See [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) for an honest breakdown.

## Documentation

- [`docs/PROJECT_STATUS.md`](docs/PROJECT_STATUS.md) — tech stack, architecture, full feature inventory, and current limitations.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — prioritized near-/mid-/long-term expansion opportunities.
- [`PRD.md`](PRD.md) — original product requirements.
- [`BRAINLIFT.md`](BRAINLIFT.md) — research on Brilliant.org and the learning science behind the design.

## Stack

- **Vite + React + TypeScript + Tailwind CSS**
- **JSXGraph** — interactive geometry (`useJSXGraph` hook)
- **MathLive + math.js** — algebraic answer input and equivalence checking
- **KaTeX** — math rendering
- **Firebase Auth + Firestore** — accounts and progress persistence

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
