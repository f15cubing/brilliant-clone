# Security Review — Natural-Language → DDAR (OpenAI) translateStep

**Reviewer:** Admiral Ackbar (security)
**Scope:** the NL→DDAR feature (`functions/**`, `src/lib/freeplay/nl/**`, `src/lib/firebase/config.ts`, `firestore.rules`), with emphasis on OpenAI API-key handling.
**Branch reviewed:** `teamlead/integration` @ `047d6d4` (audited in worktree `ackbar/nl-openai-security-review`).
**Method:** read-only inspection + `git log`/`grep`/`npm audit`. No application code, config, or other docs were modified.

---

## VERDICT

> **YES — WITH CONDITIONS.** The OpenAI path is safe to enable once the user (1) sets the `OPENAI_API_KEY` secret, (2) provisions App Check (reCAPTCHA v3 site key) and deploys, (3) deploys `firestore.rules`, and (4) sets a billing budget/alert. **No Critical or High issue was found in the application code or in production-reachable dependencies.** The API key is handled correctly as a server-only secret and does not reach the client bundle or git.

**Findings by severity:** Critical **0** · High **0** · Medium **2** · Low **3** · Info **5**

The two Medium items are *go-live configuration gaps* (App Check not yet provisioned; no cost/budget cap), not code defects. The High/Critical entries reported by `npm audit` are **dev-tooling only (vitest/vite/esbuild)** and are never shipped or reachable in production — see DEP-1.

---

## Findings table (API-key findings first)

