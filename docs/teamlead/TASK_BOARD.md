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
| A1 | DDAR Investigation | readonly | Deep technical audit | ✅ DONE → `docs/DDAR_ENGINE.md` |
| A2 | Security | readonly | Full security audit | ✅ DONE → `docs/SECURITY_AUDIT.md` |
| A3 | Math Discovery | worktree (writes) | Close the Simson–Wallace line gap | ✅ DONE → MERGED (278 tests green) |
| A4 | Quality/CI | worktree (writes) | Course-app pure-logic tests + wire `npm test` into CI | ✅ DONE → MERGED (351 tests green, CI runs tests) |

| P1 | NL→DDAR Planning | readonly | Design + impl plan for NL step input | ✅ DONE → `docs/design/NL_TO_DDAR.md` |
| P2 | Olympiad/Rules Planning | readonly | Rule-promotion + olympiad problem slate plan | ✅ DONE → `docs/design/OLYMPIAD_RULES_ROADMAP.md` |

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

## Implementation wave (launched; isolated worktrees, non-overlapping lanes)

User greenlit ALL tracks in parallel, incl. ratio subsystem + LITERAL contest citations.
Base prep: refactored `RULES = [...CORE_RULES, ...PROMOTED_RULES]` so promotions own
`rules/index.ts` (no shared-file conflict). Merge order plan: R → B → (N independent) → C;
Wave 2 converts vetted problems → shipped puzzles after R+B land.

| ID | Track | Lane (only) | Task |
|----|-------|-------------|------|
| R | Olympiad rules | `freeplay/rules/**`, `freeplay/__tests__/**` | promote 11 Tier-A rules (A1–A11) |
| B | Ratio subsystem | `dsl.ts`,`verify.ts`,`check.ts`,`lengths/**`,`rules.ts`(spread only),`__tests__/**` | Tier C guard + eqratio/LengthAR + 4 ratio rules |
| N | NL input | `nl/**`,`StepBuilder`,`FreeplayArena`,`config.ts`,`functions/**`,`firebase.json`,`firestore.rules`,`.env.example`,`vite-env.d.ts`,`tsconfig`(exclude) | per-step NL→DDAR, mock-default + Firebase Function scaffold |
| C | Contest content | `research/problems/**`, `research/findings/contest-problems.md` | 6–8 real contest problems w/ literal citations, replay-verified |
| G | Integration cleanup | 14 existing research test files (listed) | retire 15 obsolete "GAP" guards made false by R's promotion (convert to positive "now shipped" checks) |

**Status note:** R ✅ + G ✅ + N ✅ + B ✅ + C ✅ ALL MERGED — **full suite GREEN: 528 tests / 63 files, tsc clean.**
- R: 11 Tier-A rules shipped. G: obsolete GAP guards → positive "now promoted" checks.
- N: NL step input (mock-default + Firebase Function scaffold w/ Auth+App Check; OpenAI key
  server-side only; verify() stays source of truth; +27 client tests, 18 fn tests under own runner).
  To go live: set OPENAI_API_KEY secret, install functions deps, provision reCAPTCHA/App Check,
  set VITE_FREEPLAY_NL_BACKEND=firebase. Until then deterministic mock is the default.
- B: LENGTH/RATIO subsystem (eqratio + LengthAR + 4 ratio rules), composed at the verify layer
  (`ALL_RULES`) per the research `lengths/verify.ts` design — shipped `RULES` stays angle-only, so
  no research GAP cleanup was needed. **Integration-time soundness fix (TL):** `sas_similarity`
  validated its second SAS side ratio against COORDINATES, so in a congruent figure it bridged
  from the included angle alone and (with a cited cong) "proved" the third side — a non-sequitur
  that broke R's `sas_congruence`/`sas_shared_vertex` minimality. Fixed by threading cited
  `eqratio` premises via `RuleCtx.citedRatios` and requiring the side ratio to be CITED; added a
  cross-rule soundness regression test. (Disconnect recovery: B + C survived as committed branches;
  C's work was uncommitted in its worktree and was recovered — no work lost.)
- C: 6 real contest problems w/ literal citations (ISL 2010 G1, JBMO SL 2004/2010/2015 G,
  arc-midpoint lemma, squares-on-two-sides), all replay-verified in the research lab.
Next: Wave 2 (convert vetted problems → shipped puzzles) + final engineering report.

## Completed work

- Repository protection + green baseline.
- A1 DDAR audit → permanent doc `docs/DDAR_ENGINE.md` (verified against source by Team Lead).
- A2 security audit → permanent doc `docs/SECURITY_AUDIT.md`.
- A3 Simson-line closure → **MERGED** to integration; new sound `coincident_direction_collinear`
  rule (reviewed by TL); research lab now 13→14 rules, Simson proves end-to-end; 278 tests green.
- P1 NL→DDAR design → permanent spec `docs/design/NL_TO_DDAR.md` (approved for implementation).
- A4 course-app pure-logic tests (73) + `npm test` in CI → **MERGED** (351 tests green, tsc clean).
- P2 olympiad/rule-promotion plan → permanent spec `docs/design/OLYMPIAD_RULES_ROADMAP.md`.
- **ALL 6 Wave-1/planning agents complete.** Integration branch: 351 tests, tsc clean, master unchanged.

## Blocked work

- (none yet)

## Pending / backlog

- Wire `npm test` into CI (`.github/workflows/ci.yml`) — known top gap.
- Course-app pure-logic tests (grading/algebra, geometry/measure, circleAngles, parallelAngles, progress reducer).
- Further DDAR research gaps: numeric-constant ratios (`log 2` generator), Menelaus/Ceva (signed ratios), external division (signed Thales).

## Discovered risks

- **[High]** Firestore rules have no field validation → XP/achievements forgeable by
  any authed user on their own doc (cosmetic today; blocker before leaderboards/comp).
- **[Med]** mathjs `evaluate()` on user LaTeX (client-side self-DoS / sandbox concern).
- **[Med]** No CSP/security headers; no App Check (App Check is a prerequisite for the
  planned NL→DDAR Cloud Function).
- **[Med]** Progress-write race conditions (last-write-wins).
- **[Eng]** Shipped `canonicalKey` THROWS on an `eqratio`-shaped fact — must be guarded
  BEFORE promoting any ratio rule (directly affects the olympiad-problem initiative).

## New opportunities / research directions

- Simson line closure (in progress, A3).
- Catalog of which classical theorems are AR-derivable vs. need new rules.

## Leadership summaries

- See `docs/teamlead/LEADERSHIP_LOG.md`.
