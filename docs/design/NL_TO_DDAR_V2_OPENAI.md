# Design Spec v2 — NL Step Input: OpenAI confirmed + `eqratio` extension

_Status: **IMPLEMENTED** (this v2 NL ratio extension has shipped). Companion to
[`NL_TO_DDAR.md`](./NL_TO_DDAR.md) (the v1 design). This v2 doc (a) confirmed the
open product decisions left in v1 §10, and (b) extended the natural-language
contract to cover ratio/similarity sentences once the `eqratio` length subsystem and
the StepBuilder 8-point ratio input shipped. The `eqratio` descriptor now exists end
to end (`nl/types.ts`, `nl/map.ts`, `nl/mock.ts`, `functions/src/openai.ts` +
`validate.ts`, with `e2e.ratio.test.ts` coverage). Companions:
[`../DDAR_ENGINE.md`](../DDAR_ENGINE.md) (engine contract),
[`../SECURITY_AUDIT.md`](../SECURITY_AUDIT.md) and
[`../security/NL_OPENAI_REVIEW.md`](../security/NL_OPENAI_REVIEW.md) (App Check =
finding #9, a go-live prerequisite)._

---

## 1. Summary of changes vs v1

| Topic | v1 | v2 (this doc) |
| --- | --- | --- |
| Provider | "a current structured-output chat model" (TBD) | **OpenAI / ChatGPT Chat Completions**, key server-side in `translateStep`. The Gemini / Firebase-AI-Logic / client-side-model path is explicitly **out of scope**. |
| Audience | open question (§10.2) | **Signed-in users only** get the OpenAI path; guests/anonymous use the deterministic local mock. |
| Fact language | `rel` + `aval` (7 `Rel`s + angle values) | **adds `eqratio`** — the 8-point proportion `AB/CD = EF/GH` — now that the ratio subsystem shipped. |
| Open questions (§10) | 7 open | **all resolved** (see §7). |

### 1.1 The immovable invariant is UNCHANGED

> **The AI is untrusted; `verify()` is the sole arbiter. Nothing enters the proof
> unless `verify()` returns `{valid:true}`.**

This is unchanged by the OpenAI confirmation and the `eqratio` extension. The NL
path still only *proposes* a `(candidateFact, citedPremises)` pair, lowered by the
pure mapper `src/lib/freeplay/nl/map.ts`, then routed through the exact same
`verify()` loop (`src/lib/freeplay/verify.ts:142`) as the structured builder. The
ratio extension rides the SAME gate: `verify()` already calls `factHoldsL`
(`verify.ts:184`) for the numeric truth check and runs the length layer
(`LengthAR` + `RATIO_RULES`, `verify.ts:30,135-137`) for derivability, so an
`eqratio` candidate is checked exactly as a hand-built one. A hallucinated ratio
is rejected as `not_true` (numeric gate) or `unjustified` (no one-step derivation)
— the model gains no new authority by being allowed to emit `eqratio`.

---

## 2. Contract extension for ratio (`FactDescriptor` += `eqratio`)

### 2.1 The new variant

Extend `FactDescriptor` in `src/lib/freeplay/nl/types.ts` (and the mirrored
standalone copy in `functions/src/types.ts`, which must stay structurally
compatible — see its header comment):

```ts
export type FactDescriptor =
  | { kind: "rel"; name: RelName; points: string[] }
  | { kind: "aval"; angle: [string, string, string]; expr: string }
  | { kind: "eqratio"; points: [string, string, string, string, string, string, string, string] };
```

The descriptor carries **8 ordered point labels** `[A,B,C,D,E,F,G,H]` meaning the
proportion **`AB/CD = EF/GH`** — the exact argument order of the shipped
constructor `eqratio(A,B,C,D,E,F,G,H)` (`src/lib/freeplay/dsl.ts:89-98`,
re-exported from `src/lib/freeplay/lengths/dsl.ts:31`). As with `rel`/`aval`, the
AI emits **strings only** — never an `EqRatio`/`LFact` object.

### 2.2 `map.ts` lowering (`descriptorToFact` += `eqratio`)

Add a branch to `descriptorToFact` (`src/lib/freeplay/nl/map.ts:47`) before the
final `bad_descriptor` throw. Validation, in order:

1. **Arity exactly 8** — `Array.isArray(d.points) && d.points.length === 8`, else
   `MapError("bad_arity", "A ratio needs exactly 8 points (AB/CD = EF/GH).")`.
2. **Every label ∈ figure** — `assertPoints(d.points, figure)` (reuses the
   existing helper at `map.ts:38`), else `MapError("unknown_point", …)`.
3. **Lower via the constructor** — `return eqratio(d.points[0], …, d.points[7])`.

Pseudocode for the new branch:

```ts
if (d.kind === "eqratio") {
  if (!Array.isArray(d.points) || d.points.length !== 8) {
    throw new MapError("bad_arity", "A ratio needs exactly 8 points (AB/CD = EF/GH).");
  }
  assertPoints(d.points, figure);
  const p = d.points;
  return eqratio(p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]);
}
```

Notes:
- `descriptorToFact` keeps its return type `Fact` today but must widen to **`LFact`**
  (`import { eqratio, type LFact } from "../lengths/dsl"`), because `eqratio`
  produces an `EqRatio`, which is in `LFact` but not `Fact`. `matchPremises`
  (`map.ts:110`) and `factToDescriptor` (`map.ts:128`) widen to `LFact[]`/`LFact`
  the same way. This is purely additive: the existing `rel`/`aval` paths are
  untouched and `verify()`'s `VerifyInput` already takes `LFact`
  (`verify.ts:58-68`).
- **No new `MapErrorCode` is needed.** The four ratio failure modes map onto the
  existing codes: wrong length → `bad_arity`; off-figure label → `unknown_point`;
  non-array/missing `points` → `bad_descriptor`; an unrecognized `kind` still
  falls through to `bad_descriptor`. (`MapErrorCode` is the closed union at
  `map.ts:18-23`; there is no `expr` to fail and no relation name to look up, so
  `bad_expr`/`unknown_relation` are not reachable for `eqratio`.)

### 2.3 Premise resolution by `canonicalKeyL`

`matchPremises` (`map.ts:110-120`) already resolves each lowered premise against
the established facts by `canonicalKey`. For ratios this *just works*: the shipped
`canonicalKey` dispatches `eqratio` to `eqratioKey` (`dsl.ts:166-192`), which
canonicalizes the four ratio symmetries (endpoints unordered per segment, swap the
two ratios, invert both, and the composition). So a learner writing
`PA/PC = PD/PB` and an established `PD/PB = PA/PC` resolve to the **same** key and
match. The only change is the type widening to `LFact` so `eqratio` keys are
computed (the helper is re-exported as `canonicalKeyL` in `lengths/dsl.ts:35` for
length-layer call sites; `map.ts` may import either — they are the same function).

### 2.4 `factToDescriptor` += `eqratio` (established-facts context payload)

`factToDescriptor` (`map.ts:128-133`) serializes established facts back to
descriptors for the model's context. Add the inverse branch:

```ts
if (f.kind === "eqratio") {
  return { kind: "eqratio", points: [...f.points] };
}
```

This is exact (lossless) — unlike the `aval` branch, there is no `Form` to
stringify. Today the StepBuilder NL path *filters out* `eqratio` established facts
before translating (`StepBuilder.tsx:557-560`, "angle/incidence-only") and the
e2e test narrows givens (`nl/__tests__/e2e.test.ts:21`). v2 **removes that
filter** so the model sees established proportions as context — important for
multi-step ratio chases where a prior `eqratio` is a premise of the next step.

---

## 3. OpenAI prompt + JSON schema update

All of this lives **inside the Cloud Function only** (`functions/src/openai.ts`);
the client bundle gains no OpenAI dependency or key.

### 3.1 Per-request JSON schema (`buildJsonSchema`)

`buildJsonSchema` (`functions/src/openai.ts:86-125`) builds a per-request schema
whose point arrays use `enum: req.points` (locking the model to figure points) and
whose relation names use `enum: REL_NAMES`. Add a **third `anyOf` branch** to the
`descriptor` schema for `eqratio`:

```ts
{
  type: "object",
  additionalProperties: false,
  properties: {
    kind: { type: "string", enum: ["eqratio"] },
    points: { type: "array", items: pointEnum, minItems: 8, maxItems: 8 },
  },
  required: ["kind", "points"],
}
```

where `pointEnum = { type: "string", enum: req.points }` (already defined at
`openai.ts:87`). The exact 8-element constraint (`minItems: 8, maxItems: 8`) plus
the `enum` items means a structurally invalid or off-figure ratio cannot even be
emitted under `strict: true` structured outputs.

### 3.2 Output shape re-check (`validateResultShape` / `validateDescriptor`)

`validateDescriptor` in `functions/src/validate.ts:35-68` re-validates the model
output server-side. Add an `eqratio` arm:

```ts
if (obj.kind === "eqratio") {
  if (!Array.isArray(obj.points) || obj.points.length !== 8) {
    throw new ValidationError(`${where} has an invalid ratio point count.`);
  }
  for (const p of obj.points) {
    if (!isString(p) || !points.has(p)) {
      throw new ValidationError(`${where} references an unknown point.`);
    }
  }
  return { kind: "eqratio", points: obj.points as [string, string, string, string, string, string, string, string] };
}
```

(The existing `rel` arm caps `points` at 3..8; `eqratio` is the only fixed-8 kind,
so it needs its own arm. `validateDescriptor` is also used for `established[]`
context, so this same arm lets established ratios survive the inbound validation —
they no longer need to be dropped.)

### 3.3 System-prompt vocabulary additions

Append to `SYSTEM_PROMPT` (`functions/src/openai.ts:37-59`), after the `aval`
line:

```
- eqratio: a length PROPORTION. `points` is EXACTLY 8 points [A,B,C,D,E,F,G,H]
  meaning AB/CD = EF/GH (the ratio of segment AB to CD equals EF to GH).
  Segment endpoints are unordered (AB = BA). Use this for:
    * "power of a point": PA·PB = PC·PD  ⇒  eqratio points [P,A,P,C,P,D,P,B]
      (PA/PC = PD/PB, which is equivalent to PA·PB = PC·PD).
    * "similar triangles ⇒ proportional sides": from △ABC ~ △DEF, corresponding
      sides are proportional, e.g. AB/DE = BC/EF ⇒ points [A,B,D,E,B,C,E,F].
  A product equation XY·ZW = MN·PQ is a ratio XY/MN = PQ/ZW — convert it.
```

The existing rules stay: **use only the provided points; output EXACTLY ONE
conclusion; extra facts go in `notes`; `ruleHint` is cosmetic**
(`openai.ts:53-58`). The untrusted learner text remains in a delimited user turn
(`openai.ts:76-79`).

### 3.4 Few-shot examples (added to the user/system context)

Add 2 ratio few-shots to the prompt assembly (`buildMessages`, `openai.ts:61-83`)
alongside the existing concyclic→`eqangle` example:

1. **Power of a point.** Figure points include `P,A,B,C,D`. Sentence: _"Since
   A, B, C, D are concyclic and the chords meet at P, PA·PB = PC·PD."_ →
   `conclusion: { kind:"eqratio", points:["P","A","P","C","P","D","P","B"] }`,
   `premises: [ {kind:"rel",name:"cyclic",points:["A","B","C","D"]},
   {kind:"rel",name:"coll",points:["P","A","B"]},
   {kind:"rel",name:"coll",points:["P","C","D"]} ]`.
   (Mirrors the shipped `power_of_a_point` rule emission `eqratio(P,A,P,C,P,D,P,B)`,
   `src/lib/freeplay/lengths/rules/power_of_a_point.ts:139`.)
2. **SAS similarity.** Figure points `A,B,C,D,E,F`. Sentence: _"Triangles ABC and
   DEF have AB/DE = BC/EF and equal included angle ABC = DEF, so AB/DE = CA/FD."_
   → `conclusion: { kind:"eqratio", points:["A","B","D","E","C","A","F","D"] }`,
   `premises: [ {kind:"eqratio",points:["A","B","D","E","B","C","E","F"]},
   {kind:"rel",name:"eqangle",points:["A","B","C","D","E","F"]} ]`.
   (Mirrors the SAS premises/derivation in
   `src/lib/freeplay/lengths/rules/sas_similarity.ts:7-8,117`.)

---

## 4. Mock translator update (`nl/mock.ts`)

The mock is the **offline default** (dev/guest/tests). Today `parseClause`
(`mock.ts:115-160`) is a keyword→relation table with no ratio rule. Add a
**ratio clause** branch, checked BEFORE the `=`/`congruent` fallback (`mock.ts:155`,
which would otherwise grab a 4-point `cong`).

### 4.1 Patterns

A clause is a ratio clause if it matches any of:
- a **product equation** `AB·CD = EF·GH` / `AB*CD = EF*GH` (tokens
  `·`, `*`, `x`, `times`), e.g. `PA·PB = PC·PD`;
- a **ratio equation** `AB/CD = EF/GH` (a `/` on each side of `=`);
- the phrase **"power of a point"** (with 4 contact points + the apex in scope);
- a **proportion phrase** "is proportional to" / "in proportion".

### 4.2 Lowering (point-validated against the figure)

Reuse `extractPoints` (`mock.ts:83-91`, longest-match decomposition against the
sorted figure labels) on each of the four segment tokens. Emit the 8-point
descriptor with the correct algebraic conversion:

- **Product `AB·CD = EF·GH`** (means `AB·CD = EF·GH`) → ratio `AB/EF = GH/CD`
  → `{ kind:"eqratio", points:[A,B,E,F,G,H,C,D] }`. For the canonical
  power-of-a-point sentence `PA·PB = PC·PD` this yields
  `[P,A,P,C,P,D,P,B]` (PA/PC = PD/PB), matching the shipped rule output and the
  `canonicalKeyL` of the established/goal fact.
- **Ratio `AB/CD = EF/GH`** → `{ kind:"eqratio", points:[A,B,C,D,E,F,G,H] }`
  directly.

Only descriptors where all 8 decoded tokens are figure points are emitted;
anything else returns `null` (clause dropped, surfaced via the existing `notes`
"some premise clauses couldn't be parsed" path, `mock.ts:188-190`). Arity (==8)
and figure membership are then **re-checked** by `descriptorToFact` and the truth
by `verify()` — the mock is never trusted.

### 4.3 Limits (explicit)

The mock stays **narrow but demo-complete**: it recognizes the two canonical
shapes (product, explicit ratio) and the "power of a point" keyword, with simple
left-to-right segment extraction. It does **not** infer the power-of-a-point
*premises* (the `cyclic` + two `coll`) from prose — for a full offline demo the
learner cites those in the same sentence with `since`/`because` (the existing
clause splitter, `mock.ts:35-54`, already separates them). It does not parse
nested fractions, 3-term proportions, or implicit similar-triangle correspondence.
The OpenAI path is where rich ratio prose is handled; the mock guarantees the
pipeline (and the e2e tests) work with no network/key.

---

## 5. Signed-in-only enforcement

Guests must **never** reach the paid OpenAI endpoint. Enforcement is layered:

1. **Server (authoritative).** `translateStep` already rejects unauthenticated
   calls: `if (!request.auth) throw new HttpsError("unauthenticated", …)`
   (`functions/src/index.ts:83-85`) and additionally requires App Check
   (`enforceAppCheck: true`, `index.ts:77`, plus the belt-and-suspenders
   `request.app` guard, `index.ts:88-90`). This is the real gate — no config or
   client bug can bypass it.
2. **Client routing (`getTranslator`).** v2 makes `getTranslator()`
   (`src/lib/freeplay/nl/index.ts:14-20`) **auth-aware**: return
   `FirebaseFunctionTranslator` only when `backend === "firebase"` **AND**
   `isFirebaseConfigured` **AND** the current user is signed in (non-anonymous);
   otherwise return `LocalMockTranslator`. Signature becomes
   `getTranslator(opts?: { signedIn: boolean })` (or it reads the cached auth
   state), so a guest deterministically gets the mock and never issues a callable
   that would just 401.
3. **UI affordance.** The StepBuilder NL toggle (`InputMode = "nl"`,
   `StepBuilder.tsx:33`) surfaces a "**Sign in for AI-powered NL steps**"
   affordance to guests; the mock still works offline for everyone, so guests keep
   a (narrower) NL experience. The existing friendly copy for
   `functions/unauthenticated` ("Please sign in to use natural-language steps.",
   `nl/firebase.ts:15-16`) remains as the last-resort message if a signed-out call
   ever slips through.

**Confirmation:** with (1) as the authoritative gate and (2) ensuring guests never
construct the callable, guests cannot hit the paid endpoint.

---

## 6. Security / cost / abuse delta for `eqratio`

The threat model and containment from v1 §7 are **unchanged**; the only delta is
the longer point array.

- **Tighter validation for the 8-point array.** `eqratio` requires **exactly 8**
  labels, each a valid figure point. This is enforced three times: the JSON schema
  `minItems/maxItems: 8` + `enum` items (§3.1), the server re-check in
  `validateDescriptor` (§3.2), and the client mapper (§2.2). The inbound
  `validateRequest` caps are **unchanged**: `text ≤ 280`, `points` 1..32,
  `established ≤ 256`, `pointLabel = ^[A-Za-z][A-Za-z0-9]?$`
  (`functions/src/validate.ts:15-22`). The existing `rel` arm's 3..8 bound is not
  widened — `eqratio` gets its own exact-8 arm, so we don't loosen anything.
- **Rate limits unchanged.** 30/min, 300/day per uid via the Firestore
  transaction (`DEFAULT_RATE_LIMIT`, `functions/src/ratelimit.ts:12`;
  `enforceRateLimit`, `index.ts:55-72`). `maxInstances: 5` bounds concurrency
  (`index.ts:79`). Ratio requests are the same unit of cost as any other.
- **Prompt-injection containment unchanged.** (a) Untrusted text in a delimited
  user turn (`openai.ts:76-79`); (b) schema-constrained output (now incl. the
  `eqratio` `anyOf` branch); (c) `verify()` as the final arbiter — a ratio it
  can't derive/that isn't true is rejected; (d) client point/arity validation in
  `map.ts`. A larger array gives the model more places to hallucinate a point, but
  the `enum`-locked schema + `assertPoints` make off-figure points impossible and
  `factHoldsL` rejects a numerically false proportion.

---

## 7. Resolved v1 §10 open questions

| # | v1 question | **v2 decision** |
| --- | --- | --- |
| 1 | OpenAI model + caps | **Model: `gpt-4o-2024-08-06`** — a current, JSON-Schema structured-output (`strict:true`) capable Chat Completions model. It is already the scaffold default (`DEFAULT_OPENAI_MODEL`, `functions/src/openai.ts:18`) and is **swappable without a code change** via the `OPENAI_MODEL` env var (`index.ts:106`); promote to Remote Config for runtime swaps. **Caps:** `text ≤ 280` chars, **~30/min and 300/day** per uid (already wired, `validate.ts:16` / `ratelimit.ts:12`). |
| 2 | Guests get OpenAI or mock-only? | **Signed-in only.** Guests/anonymous → local mock (see §5). Confirmed product decision. |
| 3 | Single auto-repair round in v1? | **Implement the seam, ship it OFF by default** (behind a flag). On a `verify()` rejection, at most ONE more `translate()` with the reason appended; result is re-shown and re-verified, **never auto-accepted** (v1 §4.4). Default off until we measure value/cost. |
| 4 | reCAPTCHA v3 vs Enterprise for App Check? | **Recommend reCAPTCHA Enterprise** for the web App Check provider (richer scoring/abuse signals, the path Google now steers new setups to). reCAPTCHA v3 is the acceptable lower-effort fallback if Enterprise provisioning is blocked. Either way App Check must be provisioned before the flag flips on (finding #9, `SECURITY_AUDIT.md:21,81`). |
| 5 | Rate-limit store | **Firestore counter** — the shipped `ratelimits/{uid}` doc updated in a transaction (Admin SDK only; `firestore.rules` denies client access). Already implemented (`index.ts:55-72`, `ratelimit.ts`). |
| 6 | Function region | **`us-central1`** default (`REGION`, `index.ts:36`; overridable via `FUNCTIONS_REGION`). Note data-residency: pick an EU region for EU-resident data if/when required — single env change, no code edit. |
| 7 | Edit→structured pre-fill (D3) in v1? | **Yes** — keep it in scope; small and high UX value. The descriptor→builder pre-fill must now also handle `eqratio` (8-slot ratio input already exists, `StepBuilder.tsx:62-66`). |

---

## 8. Test plan delta (no live key; `VITE_FREEPLAY_NL_BACKEND=mock` stays default)

All new tests run with the mock and an injected fake OpenAI client — no network,
no key. Default backend stays mock (`nl/index.ts:15-19`) so `npm test`/dev never
touch OpenAI.

1. **Mock ratio sentences** (`nl/__tests__/mock.test.ts`, new cases): product
   `PA·PB = PC·PD` → `eqratio [P,A,P,C,P,D,P,B]`; explicit `AB/CD = EF/GH`; "power
   of a point …" keyword; a sentence whose tokens aren't figure points → clause
   dropped (returned in `notes`).
2. **`eqratio` descriptor → `LFact` mapping** (`nl/__tests__/map.test.ts`):
   positive lowering via `descriptorToFact`; `MapError` cases — `bad_arity` (≠8
   points), `unknown_point` (off-figure label), `bad_descriptor` (missing/non-array
   `points`); `matchPremises` resolving a ratio premise to an established one by
   `canonicalKeyL` under each symmetry (swap, invert, endpoint-swap);
   `factToDescriptor` round-trip for `eqratio`.
3. **End-to-end translate→map→`verify()` on a SHIPPED ratio puzzle**
   (`nl/__tests__/e2e.ratio.test.ts`), via the mock:
   - **Positive (power of a point):** puzzle `jbmo-2010-g3-power-of-a-point`
     (`src/lib/freeplay/puzzles/jbmo_shortlist_2010_g3_pop.ts`). Sentence asserting
     the goal `AD·AB = AE·AC` citing the concyclic + two secants → mock → map →
     `verify()` returns `{ valid:true, rule:"power of a point" }` (goal
     `eqratio(A,D,A,E,A,C,A,B)`, given `cyclic(B,C,D,E)`, `coll(A,D,B)`,
     `coll(A,E,C)`).
   - **Positive (SAS similarity):** puzzle `sas-similarity-converse`
     (`src/lib/freeplay/puzzles/sas_similarity_problem.ts`), goal
     `eqratio(A,B,A,D,B,E,C,D)` from the cited two-sides ratio + shared angle →
     `{ valid:true, rule:"algebraic length-chase" }`.
   - **Negative (hallucinated ratio):** a `StubTranslator` (cf.
     `nl/__tests__/e2e.test.ts:43-50`) emitting a FALSE proportion (e.g.
     `eqratio(A,D,A,E,A,B,A,C)` — wrong pairing) → `verify()` returns
     `{ valid:false, reason:"not_true" }`. A true-but-uncited ratio →
     `{ valid:false, reason:"unjustified" }`. Proves the AI can't smuggle a ratio
     past the checker.
4. **Cloud Function unit with an injected fake OpenAI client**
   (`functions/src/__tests__/openai.cf-test.ts` additions): a fake `LLMClient`
   returning an `eqratio` JSON object → `translateWithLLM` → `validateResultShape`
   accepts it; assert `buildJsonSchema` includes the `eqratio` `anyOf` branch with
   `minItems/maxItems: 8` and `enum` points; `validateDescriptor` rejects a 7- or
   9-point ratio and an off-figure label.

---

## 9. Phased implementation task list (FUTURE build round)

Dependency-ordered, parallel-friendly; mirrors v1 §8. **[done]** = already shipped
on integration, **[new]** = this round.

- **P0 — contract.** **R1 [new]** add the `eqratio` variant to
  `nl/types.ts` AND `functions/src/types.ts` (keep them structurally identical).
  Blocks everything. _(Shipped already: `EqRatio`/`eqratio`/`canonicalKey`/
  `factHoldsL`/`LengthAR`/`RATIO_RULES`, the StepBuilder 8-point ratio input, and
  the `LFact`-aware `verify()` — all **[done]**.)_
  Then in parallel:
- **R2 [new]** `map.ts` — `descriptorToFact`/`matchPremises`/`factToDescriptor`
  `eqratio` branches + `LFact` widening (+ tests). · **R3 [new]** `mock.ts` ratio
  clause patterns (+ tests). · **R4 [new]** `functions/` — `openai.ts`
  (`buildJsonSchema` 3rd branch, system-prompt vocab, 2 few-shots) +
  `validate.ts` (`validateDescriptor` eqratio arm) (+ cf-tests with fake client).
- **R5 [new]** `nl/index.ts` `getTranslator()` auth-aware (signed-in→firebase,
  guest→mock). · **R6 [new]** `StepBuilder.tsx` — remove the `eqratio` established-
  facts filter (`:557-560`) so ratios flow as context; add the guest "sign in for
  NL" affordance; wire ratio descriptors into the preview (`factLabel` already
  renders `eqratio`, `dsl.ts:217-220`).
- **R7 [new]** Edit→structured pre-fill for `eqratio` (8-slot input). · **R8 [new]**
  e2e ratio tests (§8.3) + docs.
- **Ops (parallel, gating the flag):** **O1** provision App Check (reCAPTCHA
  Enterprise) — finding #9. · **O2** `functions:secrets:set OPENAI_API_KEY`,
  confirm region/model env. · **O3** flip `VITE_FREEPLAY_NL_BACKEND=firebase` for
  signed-in users only after O1/O2.

**Headline:** _Contract first (R1), then map/mock/function in parallel (R2–R4),
then client routing + UI (R5–R7) and ratio e2e tests (R8); App Check + secret
provisioning (O1–O3) gate flipping the flag on._

---

## 10. Risks (updated)

- **RESOLVED:** v1's risk _"similarity/ratio sentences won't translate until the
  ratio subsystem ships"_ — the `eqratio` subsystem, `LengthAR`/`RATIO_RULES`, and
  the StepBuilder ratio input have **shipped**, so this v2 extension is now
  possible.
- **Ratio vertex/segment-order ambiguity.** A misnamed correspondence (e.g. wrong
  arm matching in SAS, or `AB/CD` vs `AB/DC`) surfaces as `not_true` or
  `unjustified` from `verify()` — never as a wrong "accepted" step. `canonicalKeyL`
  absorbs the legitimate symmetries (swap/invert/endpoint), so only genuinely
  different proportions diverge. The **single-round repair UX** (§7.3, flag-off)
  is the safety net for honest near-misses.
- **App Check still a prerequisite.** It must be provisioned (finding #9,
  `SECURITY_AUDIT.md:21,81`) before flipping `VITE_FREEPLAY_NL_BACKEND=firebase`
  on. Until then the mock-default keeps the feature working offline for everyone.
- **Cost/latency.** Unchanged from v1: the network round-trip + confirm step add
  latency vs the instant builder; rate limits + `maxInstances` + the 280-char cap
  bound spend.