| ID | Severity | Area | File:Line | Description | Remediation |
|----|----------|------|-----------|-------------|-------------|
| **KEY-1** | Info (PASS) | API key | `functions/src/index.ts:35,78,105` | OpenAI key is a server secret via `defineSecret("OPENAI_API_KEY")`, declared in the function's `secrets:[OPENAI_API_KEY]`, and only read at call time with `OPENAI_API_KEY.value()` inside the function body. Never sent to the client. | None. Correct pattern. Keep it. |
| **KEY-2** | Info (PASS) | API key | `package.json:16-26` vs `functions/package.json:16-20` | The `openai` dependency exists **only** in `functions/package.json` (`"openai": "^4.67.3"`). It is absent from the root client `package.json`, so it cannot be bundled by Vite. | None. |
| **KEY-3** | Info (PASS) | API key | repo-wide grep `OPENAI\|apiKey\|sk-\|process.env` | No `VITE_*OPENAI*` var anywhere; no client import of `openai`; no `sk-…` literal in tree or history (`git log -S 'sk-'` returns only a false-positive on the word "risk-taking"). The only `OPENAI*` references are the server secret + docs. | None. |
| **KEY-4** | Info (PASS) | API key | `functions/src/index.ts:108-111` | The catch logs the raw error **server-side only** (`console.error`) and returns a generic `HttpsError("internal", "The translator failed…")` to the client. The key/raw OpenAI error never crosses to the caller. | None. (Optional: scrub logs if Cloud Logging is shared, but Functions logs are not client-visible.) |
| **KEY-5** | Info (PASS) | API key / git | `.gitignore:5-6`, working tree, history | `.gitignore` covers `.env` and `.env.local`. Only `.env.example` is tracked and it contains placeholders only (`your-api-key`, empty reCAPTCHA key) — **no** `OPENAI_API_KEY` line at all (key is never an env file value, it's a Functions secret). No real `.env` exists in the tree; none in history. | None. |
| **APPCHECK-1** | **Medium** | App Check | `src/lib/firebase/config.ts:22,43-58`; `.env.example:18` | App Check initializes **only** when `VITE_FIREBASE_RECAPTCHA_SITE_KEY` is set; it is currently empty. The function has `enforceAppCheck:true` (`index.ts:77`), so this is **fail-closed**: with no site key the client sends no App Check token and the function rejects the call. But until the reCAPTCHA key is provisioned + deployed, the firebase NL backend is effectively unusable (by design). | Provision a reCAPTCHA v3 site key, register it in App Check, set `VITE_FIREBASE_RECAPTCHA_SITE_KEY`, rebuild + deploy. See pre-flight checklist. |
| **COST-1** | **Medium** | DoS / cost | `functions/src/index.ts:79-80`; `functions/src/ratelimit.ts:12` | Good caps: `maxInstances:5`, `timeoutSeconds:30`, per-uid limit 30/min · 300/day. **Residual risk:** the limiter is per-uid, so an attacker who scripts many sign-ups (email/password is enabled, `firebase.json:2-5`) multiplies the daily quota and OpenAI spend. There is no project-level budget cap in code. | Set a GCP **billing budget + alert** and (optionally) an OpenAI org spend limit before go-live. Consider lowering `perDay` initially and/or gating to verified accounts. `maxInstances:5` + 30s timeout bound the blast radius. |
| **RULES-1** | Info (PASS) | Rate-limit integrity | `firestore.rules:14-16` | `match /ratelimits/{document=**} { allow read, write: if false; }` denies **all** client access. Counters are written only by the Admin SDK inside the function's transaction (`index.ts:55-72`), which bypasses rules. A client cannot read or reset its own quota. | None. |
| **AUTH-1** | Info (PASS) | Auth gating | `functions/src/index.ts:83-90`; `src/lib/freeplay/nl/index.ts:14-20` | Function rejects unauthenticated callers (`if (!request.auth) → unauthenticated`) and re-checks `request.app`. Client `getTranslator()` returns the firebase translator only when `VITE_FREEPLAY_NL_BACKEND==="firebase" && isFirebaseConfigured`; guests / unconfigured installs get `LocalMockTranslator` (no network, no key). Guests cannot reach the paid endpoint. | None. |
| **INJECT-1** | Low | Prompt injection | `functions/src/openai.ts:76-80`; `src/components/freeplay/StepBuilder.tsx:562-590`; `src/lib/freeplay/api.ts:43-55` | Untrusted learner text is delimited (`<<< … >>>`) and flagged untrusted in the prompt. The model output is JSON-schema-constrained (enums lock points + relation names), re-validated server-side (`validateResultShape`), re-validated client-side (`descriptorToFact`/`matchPremises`), and the asserted fact is finally routed through the SAME `onAssert → verifyStep → verify()` path as the structured builder. The UI **never auto-accepts** (`NL_AUTO_REPAIR=false`; a human must click "Use"). A hallucinated/injected step that doesn't logically follow is rejected by `verify()`. | **Residual risk = a *valid* but unintended deduction** (the model could produce a correct fact the learner didn't intend). This is a UX/pedagogy concern, not a security one — it cannot inject an unverified step into the proof. Accept. |
| **VALID-1** | Info (PASS) | Output validation | `functions/src/validate.ts:35-68,131-148`; `src/lib/freeplay/nl/map.ts:38-102` | Model output shape is re-checked on the server (points ∈ figure via `pointSet.has`, arity 3..8 for rel, exactly 3 for aval, expr length-capped) **and** independently on the client (arity per `RELS` meta, points ∈ figure, `parseForm` on the expr). No trust is placed in the model's declared shape. | None. |
| **VALID-2** | Low | DoS / input caps | `functions/src/validate.ts:15-22,77-108`; `functions/src/openai.ts:98,107,119` | Strong input caps: `text ≤ 280`, `puzzleId ≤ 64`, `points ≤ 32` each matching `^[A-Za-z][A-Za-z0-9]?$`, `variables ≤ 32`, `established ≤ 256`, premises re-validation capped at 32. The point-label regex is linear (anchored, ≤2 chars) — **no ReDoS**. | None — caps are reasonable. (Note VALID-3.) |
| **VALID-3** | Low | Schema bound | `functions/src/openai.ts:119` | The per-request JSON schema's `premises` array has **no `maxItems`** (only `validateResultShape` caps it at 32 after the call). A pathological model response is still bounded by output tokens and rejected by the 32-cap, so impact is minimal. | Optional hardening: add `maxItems: 32` to the `premises` array in `buildJsonSchema` so the bound is enforced at the model boundary too. |
| **DEP-1** | Low | Dependencies (dev) | root `package.json` devDeps | `npm audit` (root) reports **0 vulnerabilities in production deps** (`--omit=dev`). All 5 findings (1 critical, 1 high, 3 moderate) are **dev/build tooling**: `vitest` GHSA-5xrq-8626-4rwp (critical, UI server file read), `vite` GHSA-fx2h-pf6j-xcff (high, Windows `fs.deny` bypass), esbuild/launch-editor (moderate). These run only on a developer machine during `npm test`/`vite dev`; they are **not shipped to the client and not reachable in production**. | Low urgency. Bump `vitest`/`vite` when convenient (`npm audit fix --force` is a breaking major bump — defer). Do not run the Vitest UI server on an untrusted network. |
| **DEP-2** | Low | Dependencies (functions, prod) | `functions/package.json:17` (`firebase-admin`) | `npm audit --omit=dev` in `functions/` reports **8 moderate, 0 high/critical**, all transitive via `firebase-admin` → `google-gax`/`teeny-request` → `uuid` (GHSA-w5hq-g745-h8pq: missing buffer bounds check in uuid v3/v5/v6 *when a `buf` arg is provided*). Our code never calls uuid with a custom buffer, so it is **not reachable** through our code path. | Low urgency. Update `firebase-admin` to a release pulling fixed transitive deps when available. Not a go-live blocker. |

