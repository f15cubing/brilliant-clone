# Security Audit — Interactive Olympiad Geometry

_Read-only static audit (source + config + `npm audit`). Architecture: Vite + React
+ TypeScript SPA; Firebase Auth + Cloud Firestore as the only backend; a client-side
geometry proof engine. This audit did **not** live-test Firestore rules, the Firebase
console settings, or mathjs sandbox escapes — validate those in staging before any
launch involving competitive or synced progress._

## Executive summary

| # | Severity | Title | Location |
|---|----------|-------|----------|
| 1 | **High** | Firestore rules allow XP / achievement forgery (no field validation) | `firestore.rules:4-9`, `progressService.ts:87-97` |
| 2 | **High** | Progress integrity is entirely client-trusted | `ProgressContext.tsx:202-277`, `firestore.rules:5` |
| 3 | **Medium** | mathjs `evaluate()` on user-derived expressions | `algebra.ts:57-58`, `ProblemPlayer.tsx:92` |
| 4 | **Medium** | Missing HTTP security headers (no CSP, HSTS, etc.) | `firebase.json:7-11` |
| 5 | **Medium** | Production misconfig enables full guest mode (no auth) | `ProtectedRoute.tsx:21`, `config.ts:17` |
| 6 | **Medium** | Progress persistence race conditions (lost updates) | `ProgressContext.tsx:202-274, 281-312` |
| 7 | **Low** | Hardcoded admin email in source | `AuthContext.tsx:19-20` |
| 8 | **Low** | Weak client-side password policy (6 chars) | `Signup.tsx:29-31` |
| 9 | **Low** | No Firebase App Check / abuse controls | `config.ts` |
| 10 | **Low** | Future backend API may accept unauthenticated calls | `api.ts:25-30` |
| 11 | **Info** | Route protection is UI-only (expected for a Firebase SPA) | `ProtectedRoute.tsx:11-22` |
| 12 | **Info** | Firebase web config keys are public by design (not a leak) | `.env.example`, `config.ts:8-15` |
| 13 | **Info** | DevPanel correctly excluded from production | `FreeplayArena.tsx:169-178` |
| 14 | **Info** | No XSS sinks found (`dangerouslySetInnerHTML`, `eval`, …) | repo-wide |
| 15 | **Info** | Dev-only npm audit findings (not in production bundle) | `npm audit` |

## Highest-priority findings

### 1–2 (High) — Client-trusted progress; Firestore rules lack field validation
`firestore.rules` checks **only** `request.auth.uid == userId` with no schema/type/
range validation, so an authenticated user can `setDoc` arbitrary `totalXp`,
achievements, or junk fields to their own document. Per-user isolation is correct and
default-deny is in place (no cross-user access), but all gamification data is
**forgeable**, and reconciliation (`reconcile.ts:27-28,59`) intentionally never claws
back XP/achievements. Today XP is cosmetic; this becomes important the moment XP feeds
leaderboards, competitive features, or reporting.
**Remediation:** validate writes server-side (Cloud Function or service-account-only
writes for XP/achievements), restrict client writes with `keys().hasOnly([...])` +
type/range checks, and cap document size.

### 3 (Medium) — mathjs `evaluate()` on user LaTeX
`algebra.ts:57-58` runs `evaluate()` on a string derived from MathLive LaTeX answer
input. mathjs has a history of sandbox-escape issues; impact here is **client-side
self-affecting** (tab hang / script in the user's own context), not cross-user/stored.
**Remediation:** restrict mathjs to a minimal arithmetic-only function set
(`create, all` subset) or use `parse` + a custom evaluator, and length-cap answers.

### 4 (Medium) — Missing security headers + 9 (Low) no App Check
`firebase.json` has no `headers` block (no CSP/HSTS/X-Frame-Options/etc.) and no
Firebase App Check is initialized. Both are defense-in-depth gaps; App Check matters
especially before exposing **any server endpoint** (see the planned NL→DDAR Cloud
Function — it must enforce Auth + App Check).

### 5–6 (Medium) — Guest-mode misdeploy; progress write races
A production build without `VITE_FIREBASE_*` ships with no auth (guest mode) — add a
CI/build guard. `recordAttempt`/`updateLessonPosition` read-modify-write a shared
snapshot with last-write-wins under rapid submits — serialize writes or use Firestore
transactions / `increment()`.

## Confirmed non-issues (avoid false alarms)

- **Firebase web API keys in the bundle are public by design** — not a secret leak;
  security relies on console domain/API-key restrictions, Auth settings, rules, App
  Check.
- **Client-side `ProtectedRoute`** is the normal SPA pattern; Firestore rules are the
  real authz boundary.
- **No committed secrets** (no service accounts/PEM/tokens; `.env` gitignored).
- **No XSS sinks** (`dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` absent).
- **DevPanel** is stripped from production via `import.meta.env.DEV`.
- **`parseForm`/`parseSwaps`** are bounded linear parsers (no ReDoS); the proof
  verifier loops are bounded (`MAX_COLL = 8`, fixed `RULES`).
- **Production `npm audit` = 0**; the 5 findings are dev-toolchain only (esbuild/vite/
  vitest), not in the shipped `dist/`.

## Prioritized remediation roadmap

1. **Immediate:** server-validate XP/achievement writes or tighten Firestore rules (#1–2).
2. **Short-term:** restrict mathjs to a safe subset (#3); add Hosting security headers (#4); CI guard that prod builds include Firebase config (#5).
3. **Medium-term:** serialize progress writes / transactions (#6); enable App Check (#9) — **prerequisite for the NL→DDAR Cloud Function**.
4. **Ongoing:** keep deps updated; treat dev-toolchain audit findings separately; move the admin email to custom claims/Remote Config (#7).
