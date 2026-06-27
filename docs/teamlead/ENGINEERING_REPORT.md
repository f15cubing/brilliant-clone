# Engineering Report & Roadmap — Freeplay / DDAR Session

**Branch:** `teamlead/integration` (primary branch never touched)
**Health (current):** root **785 tests / 89 files** green · functions **27 tests / 3 files** green · `tsc --noEmit` clean (root + functions) · `npm run lint` **0 errors** (3 pre-existing `react-refresh` warnings).

This report covers the work delivered this session, the resulting architecture, the security posture, the mathematical results (including honest negative results), and a prioritized roadmap. Two operational sections you asked for are at the end:

- [§7 — API key TODO](#7-api-key-todo-enable-the-real-openai-nl-path) — exact steps to switch the NL converter from mock to the live OpenAI path.
- [§8 — Try it out](#8-try-it-out-manual-qa-on-the-website) — a click-by-click guide to exercise everything shipped today.

---

## 1. Executive summary

This session advanced the Competitive Freeplay subsystem along three fronts, all merged and green:

1. **Engine** — the shipped DDAR proof-checker gained a ratio/length layer (`eqratio`, `LengthAR`) and several promoted deduction rules, including this session's two new theorems: **tangent-secant power** (`MA² = MB·MR`) and **Thales** (diameter ⇒ right angle). A long-standing target, **IMO 2019 P2**, is now solvable end-to-end.
2. **Content** — the catalog grew to **14 curated puzzles** across intro/core/challenge tiers, most of them literal contest citations (JBMO/IMO shortlist).
3. **Natural language** — an NL→DDAR translator is built, security-reviewed, and wired behind a feature flag. It is **off by default** (deterministic mock) and the real OpenAI path is signed-in-only, App-Check-enforced, and key-on-server. You flip it on by following §7.

A per-user **proof archive** now compiles and stores the full machine-checked proof on every win.

The repository is left substantially better understood, better documented, more capable, and with a clearly mapped research frontier.

---

## 2. What shipped this session (by track)


| Track                   | Outcome                                                                     | Where                                                                                                    |
| ----------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Rule promotion (Tier-A) | 11 research rules promoted to the shipped engine                            | `src/lib/freeplay/rules/`, `lengths/rules/`                                                              |
| Ratio subsystem         | `eqratio` facts, `LengthAR` length-algebra layer, `RATIO_RULES`             | `src/lib/freeplay/lengths/`                                                                              |
| Contest problems        | Authored + verified contest puzzles                                         | `src/lib/freeplay/puzzles/`                                                                              |
| Wave 2 puzzles          | 9 problems converted to shipped, rich-figure, cited puzzles                 | `src/lib/freeplay/puzzles/`                                                                              |
| `eqratio` input         | StepBuilder ratio input; `Puzzle`/proof types widened `Fact`→`LFact`        | `StepBuilder.tsx`, `types.ts`, `proof.ts`                                                                |
| Proof archive           | Compile + store full proof on win (Firestore / localStorage)                | `proofRecord.ts`, `useProofRecorder.ts`, `proofService.ts`                                               |
| IMO 2019 P2             | Closed end-to-end via promoted `concyclic_from_directed_angles`             | `puzzles/imo2019p2.ts`, `rules/concyclic_directed_angles.ts`                                             |
| New rules (this batch)  | `tangent_secant_power` + `thales_diameter` promoted; JBMO SL 2005 G2 puzzle | `lengths/rules/tangent_secant_power.ts`, `rules/thales_diameter.ts`, `puzzles/jbmo_shortlist_2005_g2.ts` |
| NL→DDAR                 | Mock translator + Firebase/OpenAI backend, `eqratio` support, auth gating   | `src/lib/freeplay/nl/`, `functions/src/`                                                                 |
| Research investigation  | Ranked menu of new rules; negative results documented                       | `research/freeplay-rules/findings/unsolved-rules-plan.md`                                                |
| Security audit          | NL/OpenAI reviewed — SAFE with conditions                                   | `docs/security/NL_OPENAI_REVIEW.md`                                                                      |
| Design docs             | NL v2 OpenAI design; olympiad rules roadmap                                 | `docs/design/`                                                                                           |


---

## 3. Architecture / subsystem map

### DDAR proof-checker (`src/lib/freeplay/`)

The checker accepts a step only if it is **numerically true across several independent realizations** of the figure **and** follows from **exactly** the cited premises by a single deduction rule or one algebra step. Each puzzle ships a parametric `construct(rng)` (free points placed from a seeded RNG, dependent points derived) that re-samples generic, givens-preserving diagrams; `realize.ts` validates each sample and `verify()` requires a step to hold in **every** one — so a step that is only coincidentally true/derivable in the canonical figure is rejected (`not_true`/`unjustified`), and a premise counts as extraneous only if droppable in **all** realizations. (This same construction model is the foundation for the planned movable freeplay figures; see [`docs/design/MOVABLE_FIGURES.md`](../design/MOVABLE_FIGURES.md).) Two reasoning layers:

- **Angle / incidence layer** — `Fact`s (`coll`, `para`, `perp`, `cong`, `cyclic`, `midp`, `eqangle`) + directed-angle algebra (`AngleAR`). **26 rules** = 13 hand-written `CORE_RULES` (`rules.ts`) + 13 `PROMOTED_RULES` (`rules/`, incl. `thales_diameter`, `concyclic_directed_angles`, `pascal`, `sss_congruence`, `perp_bisector`, …), composed as `RULES = [...CORE_RULES, ...PROMOTED_RULES]`.
- **Length / ratio layer** — `EqRatio` facts unioned with `Fact` into `LFact`; `LengthAR` reasons over unsigned `log|PQ|` generators. Rules in `src/lib/freeplay/lengths/rules/` are composed via `RATIO_RULES` (`power_of_a_point`, `sas_similarity`, `similar_triangles_aa`, `tangent_secant_power`, `thales_basic_proportionality`).

`verify.ts` composes `ALL_RULES = [...RULES, ...RATIO_RULES]`. Critical soundness invariant honored this session: rules must require their premises **as genuinely cited facts** (via `isAmong`/`isAmongL`), never read a conclusion off coordinates — guarded by anti-trap regression tests (e.g. the `sas_similarity` fix and the `thales_diameter` "drop a premise even though ∠=90° still holds" test).

### Natural language (`src/lib/freeplay/nl/` + `functions/src/`)

NL is **untrusted**. The model emits only `FactDescriptor`s (relation name from an enum + point labels from the figure). These are lowered to `LFact`s (`map.ts`) and then ride the **same** `onAssert → verifyStep → verify()` gate as the structured builder. The AI gains **no new authority** — a hallucinated step that doesn't follow is rejected by `verify()`, and the UI never auto-accepts.

- `getTranslator({ signedIn })` returns the Firebase/OpenAI translator only when `VITE_FREEPLAY_NL_BACKEND === "firebase"` **and** Firebase is configured **and** the user is signed in; otherwise the deterministic `LocalMockTranslator`.
- `functions/src/index.ts` `translateStep`: App Check enforced, `request.auth` required, input validated + capped, per-uid Firestore rate-limit (30/min · 300/day), OpenAI structured-output, server-side output re-validation. Key is a server secret (`defineSecret("OPENAI_API_KEY")`), never bundled.

### Proof archive (`src/lib/freeplay/proofRecord.ts`, `useProofRecorder.ts`, `firebase/proofService.ts`)

On transition to `status === "solved"`, `compileProof()` serializes the in-memory proof (facts + premises + analogy substitutions) into a JSON-safe `CompiledProof`. `useProofRecorder` persists it once per solve: **Firestore** `users/{uid}/freeplayProofs/{id}` for signed-in users (full history), **localStorage** for guests. The `ProofSummary` component renders the compiled proof + save state on the win screen.

---

## 4. Security posture

Full audit: [`docs/security/NL_OPENAI_REVIEW.md`](../security/NL_OPENAI_REVIEW.md). **Verdict: SAFE — with conditions.** Critical 0 · High 0 · Medium 2 · Low 3.

- **API key (PASS):** server-only secret, absent from the client `package.json`, no `sk-…` in tree/history, raw OpenAI errors never cross to the client.
- **Auth/App Check (PASS):** function rejects unauthenticated + missing App Check; guests are routed to the mock and never construct the callable.
- **Rate-limit integrity (PASS):** `ratelimits/**` is `allow … if false`; counters written only by the Admin SDK inside a transaction.
- **2 Medium items are go-live config gaps, not code defects:** (APPCHECK-1) provision a reCAPTCHA v3 site key; (COST-1) set a GCP billing budget + alert. Both are in the §7 TODO.
- **Dev-only dependency advisories** (`vitest`/`vite`/`esbuild`) are not shipped or production-reachable; bump when convenient.

---

## 5. Mathematical results

**New machine-checked theorems promoted this session**

- **Tangent-secant power** — from a tangent `MA` and a secant through `B, R` on a circle, `MA² = MB·MR`. Closes **JBMO SL 2005 G2** end-to-end and underlies 2015 G2.
- **Thales** — a diameter subtends a right angle (`midp(O,B,C)` + equal radii ⇒ `perp(A,B,A,C)`). A reusable right-angle producer the algebra layer can't reach.
- **Concyclic from directed angles** — the directed converse of the inscribed-angle theorem; the missing piece that **closed IMO 2019 P2**.

**Ranked menu of further rules** (`research/freeplay-rules/findings/unsolved-rules-plan.md`): converse Thales (feasible, not yet built) is the next low-risk win.

**Negative results (honest boundaries of this engine)**

- **Converse power-of-a-point ⇒ `cyclic`:** the length verifier doesn't hand `eqratio` premises to `rule.derive`, and `LengthAR` can't emit `cyclic`. Needs a shared-harness change — see roadmap P2.
- **Menelaus / Ceva / signed ratios:** `LengthAR` is built on **unsigned** `log|PQ|` — it cannot represent the signed `±1` that *is* the theorem. Needs a sign-aware subsystem.
- **Pole–polar, radical axis/center:** require new geometric **representations** (projective duality; circles-as-power-objects) absent from the DSL. Out of scope; research-first.

---

## 6. Roadmap (prioritized)


| Pri     | Item                                                                                                            | Impact | Effort    | Risk      | Notes                                            |
| ------- | --------------------------------------------------------------------------------------------------------------- | ------ | --------- | --------- | ------------------------------------------------ |
| **P0**  | Go-live the NL/OpenAI path                                                                                      | High   | Low (ops) | Low       | Follow §7; gated, reviewed, fail-closed          |
| **P1**  | Build + promote **converse Thales** (`perp`+`midp` ⇒ `cong`)                                                    | Med    | Low       | Low       | Next low-risk theorem from Yoda's menu           |
| **P1**  | **Proof-archive viewing UI** (gallery of saved proofs)                                                          | Med    | Low-Med   | Low       | Storage exists; only the "view later" UI remains |
| **P2**  | Verifier harness change to pass `eqratio` premises into rules → unlock **converse power-of-a-point** ⇒ `cyclic` | High   | Med       | Med       | Unlocks JBMO 2005 G1, 2011 G1/G2                 |
| **P2**  | Wire `npm test` into CI; widen course-app test coverage                                                         | Med    | Low       | Low       | Engine is covered; course app is the gap         |
| **P3**  | **Signed length subsystem** (Menelaus/Ceva, external division)                                                  | Med    | High      | High      | Requires sign-aware AR, not a rule               |
| **P3**  | Projective representations (pole–polar, radical axis)                                                           | High   | Very high | Very high | Research-first; new DSL objects                  |
| Hygiene | Bump dev `vitest`/`vite`/`esbuild`; refresh `firebase-admin` transitive deps                                    | Low    | Low       | Low       | Dev-only advisories (DEP-1/DEP-2)                |


---

## 7. API key TODO — enable the real OpenAI NL path

The NL converter ships **off** (deterministic mock). To switch on the live OpenAI path, complete **all** of these (mirrors the security pre-flight in `docs/security/NL_OPENAI_REVIEW.md`):

- [ ] **1. Set the OpenAI key as a server secret** (never in `.env` or code):
  ```bash
  firebase functions:secrets:set OPENAI_API_KEY
  # paste the key (sk-…) when prompted
  ```
- [ ] **2. Install + build the functions package:**
  ```bash
  npm --prefix functions install
  npm --prefix functions run build
  ```
- [ ] **3. Provision App Check (required — APPCHECK-1):** create a **reCAPTCHA v3** key, register the web app in Firebase Console → App Check (enforce for Cloud Functions), then set in your deploy env:
  ```bash
  VITE_FIREBASE_RECAPTCHA_SITE_KEY=<your-recaptcha-v3-site-key>
  ```
- [ ] **4. Flip the client backend flag and rebuild** (with the existing `VITE_FIREBASE_*` config present):
  ```bash
  VITE_FREEPLAY_NL_BACKEND=firebase
  npm run build
  ```
- [ ] **5. Deploy Firestore rules** (locks `ratelimits/**`):
  ```bash
  firebase deploy --only firestore:rules
  ```
- [ ] **6. Deploy the function** (confirm `translateStep` shows App Check enabled + `OPENAI_API_KEY` bound):
  ```bash
  firebase deploy --only functions
  ```
- [ ] **7. Set a cost guardrail (required — COST-1):** configure a **GCP billing budget + alert**; optionally an OpenAI org monthly cap. Consider starting with a lower `perDay` limit until usage is observed.
- [ ] **8. Smoke test fail-closed behavior:** signed-out → mock (no call); signed-in without App Check → rejected; a deliberately wrong NL step → rejected by `verify()`.

> Optional model override: set `OPENAI_MODEL` in the function env (defaults to `DEFAULT_OPENAI_MODEL`).

**To stay on the mock** (no key, no spend), do nothing — leave `VITE_FREEPLAY_NL_BACKEND` unset/`mock`.

---

## 8. Try it out — manual QA on the website

Start the app:

```bash
npm install
npm run dev      # http://localhost:5173
```

Everything below works in **guest mode** (no Firebase needed) unless noted. The NL panel uses the **deterministic mock** translator unless you've completed §7.

### A. Browse the expanded catalog

1. Go to **`/freeplay`**. You should see **14 puzzles** grouped intro → core → challenge.
2. New this session (try a few):


| Tier      | Puzzle                                            | What to notice                                    |
| --------- | ------------------------------------------------- | ------------------------------------------------- |
| intro     | **Arc-midpoint lemma: MB = MC**                   | rich figure with highlighted goal segments        |
| intro     | **Kite: ∠ABC = ∠ADC**                             |                                                   |
| core      | **JBMO SL 2004 G1: ∠MBQ = ∠NBP**                  | literal contest citation in title + blurb         |
| core      | **Squares on two sides: BG = CE**                 |                                                   |
| core      | **JBMO Shortlist 2005 G2: tangent-segment power** | **NEW** — exercises the tangent-secant power rule |
| core      | **SAS similarity: the converse power of a point** | ratio (`eqratio`) goal                            |
| challenge | **IMO Shortlist 2010 G1: AP = AQ**                |                                                   |
| challenge | **JBMO Shortlist 2010 G3: power of a point**      | ratio goal                                        |
| challenge | **IMO 2019 P2: P, P₁, Q, Q₁ concyclic**           | **now solvable end-to-end**                       |


### B. Solve with the structured builder (core path)

1. Open **JBMO Shortlist 2005 G2: tangent-segment power** (`/freeplay/jbmo-shortlist-2005-g2`).
2. In the StepBuilder, assert the goal `MA² = MB·MR` by citing `cong(O,A,O,B)`, `cong(O,A,O,R)`, `perp(O,A,A,M)`, `coll(M,B,R)` and applying **tangent-secant power**. The step is accepted only when it's numerically true **and** follows from exactly those premises.
3. Try a **wrong** step (drop a premise or cite a false ratio) → it is **rejected**. This is the soundness guarantee in action.

### C. Ratio (`eqratio`) input

1. Open **SAS similarity: the converse power of a point** or **JBMO Shortlist 2010 G3: power of a point**.
2. In the StepBuilder, pick the **ratio** claim kind ("Ratio AB/CD = EF/GH", 8 point slots) and build the proportion. Confirm it checks and the goal can be reached.

### D. Close IMO 2019 P2

1. Open **IMO 2019 P2** (`/freeplay/imo-2019-p2`).
2. Follow the directed-angle chase to `cyclic(P, P₁, Q, Q₁)`; the final concyclic step is justified by the promoted converse-of-inscribed-angle rule. The win screen confirms the goal is reached.

### E. Proof archive on win

1. Solve **any** puzzle (an intro one like *Inscribed angles on the same arc* is quickest).
2. On the win screen, the **Proof Summary** appears with the full compiled proof (each fact + its premises) and a saved indicator.
  - **Guest:** stored to `localStorage`. Reload and re-open — your record persists.
  - **Signed in (Firebase configured):** stored to Firestore `users/{uid}/freeplayProofs/` as a new history entry; re-solving after **Reset** stores a fresh record.

### F. Natural-language input (mock by default)

1. In any puzzle's StepBuilder, open the **natural-language panel**.
2. Type a step in plain English, e.g.:
  - "ABC and DEF are similar" / "AB is parallel to CD"
  - ratio phrasing: "PA·PB = PC·PD" or "power of a point at P"
3. The mock proposes a structured step. **Nothing is auto-accepted** — click **Use**, and it goes through the exact same `verify()` gate. A nonsense sentence yields an off-figure/`not_true`/`unjustified` note rather than a free step.
4. **Guests** see a "Sign in for AI-powered NL steps" affordance (the live AI path is signed-in only). With the real path enabled (§7) and signed in, the same panel calls OpenAI server-side.

### Verify everything is green locally

```bash
npm test                         # root engine suite (785 tests)
npm --prefix functions test      # function suite (27 tests)
npm run lint                     # 0 errors
```

