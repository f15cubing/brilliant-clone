# Lessons → Freeplay Learning Arc — Design Spec

**Date:** 2026-06-28
**Status:** Draft for review
**Related:** [`docs/LEARNING-DESIGN-REVIEW.md`](../../LEARNING-DESIGN-REVIEW.md) (the audit this responds to), [`docs/research/learning-science-design-patterns.md`](../../research/learning-science-design-patterns.md), [`BRAINLIFT.md`](../../../BRAINLIFT.md), [`BRAINLIFT-freeplay.md`](../../../BRAINLIFT-freeplay.md).

---

## 1. Problem & intent

The app's learning value is the **arc**: a learner does a guided **lesson** to build an idea, then enters **Freeplay** to *construct* a machine-checked proof of it. Today those two surfaces are weakly connected, and the lesson layer has gaps identified in the learning-design review: the post-success consolidation moment is skippable, multiple-choice is treated as recognition/assessment rather than instruction, and there is no bridge that carries a learner across the recognition→production wall into proof construction.

This project reframes and rebuilds that arc. The guiding product decisions (from brainstorming):

- **The arc is the product.** Lessons exist to make a learner *ready to construct*; Freeplay is where they construct.
- **Multiple choice is direct instruction, not assessment.** In lessons, MC *delivers and shapes* the idea: every option (right and wrong) teaches, with wrong options authored as named misconceptions. MC is the teaching spine of the arc.
- **The other critiques of the review still hold** and are addressed as a sequenced, multi-phase roadmap built on top of the arc.

**This spec fully designs Phase 1** (the arc end-to-end on one concept) and sketches Phases 2–4. The terminal deliverable of this spec is an implementation plan for Phase 1.

### Non-goals (for Phase 1)
- No spaced repetition, interleaving, adaptive difficulty, hints, or calibration UI (these are Phases 2–4).
- No auto-authored content. Lesson *content* (1B) is co-authored with the product owner; the engine/schema (1A) is built against fixtures.
- No changes to the Freeplay verifier or rule engine.
- No migration of the other 6 lessons in Phase 1 (only `inscribed-angle` gets explicit stages; the rest keep working via backward-compatible defaults).

---

## 2. Architecture: the `LessonStage` sequence (Approach B)

A lesson becomes an **ordered sequence of typed stages**, rendered generically by `LessonPlayer`. This is the backbone that lets later phases insert new stage kinds without re-architecting.

### 2.1 Discriminated union

```ts
// src/lib/content/types.ts (additions)

export type LessonStage =
  | { kind: "concept";        concept: string }                 // brief expository intro (KaTeX)
  | { kind: "instruction-mc"; problem: InstructionMCProblem }   // direct-instruction MC (NEW component)
  | { kind: "problem";        problem: Problem }                // an existing-style Problem rendered by the UNCHANGED ProblemPlayer (any answer kind: MC/algebraic/geometric). Used by the pilot's "generation" step AND by the legacy shim.
  | { kind: "comprehension";  task: ComprehensionTask }         // proof-reading warmup
  | { kind: "handoff";        handoff: HandoffStage };          // bridge to Freeplay

// Phases 2-4 will add (NOT in Phase 1, listed here so the union's growth path is explicit):
//   | { kind: "spaced-review";  ... }
//   | { kind: "interleaved";    ... }
//   | { kind: "calibration";    ... }
```

### 2.2 Lesson model change + backward compatibility

```ts
export interface Lesson {
  id: string;
  title: string;
  summary: string;
  concept: string;              // RETAINED (legacy + used by the default-stage derivation)
  problems: Problem[];          // RETAINED (legacy + used by the default-stage derivation)
  stages?: LessonStage[];       // NEW — when present, drives the player; when absent, derived
  completionXp: number;
}
```

**Default-stage derivation (the compatibility shim).** A pure function `lessonStages(lesson): LessonStage[]` returns `lesson.stages` if present, else derives a legacy sequence: `[{kind:"concept", concept}, ...problems.map(p => ({kind:"problem", problem:p}))]`. Every legacy problem — MC, algebraic, or geometric — becomes a `problem` stage rendered by the **unchanged** `ProblemPlayer`, so its existing explanations, reveal-after-attempt, and feedback behavior are fully preserved. No legacy problem is routed through the new `instruction-mc` component. This guarantees the other 6 lessons render and behave exactly as today.