---

## GO-LIVE PRE-FLIGHT CHECKLIST

Complete **all** of these before enabling the OpenAI path in production:

1. **Set the secret (required):**
   `firebase functions:secrets:set OPENAI_API_KEY` (paste the key when prompted; never put it in `.env` or code).
2. **Install function deps & build (required):**
   `npm --prefix functions install` then `npm --prefix functions run build` (the deploy `predeploy` hook also builds).
3. **Provision App Check (required — APPCHECK-1):**
   Create a **reCAPTCHA v3** key, register the app in Firebase Console → App Check (enforce for Cloud Functions), then set `VITE_FIREBASE_RECAPTCHA_SITE_KEY=<site-key>` in the deploy env.
4. **Flip the backend flag (required):**
   Set `VITE_FREEPLAY_NL_BACKEND=firebase` (plus the existing `VITE_FIREBASE_*` config) and **rebuild** the client (`npm run build`).
5. **Deploy Firestore rules (required — RULES-1):**
   `firebase deploy --only firestore:rules` so `ratelimits/**` is locked (`allow … if false`). Verify in the console that the deployed rules match `firestore.rules`.
6. **Deploy the function (required):**
   `firebase deploy --only functions` — confirm `translateStep` shows `enforceAppCheck` enabled and the `OPENAI_API_KEY` secret bound.
7. **Set a cost guardrail (required — COST-1):**
   Configure a **GCP billing budget + alert**; optionally set an OpenAI org monthly spend cap. Consider starting with a lower `perDay` rate-limit until usage is observed.
8. **Smoke test fail-closed behavior (recommended):**
   - Signed-out user → NL panel uses the mock (no function call).
   - Signed-in user without a valid App Check token → call is rejected (`failed-precondition`/App Check).
   - Confirm a deliberately wrong NL step is rejected by `verify()` (not silently accepted).

---

## Things I could NOT verify (out of scope or not testable here)

- **Live OpenAI behavior / actual token output:** the function was not invoked against the real OpenAI API (no key present; unit tests use an injected fake client). I verified the *code path and constraints*, not a live response.
- **Deployed configuration:** I cannot confirm the Firebase project's *deployed* rules, App Check enforcement state, secret presence, or billing budget — those live in the Firebase/GCP console. The checklist above must be executed and confirmed there.
- **reCAPTCHA provisioning status:** `VITE_FIREBASE_RECAPTCHA_SITE_KEY` is empty in `.env.example`; whether a real key has been created/registered is unknown (APPCHECK-1).
- **`users/{uid}/freeplayProofs/**` rules:** flagged for the record only — a separate in-flight feature will add this subtree. Its rules **must be owner-only** (matching the existing `users/{userId}/{document=**}` owner check at `firestore.rules:4-9`). I did **not** review that unmerged code.
- **`npm audit` completeness:** advisories reflect the registry at audit time; re-run before each deploy.
