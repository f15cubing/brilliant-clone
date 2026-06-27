# Design Spec — Natural-Language Step Input for Freeplay

_Status: **IMPLEMENTED** (this v1 design has shipped — `src/lib/freeplay/nl/` +
`functions/`, off by default). Open questions in §10 were resolved in the v2 spec,
which also extends the contract to ratios. Originally produced by the NL→DDAR
planning agent and reviewed by the Team Lead. Companions:
[`NL_TO_DDAR_V2_OPENAI.md`](./NL_TO_DDAR_V2_OPENAI.md) (the superseding v2: OpenAI
confirmed + `eqratio` support), [`DDAR_ENGINE.md`](../DDAR_ENGINE.md) (the engine
contract), and [`SECURITY_AUDIT.md`](../SECURITY_AUDIT.md) / [`security/NL_OPENAI_REVIEW.md`](../security/NL_OPENAI_REVIEW.md)._

> **Update (shipped):** the mock translator, the `map.ts` validator, the
> `translateStep` Cloud Function (Auth + App Check, OpenAI key server-side), and the
> StepBuilder NL toggle have all landed. The §11 risk _"NL can only ever produce the
> 7 `Rel`s + `aval` until the ratio subsystem ships"_ is **resolved** — `eqratio` now
> ships and the NL path supports ratio descriptors (see the v2 spec).

## 0. Product decisions (fixed)

- **Per-step** translation: learner types one deduction → AI proposes `{candidateFact,
  citedPremises}` → existing `verify()` checks it.
- **Augment** the structured `StepBuilder` with an NL toggle; structured mode stays as
  fallback / offline path.
- **AI backend on the Firebase stack**: provider-agnostic `Translator` interface;
  production path is a **Firebase Cloud Function** holding the **OpenAI key
  server-side** (never in the client bundle), gated by **Auth + App Check**. A
  deterministic **local mock translator** is the default until the key is wired.

## 1. The immovable invariant

**The AI is untrusted; `verify()` is the sole source of truth.** The NL path only
*proposes* a `(candidateFact, citedPremises)` pair and routes it through the exact same
`handleAssert → verifyStep → verify` loop as the structured builder
(`FreeplayArena.tsx:80`, `verify.ts:97`). Nothing enters the proof unless
`verify()` returns `{valid:true}`. A hallucinated-but-underivable step is rejected as
`unjustified`/`not_true`. `ruleHint` from the model is cosmetic — `verify()`
auto-discovers the rule.

## 2. Translation target (the contract)

New `src/lib/freeplay/nl/types.ts`:

```ts
export type FactDescriptor =
  | { kind: "rel"; name: RelName; points: string[] }
  | { kind: "aval"; angle: [string, string, string]; expr: string }; // expr → parseForm()

export interface TranslationResult { premises: FactDescriptor[]; conclusion: FactDescriptor; ruleHint?: string; notes?: string; }
export interface TranslateRequest { text: string; puzzleId: string; points: string[]; variables: string[]; established: FactDescriptor[]; }
export interface Translator { readonly id: "mock" | "firebase"; translate(req: TranslateRequest): Promise<TranslationResult>; }
```

The AI emits **descriptors** (strings only — never a `Form` object; angle values are a
degree-expression string lowered via `parseForm`, which already supports
`180 - A/2 - B/2`, `angle(B,I,A)`, etc.). A pure mapper `nl/map.ts`
(`descriptorToFact`, `matchPremises`) lowers descriptors to engine `Fact`s and enforces
**client-side, pre-verify**: every point ∈ the figure's labels (stops invented points),
correct arity (`coll ≥ 3` up to `MAX_COLL = 8`, others exact), and `parseForm`-able
`expr`. Premises resolve against established facts by `canonicalKey`.

## 3. OpenAI prompt (inside the Cloud Function only)

Structured outputs with a **per-request JSON schema** whose point arrays use
`enum: <figure points>` and `name` uses `enum` of the 7 `Rel`s. System prompt fixes the
vocabulary (relation arities, `eqangle` = ∠ABC equals ∠DEF with vertices 2nd & 5th,
`aval` uses 3 angle points + `expr`), forbids inventing points, and requires a single
`conclusion` (extra facts go in `notes`). Few-shot examples map real puzzle sentences
(e.g. concyclic → inscribed-angle `eqangle`).

## 4. Verify-as-truth + repair UX

1. Translate → show the **parsed interpretation** back ("assert X because Y") via
   `factLabel`+`MathText` *before* asserting; offer **Use / Edit / Retry**.
2. **Use** → existing `onAssert(conclusion, premises)` → `verifyStep`.
3. Failures: invalid JSON/network → "couldn't translate, try rephrasing or use the
   builder"; bad mapping (`unknown_point`/`bad_arity`/`bad_expr`) → specific message, no
   `verify()` call; `verify()` rejection → reuse the existing `FEEDBACK` copy keyed by
   reason, keep the interpretation on screen, allow Edit/Retry.