### 2.3 New types

```ts
// Direct-instruction multiple choice: EVERY option teaches.
export interface InstructionMCOption {
  id: string;                 // "A", "B", ...
  label: string;              // KaTeX/markdown
  isCorrect: boolean;
  teaching: string;           // REQUIRED for every option (right and wrong). KaTeX/markdown.
  misconceptionTag?: string;  // optional analytics tag, e.g. "inverted-ratio"
  boardOverlayConfig?: JSXGraphDef; // optional highlight drawn on the learner's board
}

export interface InstructionMCProblem {
  id: string;
  prompt: string;
  exploreHint?: string;
  boardConfig: JSXGraphDef;
  options: InstructionMCOption[];     // exactly one isCorrect === true
  consolidation: ConsolidationGate;   // REQUIRED, unskippable
  xp: number;
  dwell?: DwellConfig;                // defaults below
}

// The unskippable "instance -> principle" moment.
export interface ConsolidationGate {
  principle: string;                  // the takeaway, stated as a rule (KaTeX/markdown)
  boardOverlayConfig?: JSXGraphDef;
  selfExplanation?: {                 // optional constrained one-line SE (high-value stages)
    prompt: string;
    options: { id: string; label: string; isCorrect: boolean; teaching?: string }[];
  };
}

// Proof-reading warmup. Phase 1 ships the "fill-justification" variant.
export interface ComprehensionTask {
  id: string;
  kind: "fill-justification";
  prompt: string;
  boardConfig: JSXGraphDef;
  lines: ComprehensionLine[];
  validatedText: string;              // shown when all lines correctly cited
  xp: number;
  dwell?: DwellConfig;
}

export interface ComprehensionLine {
  fact: string;                       // the asserted fact for this line (KaTeX), e.g. "\\angle APB = \\tfrac12\\angle AOB"
  reasonOptions: {
    id: string;
    label: string;                    // reason text; labels SHOULD echo Freeplay rule vocabulary
    isCorrect: boolean;
    teaching: string;                 // REQUIRED for every reason option
  }[];
}

export interface HandoffStage {
  copy: string;                       // framing prose (KaTeX/markdown)
  freeplayPuzzleIds: string[];        // e.g. ["inscribed-angle"]
}

export interface DwellConfig {
  wrongMs: number;                    // default 3000
  correctMs: number;                  // default 1500
}
export const DEFAULT_DWELL: DwellConfig = { wrongMs: 3000, correctMs: 1500 };
```

---

## 3. Behavior

### 3.1 Direct-instruction MC stage

1. Learner reads the prompt, explores the draggable figure, selects an option.
2. **Wrong:** the option's `teaching` appears; the option buttons + any "Continue" are **locked for `dwell.wrongMs` (default 3000ms)**; after the lock, options re-enable for another **no-penalty** attempt. The selected wrong option is visually marked.
3. **Correct:** the option's `teaching` appears together with the **consolidation gate**; "Continue" is **locked for `dwell.correctMs` (default 1500ms)**, then enables.
4. If `consolidation.selfExplanation` is present, the learner must make a selection (also teaches on wrong) before "Continue" enables (in addition to the dwell).
5. XP awarded on first correct solve only (consistent with existing `recordAttempt` semantics). The new `instruction-mc` component offers no "reveal answer" button — the multi-try-with-teaching loop replaces it (every wrong pick already teaches, and the option set is finite). This applies only to authored `instruction-mc` stages; legacy MC problems keep their reveal path because they render through the unchanged `ProblemPlayer` (see §2.2).

### 3.2 Consolidation gate
Unskippable by construction: it is rendered as its own step gated by the dwell timer (and the optional self-explanation). It states the idea as a *principle*, not a restatement of the specific instance — the concreteness-fading "instance → principle" transition.

