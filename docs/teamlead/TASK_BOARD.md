# Team Lead — Living Task Board

_Session start: Fri Jun 26, 2026. Integration branch: `teamlead/integration` (based on
`feat/competitive-freeplay`, which is where the DDAR system lives). Primary branch `master`
is untouched for the entire session._

## Baseline (captured at session start)

- Tests: **270 passing / 30 files** (`npx vitest run`).
- `npm audit --omit=dev`: **0 vulnerabilities**.
- Typecheck/build: project builds (`tsc --noEmit && vite build`) — to be re-verified after merges.
- Working tree: clean on `feat/competitive-freeplay` (skill folders untracked, ignored).

## Branch / merge status

| Branch | Purpose | Status |
|--------|---------|--------|
| `master` | primary | UNTOUCHED (protected) |
| `feat/competitive-freeplay` | upstream feature branch w/ DDAR | base for integration |
| `teamlead/integration` | Team Lead integration | active |

## Active agents

| ID | Team | Mode | Task | Status |
|----|------|------|------|--------|
| A1 | DDAR Investigation | readonly | Deep technical audit: architecture, algorithms, data flow, verifier/AR internals, soundness, doc-vs-impl gaps, tech debt, missing functionality | running |
| A2 | Security | readonly | Full security audit (auth, Firestore rules, deps, secrets, injection, DoS, insecure defaults, input validation) | running |
| A3 | Math Discovery | worktree (writes) | Close the Simson–Wallace line gap: implement the `coincident-direction ⇒ collinear` bridge rule in `research/freeplay-rules/`, prove it end-to-end, document | running |
| A4 | Quality/CI | worktree (writes) | Add course-app pure-logic Vitest tests (grading/algebra, geometry math, progress reducer, achievements) + wire `npm test` into CI | running |

| P1 | NL→DDAR Planning | readonly | Design doc + impl plan for natural-language step input (Translator iface, OpenAI-via-Firebase-Function, App Check, mock translator, verify-as-truth, repair UX, tests) | running |
| P2 | Olympiad/Rules Planning | readonly | Plan: ordered research-rule promotion (easy wins vs ratio subsystem) + ~6-8 graded olympiad problem slate w/ sources & required rules | running |

Team Lead has independently read `verify.ts`, `dsl.ts`, `ar.ts`, `geom.ts` to enable
critical review of A1 (architecture) and A3 (new rule soundness). Confirmed AR's
`equation()` returns null for coll/cong/cyclic/midp (ar.ts:316) — A3's gap is real.

## New product direction (user, ~10:58)

Two initiatives, to be PLANNED with the team then implemented:
1. **Olympiad problems** — author ~6-8 graded olympiad Freeplay problems. Strategy:
   PROMOTE proven research-lab rules into the shipped engine first, then author.
2. **Natural-language Freeplay input** — per-step NL → AI → DDAR structured step →
   existing `verify()` (verifier stays sole source of truth). UX: augment (toggle)
   alongside StepBuilder. Backend: provider-agnostic `Translator`; production path =
   Firebase Cloud Function holding the OpenAI key server-side (Auth + App Check),
   with a deterministic local mock translator until the key is wired.

## Completed work

- Repository protection + green baseline.

## Blocked work

- (none yet)

## Pending / backlog

- Wire `npm test` into CI (`.github/workflows/ci.yml`) — known top gap.
- Course-app pure-logic tests (grading/algebra, geometry/measure, circleAngles, parallelAngles, progress reducer).
- Further DDAR research gaps: numeric-constant ratios (`log 2` generator), Menelaus/Ceva (signed ratios), external division (signed Thales).

## Discovered risks

- (to be populated by Security Team)

## New opportunities / research directions

- Simson line closure (in progress, A3).
- Catalog of which classical theorems are AR-derivable vs. need new rules.

## Leadership summaries

- See `docs/teamlead/LEADERSHIP_LOG.md`.