4. **Optional single auto-repair round** (flagged): on rejection, one more `translate()`
   with the rejection reason appended; result is re-shown and re-verified, **never
   auto-accepted**.

## 5. Local mock translator (`nl/mock.ts`)

Deterministic, dependency-free, no network; default in dev/guest and whenever the
Firebase NL backend isn't configured (mirrors `api.ts`'s local-`verify` fallback).
Keyword→relation table (concyclic→`cyclic`, parallel→`para`, midpoint of→`midp`,
"angle ABC = expr"→`aval`, …), premise split on `since|because|as|so|therefore`, point
tokens validated against the figure. Narrow but demo-complete; anchors the unit tests so
the feature works offline immediately.

## 6. Firebase Cloud Function (`functions/`, new)

`onCall` v2 `translateStep` with `enforceAppCheck: true`, `secrets:[OPENAI_API_KEY]`,
`maxInstances: 5`, `timeoutSeconds: 30`. Order: require `request.auth` →
require App Check → validate (`puzzleId ≤64`, `points` 1–32 `^[A-Za-z][A-Za-z0-9]?$`,
`text ≤ 280` chars, `established ≤ 256`) → per-uid Firestore rate-limit (≈30/min,
300/day) → OpenAI call with per-request schema → re-validate shape → return. Error
contract maps `unauthenticated|failed-precondition|invalid-argument|resource-exhausted|
internal` to friendly client copy. `firebase.json` gains a `functions` block;
`firestore.rules` denies client access to `ratelimits/**`. Client `config.ts` adds App
Check init (`ReCaptchaV3Provider`, new `VITE_FIREBASE_RECAPTCHA_SITE_KEY`) + exports a
`functions` instance. **OpenAI key is a server secret (`functions:secrets:set`); the
client bundle gains no OpenAI dependency.**

## 7. Security / cost / abuse

Prompt-injection is contained by (a) untrusted text in a delimited user turn, (b)
schema-constrained output, (c) `verify()` as final arbiter, (d) client point/arity/expr
validation. Length caps + per-user rate limit + `maxInstances` bound cost. App Check +
Auth keep the paid endpoint app-only. Key stays server-side.

## 8. Implementation tasks (dependency order, parallel-friendly)

- **A1** `nl/types.ts` (blocks all). → then parallel:
- **A2** `nl/map.ts` (+ tests) · **A3** `nl/mock.ts` (+ tests) · **C1–C4** `functions/`
  scaffold + validate/ratelimit/openai + `translateStep` + `firebase.json`/rules ·
  **B3** `config.ts` App Check + env.
- **B1** `nl/firebase.ts` (callable client) · **B2** `nl/index.ts` `getTranslator()`
  factory (firebase when configured + flagged, else mock).
- **D1** `StepBuilder.tsx` NL toggle + preview + Use/Edit/Retry · **D2**
  `FreeplayArena.tsx` wiring · **D3** (opt) Edit→structured pre-fill.
- **E** tests + docs per phase.

## 9. Test plan (no live key)

Vitest: mock translator table; descriptor→Fact mapping + `MapError` cases; end-to-end
translate→map→`verify()` on real puzzles (mock translator) incl. a negative proving the
AI can't bypass the checker; Cloud Function units with an **injected fake OpenAI client**
(no network/key) covering validate/ratelimit/schema/auth/App-Check paths; auto-repair
"at most one call, never auto-accept". Default `VITE_FREEPLAY_NL_BACKEND=mock` so
`npm test`/dev never touch OpenAI.

## 10. Open questions (Team Lead defaults in brackets; ★ = may want user input)

1. OpenAI model + caps [default: a current structured-output chat model; `text ≤ 280`; 30/min, 300/day]. ★ model/caps
2. Do guest (anonymous) users get the OpenAI path or mock-only? [default: signed-in only; guests use mock]. ★
3. Single auto-repair round in v1? [default: yes, flagged off until measured].
4. reCAPTCHA v3 vs Enterprise for App Check? ★ (provisioning)
5. Rate-limit store [default: Firestore counter].
6. Function region [default: `us-central1`]. ★ data residency
7. Edit→structured pre-fill (D3) in v1? [default: yes, small + high UX value].

## 11. Risks

App Check isn't set up yet (ship mock-default, roll App Check behind the flag). NL can
only ever produce the 7 `Rel`s + `aval` — similarity/ratio sentences won't translate
until the ratio subsystem ships (ties into the olympiad-problem initiative).
`eqangle`/vertex naming ambiguity surfaces as `not_true`/`unjustified` — the repair UX
is the safety net. Network round-trip + confirm step add latency vs the instant builder.