### 3.3 Comprehension stage (`fill-justification`)
1. The figure and the proof's *facts* are shown; each line needs a *reason*.
2. For each line the learner picks a reason from `reasonOptions`; wrong reasons teach + dwell (`wrongMs`); correct advances that line.
3. When **all** lines are correctly cited, `validatedText` shows and "Continue" enables (after `correctMs`).
4. Reason labels deliberately reuse Freeplay's rule vocabulary so the citation language transfers.

### 3.4 Handoff stage
Shows `copy` and a primary CTA **"Prove it in Freeplay →"** linking to `/freeplay/{freeplayPuzzleIds[0]}` (additional ids rendered as secondary links). **Reaching the handoff stage marks the lesson complete** and awards `completionXp` (Freeplay is encouraged but optional). Completing the linked puzzle is tracked by the existing Freeplay archive independently.

### 3.5 Player & progress
- `LessonPlayer` iterates `lessonStages(lesson)`, holds `stageIndex`, and renders a stage component by `kind`. Resume bookmark stores `stageIndex` (replacing/augmenting `lastProblemId`).
- Completion fires when the learner advances *into* (reaches) the `handoff` stage, or — for legacy lessons with no handoff — when the last stage is completed (preserving current behavior).
- XP/achievement plumbing (`recordAttempt`, `ProgressContext`) is reused; per-stage XP for `instruction-mc`/`problem`/`comprehension`, plus lesson `completionXp` at handoff.

---

## 4. Pilot content (co-authored — `inscribed-angle`)

This is the agreed Phase-1 content outline. Final wording is co-authored in task 1B; the engine (1A) is built against a fixture mirroring this shape.

