# Enabling the live OpenAI natural-language path

Natural-language step input ships **off**: by default Freeplay uses a deterministic
offline mock translator (`src/lib/freeplay/nl/mock.ts`), so there is no OpenAI
dependency, no key, and no spend. The mock — like the live path — proposes only a
structured step that is re-checked by the same `verify()` gate, so the translator
never has authority to accept a step.

To switch on the live OpenAI-backed path, complete **all** of the steps below. They
mirror the pre-flight in [`security/NL_OPENAI_REVIEW.md`](./security/NL_OPENAI_REVIEW.md).
The live path is signed-in only, App Check-enforced, rate-limited per user, and
holds the key as a server secret.

1. **Set the OpenAI key as a server secret** (never in `.env` or code):
   ```bash
   firebase functions:secrets:set OPENAI_API_KEY
   # paste the key (sk-…) when prompted
   ```
2. **Install + build the functions package:**
   ```bash
   npm --prefix functions install
   npm --prefix functions run build
   ```
3. **Provision App Check.** Create a reCAPTCHA site key, register the web app in
   Firebase Console → App Check (enforce for Cloud Functions), then set the site key
   in your deploy env:
   ```bash
   VITE_FIREBASE_RECAPTCHA_SITE_KEY=<your-recaptcha-site-key>
   ```
4. **Flip the client backend flag and rebuild** (with the existing `VITE_FIREBASE_*`
   config present):
   ```bash
   VITE_FREEPLAY_NL_BACKEND=firebase
   npm run build
   ```
5. **Deploy Firestore rules** (locks `ratelimits/**`):
   ```bash
   firebase deploy --only firestore:rules
   ```
6. **Deploy the function** (confirm `translateStep` shows App Check enabled and
   `OPENAI_API_KEY` bound):
   ```bash
   firebase deploy --only functions
   ```
7. **Set a cost guardrail.** Configure a GCP billing budget + alert; optionally an
   OpenAI org monthly cap. Consider starting with a lower `perDay` limit until usage
   is observed.
8. **Smoke-test fail-closed behavior:** signed-out → mock (no call); signed-in
   without App Check → rejected; a deliberately wrong NL step → rejected by
   `verify()`.

> Optional model override: set `OPENAI_MODEL` in the function env (defaults to
> `DEFAULT_OPENAI_MODEL`).

**To stay on the mock** (no key, no spend), do nothing — leave
`VITE_FREEPLAY_NL_BACKEND` unset or `mock`.