| # | Stage | Summary |
|---|-------|---------|
| 1 | `concept` | Inscribed angle = half the central angle on the same arc. (Drop the "(Thales)" name per owner direction.) |
| 2 | `instruction-mc` | "How does the inscribed angle compare to the central angle?" Options **equal / half✓ / double / quarter**, each teaching to a named misconception (no-ratio / inverted-ratio / right-direction-wrong-factor). Consolidation: $\angle APB=\tfrac12\angle AOB$. |
| 3 | `problem` | "Express $\angle APB$ in terms of $c$" → `c/2` (existing algebraic problem; the arc's "generation" step — learner produces, rendered by the unchanged `ProblemPlayer`). |
| 4 | `instruction-mc` | Same arc ⇒ equal angles. Options **equal✓ / sum-180 / depends**; sum-180 teaches the cyclic-quad contrast. Consolidation: $\angle APB=\angle AQB$. |
| 5 | `instruction-mc` | Diameter ⇒ $90^\circ$, **presented as an interesting fact, NOT named "Thales."** Options **60 / 90✓ / varies**. Consolidation: "angle in a semicircle is a right angle." |
| 6 | `comprehension` | `fill-justification` over the 3-line argument: (1) $\angle APB=\tfrac12\angle AOB$ → *Inscribed angle theorem*; (2) $\angle AQB=\tfrac12\angle AOB$ → *Inscribed angle theorem*; (3) $\angle APB=\angle AQB$ → *substitute (both equal $\tfrac12\angle AOB$)*. |
| 7 | `handoff` | Copy bridges to construction; CTA → `inscribed-angle` Freeplay puzzle; reaching it completes the lesson. |

Confirmed authoring rules: every MC/reason option teaches; wrong options map to named misconceptions; teaching references the live figure; forced dwell 3000ms wrong / 1500ms correct; reason labels echo Freeplay rule names.

---

## 5. File structure (Phase 1)

- **Modify** `src/lib/content/types.ts` — add `LessonStage`, `InstructionMCProblem`, `InstructionMCOption`, `ConsolidationGate`, `ComprehensionTask`, `ComprehensionLine`, `HandoffStage`, `DwellConfig`, `DEFAULT_DWELL`; add optional `stages?` to `Lesson`.
- **Create** `src/lib/content/lessonStages.ts` — `lessonStages(lesson)` derivation: passthrough when `stages` present, else wrap `concept` + each `Problem` as a `problem` stage (pure, unit-tested). No lossy legacy mapping.
- **Create** `src/components/solvables/InstructionMC.tsx` — direct-instruction MC stage component (dwell-gated).
- **Create** `src/components/solvables/ConsolidationCard.tsx` — consolidation gate (dwell + optional SE).
- **Create** `src/components/solvables/ComprehensionPlayer.tsx` — `fill-justification` stage component.
- **Create** `src/components/solvables/HandoffCard.tsx` — Freeplay bridge.
- **Create** `src/lib/solvables/dwell.ts` — pure dwell-state helper (testable with fake timers).
- **Modify** `src/pages/LessonPlayer.tsx` — iterate stages by `kind` (render `problem` stages via the existing `ProblemPlayer`, new stages via the new components); reach-handoff completion; stage bookmark.
- **Modify** `src/lib/content/lessons/inscribedAngle.ts` — add explicit `stages` (content from §4, co-authored in 1B).
- **Modify** `src/lib/progress/*` only as needed for stage-indexed resume (minimal).
- **Tests** `src/lib/content/__tests__/lessonStages.test.ts`, `src/lib/solvables/__tests__/dwell.test.ts`, `src/components/solvables/__tests__/*` (fixture + fake-timer where pure logic allows).

Boundaries: each stage component has one responsibility and consumes only its stage's data; `LessonPlayer` knows the sequence, not the internals; `lessonStages.ts` and `dwell.ts` are pure and independently testable.

---

## 6. Testing strategy

Matches the repo's pure-logic emphasis (component/UI is the known coverage gap).

- **`lessonStages` derivation:** explicit `stages` passthrough when present; legacy derivation produces `[concept, ...problems as `problem` stages]` in order; a legacy lesson's stages all render via the unchanged `ProblemPlayer` (no `instruction-mc` produced by the shim).
- **Dwell logic:** with fake timers, "Continue"/options remain locked until `wrongMs`/`correctMs` elapse, then unlock; correct path uses `correctMs`, wrong uses `wrongMs`.
- **Comprehension validation:** task is "validated" iff *every* line's selected reason `isCorrect`; partial selection does not validate.
- **Completion semantics:** reaching the `handoff` stage marks complete + awards `completionXp`; legacy lesson (no handoff) completes on last stage as today.
- **Schema fixture test:** every `instruction-mc` option and every `comprehension` reason option has non-empty `teaching`; exactly one correct option per MC/line.

---

## 7. Phase map (full roadmap)

- **Phase 1 (this spec):** the arc end-to-end on `inscribed-angle` — direct-instruction MC + unskippable consolidation + `fill-justification` comprehension + Freeplay handoff; `LessonStage` backbone; backward-compatible defaults for the other 6 lessons.
- **Phase 2 — Scale the arc:** migrate all 7 lessons to explicit stages; add worked-example→completion→faded entry into Freeplay (partial pre-filled proofs); layered reason-level hints (promote dev-only `deriveAll()` behind effort gates). Adds no new stage kinds beyond P1's union except faded-worked support.
- **Phase 3 — Durability:** `spaced-review` stage + a cross-lesson review queue (two tracks: FSRS-scheduled component cards; regenerated problem variants), and an `interleaved` "name-the-approach" mixed-review mode (requires a `technique` tag on problems/puzzles).
- **Phase 4 — Mastery & calibration:** per-skill mastery estimate driving scaffold fading and mastery-gated lesson unlock (replacing exposure-gating); a `calibration` stage (predict→attempt→compare); learning-outcome telemetry (delayed-retention, not just completion) to enable in-product A/B of all the above.

Explicitly **not** on the roadmap: streaks, leaderboards, and growth-mindset messaging as a core lever (see the learning-design review §5 "not recommended").

---

## 8. Open questions / risks

- **Stage-indexed resume vs legacy `lastProblemId`:** Phase 1 introduces `stageIndex` bookmarking; need to migrate or coexist with existing `LessonProgress.lastProblemId` without resetting in-progress learners. Plan: keep `lastProblemId` for legacy lessons, add `lastStageIndex` for staged lessons.
- **Forced dwell & accessibility:** the timed lock must not trap keyboard/screen-reader users; the lock disables the action but the teaching text is immediately readable, and the remaining time is announced. Confirm against a11y review in implementation.
- **Self-explanation scope:** the optional SE selection is authored only on high-value consolidation gates (pilot: the stage-2 first-principle), per the research caution against over-prompting.
