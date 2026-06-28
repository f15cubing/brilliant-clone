# Lessons → Freeplay Learning Arc (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the lesson→Freeplay learning arc end-to-end on the `inscribed-angle` lesson: direct-instruction multiple choice (every option teaches), an unskippable consolidation gate with a forced feedback dwell, a fill-justification proof-comprehension warmup, and a handoff into the matching Freeplay puzzle — built on a generic `LessonStage` sequence with full backward-compatibility for the other 6 lessons.

**Architecture:** A `Lesson` gains an optional ordered `stages: LessonStage[]` (discriminated union) rendered generically by `LessonPlayer`; lessons without `stages` derive a legacy `[concept, ...problems]` sequence so they render unchanged through the existing `ProblemPlayer`. Progress tracking is generalized from "problems" to "solvable stage IDs" so the new stage kinds persist correctly through `reconcile`/course-rollup/`applyAttempt`. New stage kinds (`instruction-mc`, `comprehension`, `handoff`) get their own components; a forced-dwell hook gates feedback (3.0s wrong / 1.5s correct).

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind v4; Vitest (node env, no DOM harness) for pure-logic tests; JSXGraph via the existing `GeometryBoard`/`useJSXGraph`; KaTeX via `MathText`.

## Global Constraints

- **Branch:** all work on `lessons-to-freeplay-arc` (already created; rollback point = `movable-freeplay-figures` @ `9602e5d`).
- **Spec:** [`docs/superpowers/specs/2026-06-28-lessons-to-freeplay-arc-design.md`](../specs/2026-06-28-lessons-to-freeplay-arc-design.md) is authoritative; this plan implements its Phase 1.
- **Path alias:** import app code via `@/...` (maps to `src/`). Tests use the same alias.
- **Tests are pure-logic only.** No `@testing-library`/jsdom exists; do NOT add one in Phase 1. Component tasks are verified by `npm run build` (tsc) + `npm run lint` + a described manual smoke check.
- **No content auto-authoring beyond the agreed pilot drafts.** Task 8 encodes the content co-authored during brainstorming (verbatim where given): every MC/reason option teaches; wrong options map to named misconceptions; teaching references the live figure; stage 5 is presented as an interesting fact and is NOT named "Thales"; the stage-1 concept text drops the "(Thales)" mention; forced dwell defaults 3000ms wrong / 1500ms correct.
- **Backward compatibility is mandatory:** the other 6 lessons must render and behave exactly as before (concept intro + `ProblemPlayer` problems), and existing progress/XP/achievements must be preserved.
- **Commit after every task** with the message shown in that task's final step.
- **Staging — do NOT `git add -A`/`git add .`.** The working tree contains unrelated untracked files (`research/`, `docs/research/`, `docs/LEARNING-DESIGN-REVIEW.md`) that must stay uncommitted. Every task in this plan touches only `src/`, so the commit steps stage with `git add src/`. (The plan doc itself was committed separately with an explicit path.)
- **Dwell defaults:** `DEFAULT_DWELL = { wrongMs: 3000, correctMs: 1500 }`.

---

## File Structure

```
src/lib/content/
  types.ts                       # MODIFY: add LessonStage union + new interfaces + DwellConfig
  lessonStages.ts                # NEW: lessonStages(), lessonSolvableIds(), stageXp(), stageSolvableId()
  course.ts                      # MODIFY: totalProblems() counts solvable stage ids
  lessons/inscribedAngle.ts      # MODIFY (Task 8): add `stages`, trim `problems`
  __tests__/lessonStages.test.ts # NEW
src/lib/solvables/
  dwell.ts                       # NEW: dwellDurationFor() + useDwellLock()
  comprehension.ts               # NEW: isComprehensionValidated() + reasonIsCorrect()
  __tests__/dwell.test.ts        # NEW
  __tests__/comprehension.test.ts# NEW
src/lib/progress/
  types.ts                       # MODIFY: add lastStageIndex?
  reconcile.ts                   # MODIFY: validate against solvable stage ids; carry lastStageIndex
  recordAttempt.ts               # MODIFY: completion over solvable stage ids
  ProgressContext.tsx            # MODIFY: add updateLessonStage()
  __tests__/stagedProgress.test.ts # NEW (Task 8): staged completion integration
src/components/solvables/
  ConsolidationCard.tsx          # NEW
  InstructionMC.tsx              # NEW
  ComprehensionPlayer.tsx        # NEW
  HandoffCard.tsx                # NEW
src/pages/
  LessonPlayer.tsx               # MODIFY: render lessonStages() generically
```

**Commands** (run from repo root): build = `npm run build`; lint = `npm run lint`; tests = `npx vitest run <path>` (single file) or `npm test` (all). Dev server for manual smoke = `npm run dev`.

---

## Task 1 — `LessonStage` types + stage derivation (pure, tested)

Adds the discriminated `LessonStage` union and the pure `lessonStages`/`lessonSolvableIds` helpers that every later task builds on. Legacy lessons (no `stages`) derive `[concept, ...problems]`, so existing behavior is preserved.

- [ ] **1.1 Write the failing test first.** Create `src/lib/content/__tests__/lessonStages.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { Lesson } from "@/lib/content/types";
import {
  lessonSolvableIds,
  lessonStages,
  stageSolvableId,
  stageXp,
} from "@/lib/content/lessonStages";

const legacy: Lesson = {
  id: "legacy",
  title: "Legacy",
  summary: "s",
  concept: "concept text",
  completionXp: 5,
  problems: [
    {
      id: "p1",
      prompt: "q1",
      boardConfig: { boundingBox: [-1, 1, 1, -1], elements: [] },
      answerConfig: { kind: "algebraic", correctExpression: "1", variables: [] },
      explanations: [],
      xp: 10,
    },
    {
      id: "p2",
      prompt: "q2",
      boardConfig: { boundingBox: [-1, 1, 1, -1], elements: [] },
      answerConfig: { kind: "algebraic", correctExpression: "2", variables: [] },
      explanations: [],
      xp: 12,
    },
  ],
};

const staged: Lesson = {
  ...legacy,
  id: "staged",
  problems: [legacy.problems[0]],
  stages: [
    { kind: "concept", body: "intro" },
    {
      kind: "instruction-mc",
      problem: {
        id: "mc1",
        prompt: "pick",
        boardConfig: { boundingBox: [-1, 1, 1, -1], elements: [] },
        options: [
          { id: "a", label: "A", correct: false, teaching: "no" },
          { id: "b", label: "B", correct: true, teaching: "yes" },
        ],
        consolidation: { principle: "remember" },
        xp: 8,
      },
    },
    { kind: "problem", problem: legacy.problems[0] },
    {
      kind: "comprehension",
      task: {
        id: "comp1",
        prompt: "justify",
        lines: [
          {
            statement: "step",
            reasons: [
              { id: "r1", label: "R1", correct: true, teaching: "t" },
              { id: "r2", label: "R2", correct: false, teaching: "t" },
            ],
          },
        ],
        validatedText: "done",
        xp: 6,
      },
    },
    {
      kind: "handoff",
      handoff: {
        title: "Go",
        body: "prove it",
        freeplayPuzzleIds: ["puzzle-x"],
      },
    },
  ],
};

describe("lessonStages", () => {
  it("derives [concept, ...problems] for legacy lessons", () => {
    const stages = lessonStages(legacy);
    expect(stages.map((s) => s.kind)).toEqual(["concept", "problem", "problem"]);
    expect(lessonSolvableIds(legacy)).toEqual(["p1", "p2"]);
  });

  it("returns explicit stages and only counts solvable ids", () => {
    const stages = lessonStages(staged);
    expect(stages.map((s) => s.kind)).toEqual([
      "concept",
      "instruction-mc",
      "problem",
      "comprehension",
      "handoff",
    ]);
    expect(lessonSolvableIds(staged)).toEqual(["mc1", "p1", "comp1"]);
    expect(stageSolvableId(stages[0])).toBeNull(); // concept
    expect(stageSolvableId(stages[4])).toBeNull(); // handoff
    expect(stageXp(stages[1])).toBe(8); // instruction-mc
    expect(stageXp(stages[3])).toBe(6); // comprehension
    expect(stageXp(stages[0])).toBe(0); // concept
  });
});
```

Run `npx vitest run src/lib/content/__tests__/lessonStages.test.ts` → fails (module + types don't exist yet).

- [ ] **1.2 Add the new content types.** In `src/lib/content/types.ts`, append (after the existing `Problem` interface, before `Lesson`):

```ts
/** Forced dwell on feedback before the learner may advance (milliseconds). */
export interface DwellConfig {
  wrongMs: number; // dwell after a wrong/teaching selection
  correctMs: number; // dwell after the correct selection (consolidation)
}

export const DEFAULT_DWELL: DwellConfig = { wrongMs: 3000, correctMs: 1500 };

/**
 * One option of a direct-instruction multiple-choice stage. Every option
 * teaches: the correct option confirms the principle; wrong options name and
 * correct a specific misconception.
 */
export interface InstructionMCOption {
  id: string;
  label: string; // KaTeX / markdown
  correct: boolean;
  teaching: string; // shown immediately on selecting this option
  misconception?: string; // recorded as the mistake id (analytics)
  boardOverlayConfig?: JSXGraphDef; // optional overlay illustrating the teaching
}

/** Unskippable post-correct consolidation shown before the learner advances. */
export interface ConsolidationGate {
  principle: string; // the one thing to remember (KaTeX / markdown)
  selfExplainPrompt?: string; // if set, advancing requires acknowledging it
}

export interface InstructionMCProblem {
  id: string;
  prompt: string;
  exploreHint?: string;
  boardConfig: JSXGraphDef;
  options: InstructionMCOption[];
  consolidation: ConsolidationGate;
  dwell?: DwellConfig; // per-stage override of the forced dwell
  xp: number;
}

/** One line of a fill-justification proof-comprehension task. */
export interface ComprehensionLine {
  statement: string; // the claim of this proof step (KaTeX / markdown)
  reasons: InstructionMCOption[]; // candidate justifications; exactly one correct
}

export interface ComprehensionTask {
  id: string;
  prompt: string;
  boardConfig?: JSXGraphDef;
  lines: ComprehensionLine[];
  validatedText: string; // shown once every line is correctly justified
  dwell?: DwellConfig;
  xp: number;
}

/** Bridge from the lesson into the matching Freeplay puzzle(s). */
export interface HandoffStage {
  title: string;
  body: string; // KaTeX / markdown
  freeplayPuzzleIds: string[];
  ctaLabel?: string;
}

/**
 * An ordered unit of a lesson. `problem` wraps an existing {@link Problem}
 * rendered by the UNCHANGED ProblemPlayer (legacy + un-migrated content);
 * the other kinds are new direct-instruction / bridge stages.
 */
export type LessonStage =
  | { kind: "concept"; title?: string; body: string }
  | { kind: "instruction-mc"; problem: InstructionMCProblem }
  | { kind: "problem"; problem: Problem }
  | { kind: "comprehension"; task: ComprehensionTask }
  | { kind: "handoff"; handoff: HandoffStage };
```

Then extend the `Lesson` interface with the optional sequence (keep all existing fields):

```ts
export interface Lesson {
  id: string;
  title: string;
  summary: string;
  /** Short teaching intro shown before the first problem (KaTeX supported). */
  concept: string;
  problems: Problem[];
  /**
   * Optional explicit stage sequence. When present the lesson renders as these
   * stages; when absent a legacy `[concept, ...problems]` sequence is derived.
   */
  stages?: LessonStage[];
  /** Bonus XP for finishing the whole lesson. */
  completionXp: number;
}
```

- [ ] **1.3 Implement the derivation helpers.** Create `src/lib/content/lessonStages.ts`:

```ts
import type { Lesson, LessonStage } from "@/lib/content/types";

/**
 * The ordered stages for a lesson. Explicit `stages` win; otherwise a legacy
 * sequence is derived — a concept card followed by each problem rendered by the
 * unchanged ProblemPlayer.
 */
export function lessonStages(lesson: Lesson): LessonStage[] {
  if (lesson.stages && lesson.stages.length > 0) return lesson.stages;
  return [
    { kind: "concept", body: lesson.concept },
    ...lesson.problems.map(
      (problem) => ({ kind: "problem", problem }) as const,
    ),
  ];
}

/** Stable id of a stage that records progress/XP, or null for concept/handoff. */
export function stageSolvableId(stage: LessonStage): string | null {
  switch (stage.kind) {
    case "instruction-mc":
    case "problem":
      return stage.problem.id;
    case "comprehension":
      return stage.task.id;
    default:
      return null;
  }
}

/** XP a stage grants on first solve (0 for non-solvable stages). */
export function stageXp(stage: LessonStage): number {
  switch (stage.kind) {
    case "instruction-mc":
    case "problem":
      return stage.problem.xp;
    case "comprehension":
      return stage.task.xp;
    default:
      return 0;
  }
}

/**
 * The solvable stage ids for a lesson — the unit of completion and course
 * progress. Generalizes the legacy "problems" notion to every stage kind that
 * grants XP. For legacy lessons this equals the problem ids.
 */
export function lessonSolvableIds(lesson: Lesson): string[] {
  return lessonStages(lesson)
    .map(stageSolvableId)
    .filter((id): id is string => id !== null);
}
```

- [ ] **1.4 Verify + commit.** Run `npx vitest run src/lib/content/__tests__/lessonStages.test.ts` (green), then `npm run lint`. Commit:

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(content): add LessonStage model and stage-derivation helpers
EOF
)"
```

---

## Task 2 — Generalize progress tracking to solvable stage ids (pure, tested)

`reconcile`, the course rollup, and `applyAttempt` currently key off `lesson.problems` and **drop any solved id not in that array**. New stage kinds add new ids, so this generalizes them to `lessonSolvableIds(lesson)`. Legacy lessons are unaffected (their solvable ids equal their problem ids). Also adds the `lastStageIndex` resume bookmark field.

- [ ] **2.1 Add the resume bookmark field.** In `src/lib/progress/types.ts`, extend `LessonProgress`:

```ts
export interface LessonProgress {
  completedProblemIds: string[];
  problemStats: Record<string, ProblemStat>;
  xpEarned: number;
  completedAt?: number; // epoch ms
  lastProblemId?: string; // legacy: last problem viewed (kept for back-compat)
  lastStageIndex?: number; // last stage index viewed (staged-lesson resume)
}
```

- [ ] **2.2 Reconcile against solvable stage ids.** In `src/lib/progress/reconcile.ts`:

Add the import:

```ts
import { lessonSolvableIds } from "@/lib/content/lessonStages";
```

Change the valid-id map construction (was `lesson.problems.map((p) => p.id)`):

```ts
  const validProblemIds = new Map<string, Set<string>>();
  for (const lesson of COURSE.lessons) {
    validProblemIds.set(lesson.id, new Set(lessonSolvableIds(lesson)));
  }
```

Carry `lastStageIndex` through `reconcileLesson` (it currently rebuilds a fresh object and would drop it). Replace the final object construction in `reconcileLesson`:

```ts
  const lesson: LessonProgress = {
    completedProblemIds,
    problemStats,
    xpEarned: stored.xpEarned,
    ...(completedAt != null ? { completedAt } : {}),
    ...(lastProblemId != null ? { lastProblemId } : {}),
    ...(stored.lastStageIndex != null
      ? { lastStageIndex: stored.lastStageIndex }
      : {}),
  };
```

- [ ] **2.3 Complete lessons over solvable stage ids.** In `src/lib/progress/recordAttempt.ts`:

Add the import:

```ts
import { lessonSolvableIds } from "@/lib/content/lessonStages";
```

Replace the completion block (was `lessonDef.problems.every((p) => lp.completedProblemIds.includes(p.id))`):

```ts
  const lessonDef = COURSE.lessons.find((l) => l.id === input.lessonId);
  const solvableIds = lessonDef ? lessonSolvableIds(lessonDef) : [];
  let lessonCompleted = false;
  if (
    lessonDef &&
    !lp.completedAt &&
    solvableIds.length > 0 &&
    solvableIds.every((id) => lp.completedProblemIds.includes(id))
  ) {
    lp.completedAt = now;
    lp.xpEarned += lessonDef.completionXp;
    addedXp += lessonDef.completionXp;
    lessonCompleted = true;
  }
```

- [ ] **2.4 Count solvable stage ids in the course total.** In `src/lib/content/course.ts`:

Add the import and update `totalProblems()` (semantics: "solvable units"; unchanged for the 6 legacy lessons):

```ts
import { lessonSolvableIds } from "@/lib/content/lessonStages";

export function totalProblems(): number {
  return COURSE.lessons.reduce((n, l) => n + lessonSolvableIds(l).length, 0);
}
```

- [ ] **2.5 Update the two existing tests that iterate every lesson via `l.problems`.** These currently use `l.problems.map((p) => p.id)` as a proxy for "all solvable units in the lesson". That proxy is correct only while every lesson is legacy; the generalized invariant is `lessonSolvableIds(l)`. Updating now keeps both tests green (for legacy lessons `lessonSolvableIds(l)` equals the problem ids) **and** keeps them correct after the Task 8 migration (where `inscribed-angle` will have 5 solvable stages but only 1 entry in `problems`).

  In `src/lib/progress/__tests__/reconcile.test.ts`, add the import:

```ts
import { lessonSolvableIds } from "@/lib/content/lessonStages";
```

  and change the "reports 100% when every lesson is complete" loop body from `completedProblemIds: l.problems.map((p) => p.id)` to:

```ts
      lessons[l.id] = lessonWith({
        completedProblemIds: lessonSolvableIds(l),
        completedAt: 1,
      });
```

  In `src/lib/progress/__tests__/achievements.test.ts`, add the same import and change the "returns every achievement when the course is fully complete" loop body the same way:

```ts
      lessons[l.id] = lessonWith({
        completedProblemIds: lessonSolvableIds(l),
        completedAt: 1,
      });
```

- [ ] **2.6 Add a focused parity assertion.** Append to `src/lib/progress/__tests__/recordAttempt.test.ts` (it already imports `COURSE`, `applyAttempt`, `emptySnapshot`; add only the helper imports you need and avoid re-declaring the file's existing top-level `lesson`/`problems`):

```ts
import { lessonSolvableIds } from "@/lib/content/lessonStages";
import { getLesson } from "@/lib/content/course";

describe("solvable-id generalization (legacy parity)", () => {
  it("solvable ids equal problem ids for a legacy lesson", () => {
    const legacy = getLesson("parallel-lines") ?? COURSE.lessons[1];
    expect(lessonSolvableIds(legacy)).toEqual(legacy.problems.map((p) => p.id));
  });
});
```

> `getLesson` is added to the existing `@/lib/content/course` import (merge the named import; don't add a duplicate `import` line). If `parallel-lines` is not the exact id, the `?? COURSE.lessons[1]` fallback keeps it valid.

- [ ] **2.7 Verify + commit.** Run `npm test` (all suites green — confirms no regression in reconcile/recordAttempt), then `npm run lint`. Commit:

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(progress): track completion over solvable stage ids + lastStageIndex resume
EOF
)"
```

---

## Task 3 — Forced-dwell helper (pure duration tested + thin hook)

The feedback dwell that makes consolidation unskippable. The duration is a pure function (tested); the lock is a thin timer hook (verified by build/usage).

- [ ] **3.1 Write the failing test.** Create `src/lib/solvables/__tests__/dwell.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dwellDurationFor } from "@/lib/solvables/dwell";

describe("dwellDurationFor", () => {
  it("defaults to 3000ms wrong / 1500ms correct", () => {
    expect(dwellDurationFor("wrong")).toBe(3000);
    expect(dwellDurationFor("correct")).toBe(1500);
  });

  it("respects a per-stage override", () => {
    const cfg = { wrongMs: 5000, correctMs: 800 };
    expect(dwellDurationFor("wrong", cfg)).toBe(5000);
    expect(dwellDurationFor("correct", cfg)).toBe(800);
  });
});
```

Run `npx vitest run src/lib/solvables/__tests__/dwell.test.ts` → fails.

- [ ] **3.2 Implement.** Create `src/lib/solvables/dwell.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_DWELL, type DwellConfig } from "@/lib/content/types";

export type DwellOutcome = "correct" | "wrong";

/** Pure: how long the learner must dwell on feedback before advancing. */
export function dwellDurationFor(
  outcome: DwellOutcome,
  cfg: DwellConfig = DEFAULT_DWELL,
): number {
  return outcome === "wrong" ? cfg.wrongMs : cfg.correctMs;
}

/** Thin timer hook: `arm(ms)` locks for `ms`, then unlocks. `clear` cancels. */
export function useDwellLock(): {
  locked: boolean;
  arm: (ms: number) => void;
  clear: () => void;
} {
  const [locked, setLocked] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const arm = useCallback(
    (ms: number) => {
      clear();
      if (ms <= 0) {
        setLocked(false);
        return;
      }
      setLocked(true);
      timer.current = setTimeout(() => setLocked(false), ms);
    },
    [clear],
  );

  useEffect(() => clear, [clear]);

  return { locked, arm, clear };
}
```

- [ ] **3.3 Verify + commit.** `npx vitest run src/lib/solvables/__tests__/dwell.test.ts` (green) + `npm run lint`. Commit:

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(solvables): add forced-dwell duration helper and lock hook
EOF
)"
```

---

## Task 4 — Direct-instruction MC stage components

`InstructionMC` reframes multiple choice as direct instruction: every option (right or wrong) shows teaching, the wrong-answer dwell forces the learner to read it, and an unskippable `ConsolidationCard` restates the principle before Continue unlocks. No unit test (no DOM harness) — verified by build + lint + manual smoke in Task 8.

- [ ] **4.1 Consolidation card.** Create `src/components/solvables/ConsolidationCard.tsx`:

```tsx
import { MathText } from "@/components/MathText";
import type { ConsolidationGate } from "@/lib/content/types";

export function ConsolidationCard({
  consolidation,
  acknowledged,
  onAcknowledge,
}: {
  consolidation: ConsolidationGate;
  acknowledged: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <div className="border-l-2 border-ultramarine bg-ultramarine/5 px-4 py-4">
      <div className="font-mono text-xs uppercase tracking-[0.16em] text-ultramarine">
        Remember this
      </div>
      <p className="mt-2 font-serif text-lg leading-relaxed text-ink">
        <MathText>{consolidation.principle}</MathText>
      </p>
      {consolidation.selfExplainPrompt && (
        <div className="mt-3">
          <p className="text-sm text-ink-soft">
            <MathText>{consolidation.selfExplainPrompt}</MathText>
          </p>
          {!acknowledged && (
            <button
              onClick={onAcknowledge}
              className="mt-2 rounded-sm border border-ultramarine/50 px-4 py-1.5 font-mono text-xs uppercase tracking-wide text-ultramarine transition hover:bg-ultramarine/10"
            >
              I can explain it →
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **4.2 Instruction MC player.** Create `src/components/solvables/InstructionMC.tsx`:

```tsx
import { useMemo, useRef, useState } from "react";
import {
  GeometryBoard,
  type GeometryBoardHandle,
} from "@/components/geometry/GeometryBoard";
import { MathText } from "@/components/MathText";
import { FeedbackBanner } from "@/components/solvables/FeedbackBanner";
import { ConsolidationCard } from "@/components/solvables/ConsolidationCard";
import { dwellDurationFor, useDwellLock } from "@/lib/solvables/dwell";
import type {
  InstructionMCOption,
  InstructionMCProblem,
} from "@/lib/content/types";
import type { AttemptResult } from "@/lib/progress/ProgressContext";

interface Props {
  problem: InstructionMCProblem;
  alreadySolved: boolean;
  isLast: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onAttempt: (
    correct: boolean,
    mistakeId: string | undefined,
    elapsedMs: number,
  ) => Promise<AttemptResult>;
  onContinue: () => void;
}

export function InstructionMC({
  problem,
  alreadySolved,
  isLast,
  canGoBack,
  onBack,
  onAttempt,
  onContinue,
}: Props) {
  const boardRef = useRef<GeometryBoardHandle>(null);
  const startRef = useRef<number>(Date.now());
  const { locked, arm } = useDwellLock();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [solved, setSolved] = useState(alreadySolved);
  const [ack, setAck] = useState(
    alreadySolved || !problem.consolidation.selfExplainPrompt,
  );

  const selected = useMemo(
    () => problem.options.find((o) => o.id === selectedId) ?? null,
    [problem.options, selectedId],
  );

  const showOverlay = (opt: InstructionMCOption | null) => {
    boardRef.current?.clearOverlays();
    if (opt?.boardOverlayConfig)
      boardRef.current?.applyOverlay(opt.boardOverlayConfig);
  };

  const pick = (opt: InstructionMCOption) => {
    if (solved || locked) return;
    setSelectedId(opt.id);
    showOverlay(opt);
    const elapsed = Date.now() - startRef.current;
    if (opt.correct) {
      setSolved(true);
      arm(dwellDurationFor("correct", problem.dwell));
      void onAttempt(true, undefined, elapsed);
    } else {
      arm(dwellDurationFor("wrong", problem.dwell));
      void onAttempt(false, opt.misconception ?? `selected_${opt.id}`, elapsed);
    }
  };

  const canContinue = solved && !locked && ack;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-sm border border-ink/20 bg-white p-2 shadow-[3px_3px_0_0_rgba(27,23,20,0.08)]">
          <GeometryBoard ref={boardRef} def={problem.boardConfig} />
        </div>
        {problem.exploreHint && (
          <p className="text-center font-mono text-[0.7rem] uppercase tracking-wide text-ink-faint">
            <span className="mr-1">↔</span>
            {problem.exploreHint}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="font-serif text-xl leading-relaxed text-ink">
          <MathText>{problem.prompt}</MathText>
        </div>

        <div className="grid gap-2.5">
          {problem.options.map((opt, i) => {
            const chosen = selectedId === opt.id;
            const reveal = solved && opt.correct;
            const wrongChosen = chosen && !opt.correct && !solved;
            return (
              <button
                key={opt.id}
                disabled={solved || locked}
                onClick={() => pick(opt)}
                className={[
                  "flex items-center gap-3 rounded-sm border px-4 py-3 text-left text-base transition",
                  reveal
                    ? "border-correct bg-correct/10 text-ink"
                    : wrongChosen
                      ? "border-vermilion bg-vermilion/10 text-ink"
                      : "border-ink/20 bg-panel-soft text-ink hover:border-ultramarine hover:bg-ultramarine/5",
                  solved || locked ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "grid h-6 w-6 shrink-0 place-items-center font-mono text-xs font-semibold",
                    reveal
                      ? "bg-correct text-paper"
                      : wrongChosen
                        ? "bg-vermilion text-paper"
                        : "border border-ink/25 text-ink-soft",
                  ].join(" ")}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <MathText>{opt.label}</MathText>
              </button>
            );
          })}
        </div>

        {selected && (
          <FeedbackBanner
            variant={selected.correct ? "correct" : "wrong"}
            text={selected.teaching}
          />
        )}

        {solved && (
          <ConsolidationCard
            consolidation={problem.consolidation}
            acknowledged={ack}
            onAcknowledge={() => setAck(true)}
          />
        )}

        <div className="flex items-center gap-4">
          {canGoBack && (
            <button
              onClick={onBack}
              className="rounded-sm border border-ink/25 px-5 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
            >
              ← Previous
            </button>
          )}
          {solved && (
            <button
              onClick={onContinue}
              disabled={!canContinue}
              className={[
                "rounded-sm px-6 py-2.5 font-semibold transition",
                canContinue
                  ? "bg-vermilion text-paper hover:bg-vermilion-soft"
                  : "cursor-not-allowed bg-ink/15 text-ink-faint",
              ].join(" ")}
            >
              {locked
                ? "Read the explanation…"
                : isLast
                  ? "Finish lesson"
                  : "Continue"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **4.3 Verify + commit.** `npm run build` (tsc must pass — confirms component types line up with `GeometryBoardHandle.applyOverlay/clearOverlays` and `AttemptResult`) + `npm run lint`. Commit:

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(solvables): add InstructionMC direct-instruction stage with consolidation gate
EOF
)"
```

> If `npm run build` reports `applyOverlay`/`clearOverlays`/`getRefs` are not on `GeometryBoardHandle`, open `src/components/geometry/GeometryBoard.tsx`, read the exact imperative-handle method names, and adjust the calls. (They match `ProblemPlayer` usage as of this plan.)

---

## Task 5 — Proof-comprehension (fill-justification) stage

A reading-before-writing warmup: the proof skeleton is given; the learner selects the correct justification for each line from candidate rules that use Freeplay's vocabulary. Wrong picks teach + dwell; all-correct unlocks Continue.

- [ ] **5.1 Write the failing test.** Create `src/lib/solvables/__tests__/comprehension.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ComprehensionTask } from "@/lib/content/types";
import {
  isComprehensionValidated,
  reasonIsCorrect,
} from "@/lib/solvables/comprehension";

const task: ComprehensionTask = {
  id: "t",
  prompt: "p",
  validatedText: "done",
  xp: 5,
  lines: [
    {
      statement: "L1",
      reasons: [
        { id: "a", label: "A", correct: true, teaching: "" },
        { id: "b", label: "B", correct: false, teaching: "" },
      ],
    },
    {
      statement: "L2",
      reasons: [
        { id: "c", label: "C", correct: false, teaching: "" },
        { id: "d", label: "D", correct: true, teaching: "" },
      ],
    },
  ],
};

describe("comprehension validation", () => {
  it("reasonIsCorrect checks the chosen reason for a line", () => {
    expect(reasonIsCorrect(task, 0, "a")).toBe(true);
    expect(reasonIsCorrect(task, 0, "b")).toBe(false);
    expect(reasonIsCorrect(task, 1, "d")).toBe(true);
  });

  it("is validated only when every line has its correct reason", () => {
    expect(isComprehensionValidated(task, {})).toBe(false);
    expect(isComprehensionValidated(task, { 0: "a" })).toBe(false);
    expect(isComprehensionValidated(task, { 0: "a", 1: "c" })).toBe(false);
    expect(isComprehensionValidated(task, { 0: "a", 1: "d" })).toBe(true);
  });
});
```

Run `npx vitest run src/lib/solvables/__tests__/comprehension.test.ts` → fails.

- [ ] **5.2 Implement the pure validator.** Create `src/lib/solvables/comprehension.ts`:

```ts
import type { ComprehensionTask } from "@/lib/content/types";

/** Line index → chosen reason id. */
export type ComprehensionSelections = Record<number, string>;

export function reasonIsCorrect(
  task: ComprehensionTask,
  lineIndex: number,
  reasonId: string,
): boolean {
  const line = task.lines[lineIndex];
  if (!line) return false;
  return line.reasons.some((r) => r.id === reasonId && r.correct);
}

export function isComprehensionValidated(
  task: ComprehensionTask,
  selections: ComprehensionSelections,
): boolean {
  return task.lines.every((_, i) => {
    const sel = selections[i];
    return sel != null && reasonIsCorrect(task, i, sel);
  });
}
```

- [ ] **5.3 Implement the player.** Create `src/components/solvables/ComprehensionPlayer.tsx`:

```tsx
import { useMemo, useRef, useState } from "react";
import { MathText } from "@/components/MathText";
import { FeedbackBanner } from "@/components/solvables/FeedbackBanner";
import { dwellDurationFor, useDwellLock } from "@/lib/solvables/dwell";
import {
  isComprehensionValidated,
  type ComprehensionSelections,
} from "@/lib/solvables/comprehension";
import type { ComprehensionTask, InstructionMCOption } from "@/lib/content/types";
import type { AttemptResult } from "@/lib/progress/ProgressContext";

interface Props {
  task: ComprehensionTask;
  alreadySolved: boolean;
  isLast: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onAttempt: (
    correct: boolean,
    mistakeId: string | undefined,
    elapsedMs: number,
  ) => Promise<AttemptResult>;
  onContinue: () => void;
}

export function ComprehensionPlayer({
  task,
  alreadySolved,
  isLast,
  canGoBack,
  onBack,
  onAttempt,
  onContinue,
}: Props) {
  const startRef = useRef<number>(Date.now());
  const recordedRef = useRef(false);
  const { locked, arm } = useDwellLock();

  const solvedSelections = useMemo<ComprehensionSelections>(() => {
    const out: ComprehensionSelections = {};
    task.lines.forEach((line, i) => {
      const correct = line.reasons.find((r) => r.correct);
      if (correct) out[i] = correct.id;
    });
    return out;
  }, [task]);

  const [selections, setSelections] = useState<ComprehensionSelections>(
    alreadySolved ? solvedSelections : {},
  );

  const validated = isComprehensionValidated(task, selections);

  const pick = (lineIndex: number, reason: InstructionMCOption) => {
    if (locked) return;
    // A line already justified correctly is locked.
    const current = selections[lineIndex];
    const currentCorrect =
      current != null &&
      task.lines[lineIndex].reasons.some((r) => r.id === current && r.correct);
    if (currentCorrect) return;

    const nextSelections = { ...selections, [lineIndex]: reason.id };
    setSelections(nextSelections);
    const elapsed = Date.now() - startRef.current;

    if (!reason.correct) {
      arm(dwellDurationFor("wrong", task.dwell));
      void onAttempt(false, reason.misconception ?? `line${lineIndex}_${reason.id}`, elapsed);
      return;
    }
    if (isComprehensionValidated(task, nextSelections)) {
      arm(dwellDurationFor("correct", task.dwell));
      if (!recordedRef.current) {
        recordedRef.current = true;
        void onAttempt(true, undefined, elapsed);
      }
    }
  };

  const canContinue = validated && !locked;

  return (
    <div className="flex flex-col gap-5">
      <div className="font-serif text-xl leading-relaxed text-ink">
        <MathText>{task.prompt}</MathText>
      </div>

      <ol className="flex flex-col gap-4">
        {task.lines.map((line, i) => {
          const sel = selections[i];
          const selReason = line.reasons.find((r) => r.id === sel) ?? null;
          const lineCorrect = selReason?.correct ?? false;
          return (
            <li
              key={i}
              className="border-l-2 border-ink/15 bg-panel-soft px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 font-mono text-xs text-ink-faint">
                  {i + 1}.
                </span>
                <div className="flex-1">
                  <div className="font-serif text-lg text-ink">
                    <MathText>{line.statement}</MathText>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {line.reasons.map((r) => {
                      const chosen = sel === r.id;
                      const showCorrect = chosen && r.correct;
                      const showWrong = chosen && !r.correct;
                      return (
                        <button
                          key={r.id}
                          disabled={locked || lineCorrect}
                          onClick={() => pick(i, r)}
                          className={[
                            "rounded-sm border px-3 py-1.5 text-sm transition",
                            showCorrect
                              ? "border-correct bg-correct/10 text-ink"
                              : showWrong
                                ? "border-vermilion bg-vermilion/10 text-ink"
                                : "border-ink/20 bg-white text-ink hover:border-ultramarine hover:bg-ultramarine/5",
                            locked || lineCorrect
                              ? "cursor-default"
                              : "cursor-pointer",
                          ].join(" ")}
                        >
                          <MathText>{r.label}</MathText>
                        </button>
                      );
                    })}
                  </div>
                  {selReason && (
                    <p
                      className={[
                        "mt-2 text-sm leading-relaxed",
                        lineCorrect ? "text-correct" : "text-vermilion",
                      ].join(" ")}
                    >
                      <MathText>{selReason.teaching}</MathText>
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {validated && <FeedbackBanner variant="correct" text={task.validatedText} />}

      <div className="flex items-center gap-4">
        {canGoBack && (
          <button
            onClick={onBack}
            className="rounded-sm border border-ink/25 px-5 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            ← Previous
          </button>
        )}
        {validated && (
          <button
            onClick={onContinue}
            disabled={!canContinue}
            className={[
              "rounded-sm px-6 py-2.5 font-semibold transition",
              canContinue
                ? "bg-vermilion text-paper hover:bg-vermilion-soft"
                : "cursor-not-allowed bg-ink/15 text-ink-faint",
            ].join(" ")}
          >
            {locked ? "Read the proof…" : isLast ? "Finish lesson" : "Continue"}
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **5.4 Verify + commit.** `npx vitest run src/lib/solvables/__tests__/comprehension.test.ts` (green) + `npm run build` + `npm run lint`. Commit:

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(solvables): add fill-justification proof-comprehension stage
EOF
)"
```

---

## Task 6 — Handoff bridge to Freeplay

The terminal stage of a migrated lesson: a completion screen whose primary CTA opens the matching Freeplay puzzle, reusing the existing route `/freeplay/:puzzleId` and the `CompletionFigure` mark.

- [ ] **6.1 Implement.** Create `src/components/solvables/HandoffCard.tsx`:

```tsx
import { Link } from "react-router-dom";
import { MathText } from "@/components/MathText";
import { CompletionFigure } from "@/components/ByrneMark";
import type { HandoffStage } from "@/lib/content/types";

export function HandoffCard({
  handoff,
  nextLessonId,
}: {
  handoff: HandoffStage;
  nextLessonId?: string;
}) {
  const primary = handoff.freeplayPuzzleIds[0];
  return (
    <div className="mx-auto max-w-xl text-center">
      <div className="mb-2 flex justify-center">
        <CompletionFigure size={104} />
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
        Quod erat demonstrandum
      </p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
        {handoff.title}
      </h1>
      <p className="mt-3 font-serif text-lg leading-relaxed text-ink-soft">
        <MathText>{handoff.body}</MathText>
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {primary && (
          <Link
            to={`/freeplay/${primary}`}
            className="rounded-sm bg-vermilion px-6 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
          >
            {handoff.ctaLabel ?? "Enter Freeplay"} →
          </Link>
        )}
        {nextLessonId ? (
          <Link
            to={`/lesson/${nextLessonId}`}
            className="rounded-sm border border-ink/25 px-6 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            Next proposition →
          </Link>
        ) : (
          <Link
            to="/course"
            className="rounded-sm border border-ink/25 px-6 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            Back to course
          </Link>
        )}
      </div>
    </div>
  );
}
```

> Confirm `CompletionFigure` is exported from `@/components/ByrneMark` (it is — `LessonPlayer` imports it). If it takes different props, match the `LessonPlayer` usage.

- [ ] **6.2 Verify + commit.** `npm run build` + `npm run lint`. Commit:

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(solvables): add Freeplay handoff bridge card
EOF
)"
```

---

## Task 7 — Render lessons as stages (`LessonPlayer` + `updateLessonStage`)

Rewires `LessonPlayer` to iterate `lessonStages(lesson)` and render each stage by kind, reusing the unchanged `ProblemPlayer` for `problem` stages. Adds the `updateLessonStage` resume bookmark to `ProgressContext`. Legacy lessons render `[concept, ...problems]` and behave exactly as before (concept intro → problems → QED screen). This is the integration task; full staged behavior is exercised in Task 8.

- [ ] **7.1 Add `updateLessonStage` to the progress context.** In `src/lib/progress/ProgressContext.tsx`:

Extend the interface:

```ts
interface ProgressContextValue {
  ready: boolean;
  snapshot: ProgressSnapshot;
  recordAttempt: (input: AttemptInput) => Promise<AttemptResult>;
  updateLessonPosition: (lessonId: string, problemId: string) => void;
  updateLessonStage: (lessonId: string, stageIndex: number) => void;
  flushProgress: () => Promise<void>;
  isProblemSolved: (lessonId: string, problemId: string) => boolean;
  getLessonProgress: (lessonId: string) => LessonProgress | undefined;
  courseCompletionPct: () => number;
}
```

Add the implementation (next to `updateLessonPosition`):

```ts
  const updateLessonStage = useCallback(
    (lessonId: string, stageIndex: number) => {
      if (testMode) return;
      const prev = snapshotRef.current;
      const existing = prev.lessons[lessonId];
      if (
        existing?.lastStageIndex === stageIndex &&
        prev.course[COURSE.id]?.lastLessonId === lessonId
      ) {
        return;
      }

      const lp: LessonProgress = {
        ...(existing ?? emptyLesson()),
        lastStageIndex: stageIndex,
      };
      const next: ProgressSnapshot = {
        ...prev,
        lessons: { ...prev.lessons, [lessonId]: lp },
        course: {
          ...prev.course,
          [COURSE.id]: {
            completionPct: prev.course[COURSE.id]?.completionPct ?? 0,
            completedLessonIds:
              prev.course[COURSE.id]?.completedLessonIds ?? [],
            lastLessonId: lessonId,
          },
        },
      };

      setSnapshot(next);
      snapshotRef.current = next;
      void doPersist(next, lessonId, []);
    },
    [doPersist, testMode],
  );
```

Expose it in the provider `value` object (add `updateLessonStage,` next to `updateLessonPosition,`).

- [ ] **7.2 Rewrite `LessonPlayer`.** Replace the entire contents of `src/pages/LessonPlayer.tsx` with:

```tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProblemPlayer } from "@/components/solvables/ProblemPlayer";
import { InstructionMC } from "@/components/solvables/InstructionMC";
import { ComprehensionPlayer } from "@/components/solvables/ComprehensionPlayer";
import { HandoffCard } from "@/components/solvables/HandoffCard";
import { MathText } from "@/components/MathText";
import { Spinner } from "@/components/Spinner";
import { CompletionFigure, ConstructionProgress } from "@/components/ByrneMark";
import { COURSE, getLesson, nextLessonId } from "@/lib/content/course";
import { lessonStages, stageSolvableId } from "@/lib/content/lessonStages";
import { useProgress } from "@/lib/progress/ProgressContext";
import { useAuth } from "@/lib/auth/AuthContext";

export function LessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { testMode } = useAuth();
  const {
    ready,
    recordAttempt,
    updateLessonStage,
    getLessonProgress,
  } = useProgress();

  const lesson = lessonId ? getLesson(lessonId) : undefined;
  const lessonIdx = COURSE.lessons.findIndex((l) => l.id === lessonId);
  const stages = useMemo(() => (lesson ? lessonStages(lesson) : []), [lesson]);

  // Resume: prefer the explicit stage bookmark, then map a legacy problem
  // bookmark to its stage, then the first unsolved solvable stage, else start.
  const initialStageIndex = useMemo(() => {
    if (!lesson || stages.length === 0) return 0;
    if (testMode) return 0;
    const lp = getLessonProgress(lesson.id);
    const last = stages.length - 1;
    if (!lp) return 0;
    if (lp.lastStageIndex != null)
      return Math.min(Math.max(lp.lastStageIndex, 0), last);
    if (lp.lastProblemId) {
      const idx = stages.findIndex(
        (s) => stageSolvableId(s) === lp.lastProblemId,
      );
      if (idx >= 0) return idx;
    }
    if (lp.completedProblemIds.length === 0) return 0;
    const firstOpen = stages.findIndex((s) => {
      const id = stageSolvableId(s);
      return id != null && !lp.completedProblemIds.includes(id);
    });
    return firstOpen >= 0 ? firstOpen : 0;
  }, [lesson, stages, getLessonProgress, testMode]);

  const [stageIndex, setStageIndex] = useState(initialStageIndex);
  const [lessonDone, setLessonDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setStageIndex(initialStageIndex);
    setLessonDone(false);
    setToast(null);
  }, [lessonId, initialStageIndex]);

  if (!ready) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center">
        <p className="font-serif text-lg italic text-ink-soft">
          That proposition could not be found.
        </p>
        <Link
          to="/course"
          className="mt-4 inline-block font-mono text-xs uppercase tracking-wide text-ultramarine hover:text-vermilion"
        >
          ← Back to course
        </Link>
      </div>
    );
  }

  const stage = stages[stageIndex];
  const isLastStage = stageIndex === stages.length - 1;
  const nextId = nextLessonId(lesson.id);

  const solved = (id: string | null): boolean =>
    !testMode &&
    id != null &&
    Boolean(getLessonProgress(lesson.id)?.completedProblemIds.includes(id));

  const advance = () => {
    const next = stageIndex + 1;
    if (next >= stages.length) {
      setLessonDone(true);
      return;
    }
    updateLessonStage(lesson.id, next);
    setStageIndex(next);
  };

  const goBack = () => {
    const prev = stageIndex - 1;
    if (prev < 0) return;
    updateLessonStage(lesson.id, prev);
    setStageIndex(prev);
  };

  const recordStageAttempt = async (
    stageId: string,
    xp: number,
    correct: boolean,
    mistakeId: string | undefined,
    elapsedMs: number,
    revealed = false,
  ) => {
    const result = await recordAttempt({
      lessonId: lesson.id,
      problemId: stageId,
      problemXp: revealed ? 0 : xp,
      correct,
      mistakeId,
      elapsedMs,
    });
    if (result.addedXp > 0) {
      setToast(`+${result.addedXp} XP`);
      setTimeout(() => setToast(null), 2000);
    }
    if (result.newAchievementIds.length > 0) {
      setToast("Achievement unlocked!");
      setTimeout(() => setToast(null), 3000);
    }
    return result;
  };

  if (lessonDone) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-2 flex justify-center">
          <CompletionFigure size={104} />
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-vermilion">
          Quod erat demonstrandum
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-tight text-ink">
          Proposition proved
        </h1>
        <p className="mt-2 font-serif text-lg text-ink-soft">
          You finished <strong className="text-ink">{lesson.title}</strong> and
          earned bonus XP.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {nextId ? (
            <Link
              to={`/lesson/${nextId}`}
              className="rounded-sm bg-vermilion px-6 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
            >
              Next proposition →
            </Link>
          ) : (
            <Link
              to="/course"
              className="rounded-sm bg-vermilion px-6 py-2.5 font-semibold text-paper transition hover:bg-vermilion-soft"
            >
              Back to course
            </Link>
          )}
          <Link
            to="/"
            className="rounded-sm border border-ink/25 px-6 py-2.5 font-semibold text-ink transition hover:border-ink hover:bg-panel-soft"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <Link
          to="/course"
          className="font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:text-vermilion"
        >
          ← Course
        </Link>
        <p className="mt-3 font-mono text-xs uppercase tracking-[0.2em] text-vermilion">
          Proposition {lessonIdx + 1} · Step {stageIndex + 1} of {stages.length}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-tight text-ink">
          {lesson.title}
        </h1>
        <ConstructionProgress
          pct={((stageIndex + 1) / stages.length) * 100}
          className="mt-4 max-w-md"
        />
      </header>

      {stage.kind === "concept" && (
        <div className="border-l-2 border-ultramarine bg-panel-soft p-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            {stage.title ?? "The idea"}
          </h2>
          <p className="mt-3 font-serif text-lg leading-relaxed text-ink">
            <MathText>{stage.body}</MathText>
          </p>
          <button
            onClick={advance}
            className="mt-5 rounded-sm bg-vermilion px-5 py-2 font-semibold text-paper transition hover:bg-vermilion-soft"
          >
            Start
          </button>
        </div>
      )}

      {stage.kind === "problem" && (
        <ProblemPlayer
          key={`${stage.problem.id}-${testMode}`}
          problem={stage.problem}
          alreadySolved={solved(stage.problem.id)}
          isLast={isLastStage}
          canGoBack={stageIndex > 0}
          onBack={goBack}
          onAttempt={(correct, mistakeId, elapsedMs, revealed) =>
            recordStageAttempt(
              stage.problem.id,
              stage.problem.xp,
              correct,
              mistakeId,
              elapsedMs,
              revealed,
            )
          }
          onContinue={advance}
        />
      )}

      {stage.kind === "instruction-mc" && (
        <InstructionMC
          key={`${stage.problem.id}-${testMode}`}
          problem={stage.problem}
          alreadySolved={solved(stage.problem.id)}
          isLast={isLastStage}
          canGoBack={stageIndex > 0}
          onBack={goBack}
          onAttempt={(correct, mistakeId, elapsedMs) =>
            recordStageAttempt(
              stage.problem.id,
              stage.problem.xp,
              correct,
              mistakeId,
              elapsedMs,
            )
          }
          onContinue={advance}
        />
      )}

      {stage.kind === "comprehension" && (
        <ComprehensionPlayer
          key={`${stage.task.id}-${testMode}`}
          task={stage.task}
          alreadySolved={solved(stage.task.id)}
          isLast={isLastStage}
          canGoBack={stageIndex > 0}
          onBack={goBack}
          onAttempt={(correct, mistakeId, elapsedMs) =>
            recordStageAttempt(
              stage.task.id,
              stage.task.xp,
              correct,
              mistakeId,
              elapsedMs,
            )
          }
          onContinue={advance}
        />
      )}

      {stage.kind === "handoff" && (
        <HandoffCard handoff={stage.handoff} nextLessonId={nextId} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 animate-[fadein_180ms_ease-out] rounded-sm bg-ink px-4 py-2 font-mono text-sm font-semibold text-paper shadow-[3px_3px_0_0_rgba(192,57,43,0.6)]">
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **7.3 Verify backward-compatibility (build + lint + manual).** Run `npm run build` and `npm run lint` (both clean). Then `npm run dev` and manually confirm a **legacy** lesson is unchanged:
  - Open `/lesson/triangle-angle-sum` (or any lesson except `inscribed-angle`).
  - The concept card shows first with a **Start** button; clicking it advances to problem 1.
  - Each problem renders via the existing `ProblemPlayer` (MC / algebraic / geometric all behave as before, including Reveal).
  - The header reads "Step _k_ of _N_" and the progress bar advances.
  - Finishing the last problem shows the "Proposition proved" QED screen with the correct Next/Dashboard links.
  - Reload mid-lesson → resumes on the stage you left (bookmark), and solved problems still show solved.

- [ ] **7.4 Commit.**

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(lesson): render lessons as a generic stage sequence with stage resume
EOF
)"
```

---

## Task 8 — Author the `inscribed-angle` pilot arc + integration test

Encodes the co-authored pilot content as an explicit `stages` sequence and proves the staged completion/persistence path end-to-end against the real course. Content decisions are fixed: every option teaches; wrong options name a misconception; stage 5 is "an interesting fact" (NOT named Thales) and the concept intro drops the "(Thales)" mention; the comprehension lines reuse Freeplay's rule name **inscribed angle (same arc)** and the **concyclic/cyclic** vocabulary so the handoff is seamless.

- [ ] **8.1 Rewrite the lesson with stages.** Replace the entire contents of `src/lib/content/lessons/inscribedAngle.ts` with:

```ts
import type { Lesson, Problem } from "@/lib/content/types";
import { angleDeg } from "@/lib/geometry/measure";
import { subtendedCentralDeg } from "@/lib/geometry/circleAngles";
import {
  angleMark,
  centralArcMark,
  circle,
  COLORS,
  glider,
  keepChordClearOfApexes,
  readout,
  sameSideAsCenter,
  segment,
} from "@/lib/content/boards";
import type { BoardElementDef } from "@/lib/geometry/board-types";

const BOX: [number, number, number, number] = [-6, 6, 6, -6];

function center(): BoardElementDef {
  return {
    id: "O",
    type: "point",
    parents: [0, 0],
    attributes: {
      name: "O",
      size: 3,
      fixed: true,
      fillColor: "#fff",
      strokeColor: "#9c8c70",
      strokeWidth: 2,
    },
  };
}

function radiusAnchor(): BoardElementDef {
  return {
    id: "R",
    type: "point",
    parents: [3.6, 0],
    attributes: { visible: false, fixed: true },
  };
}

// Stage 3 remains a classic algebraic problem rendered by the unchanged
// ProblemPlayer; it is the lesson's only entry in `problems`.
const expressProblem: Problem = {
  id: "ia-express",
  prompt:
    "Let the central angle be $c = \\angle AOB$ (see readout). **Express the inscribed angle $\\angle APB$** in terms of $c$.",
  xp: 10,
  boardConfig: {
    boundingBox: BOX,
    elements: [
      center(),
      radiusAnchor(),
      circle("c", "O", "R"),
      glider("A", -3.0, -1.9, "c"),
      glider("B", 3.2, -1.6, "c"),
      glider("P", -0.6, 3.55, "c"),
      segment("O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
      segment("O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
      segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
      segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
      ...centralArcMark("cen", "O", "A", "B", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
      angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.9 }),
      readout(-5.7, 5.4, (r) => `c = ∠AOB = ${subtendedCentralDeg(r.O, r.A, r.B, r.P).toFixed(1)}°`),
      readout(-5.7, 4.7, (r) => `∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
    ],
  },
  answerConfig: {
    kind: "algebraic",
    correctExpression: "c/2",
    variables: ["c"],
    placeholder: "c/2",
  },
  explanations: [
    {
      triggerCondition: "default_wrong",
      text: "The inscribed angle is half the central angle: $\\angle APB = \\dfrac{c}{2}$. Check the readouts — the second is always half the first.",
    },
  ],
  solutionText: "$\\angle APB = \\dfrac{c}{2}$.",
};

export const inscribedAngle: Lesson = {
  id: "inscribed-angle",
  title: "The Inscribed Angle Theorem",
  summary: "An inscribed angle is half the central angle on the same arc.",
  concept:
    "An **inscribed angle** is half of the **central angle** that subtends the same arc. Two consequences you'll use constantly: angles subtending the *same* arc are equal, and an angle inscribed in a *semicircle* is a right angle.",
  completionXp: 35,
  problems: [expressProblem],
  stages: [
    {
      kind: "concept",
      title: "The idea",
      body: "An **inscribed angle** is half of the **central angle** that subtends the same arc. We'll see why, meet two consequences you'll use constantly, then prove one of them yourself.",
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "ia-half",
        prompt:
          "Blue is the central angle $\\angle AOB$; orange is the inscribed angle $\\angle APB$ on the same arc. Drag $P$ around the arc and compare the two readouts.",
        exploreHint: "Drag P around the arc",
        boardConfig: {
          boundingBox: BOX,
          elements: [
            center(),
            radiusAnchor(),
            circle("c", "O", "R"),
            glider("A", -3.38, -1.23, "c"),
            glider("B", 3.38, -1.23, "c"),
            glider("P", 0, 3.6, "c"),
            segment("O", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            segment("O", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            ...centralArcMark("cen", "O", "A", "B", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
            angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.9 }),
            readout(-5.7, 5.4, (r) => `central ∠AOB = ${subtendedCentralDeg(r.O, r.A, r.B, r.P).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `inscribed ∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
          ],
        },
        xp: 10,
        options: [
          {
            id: "eq",
            label: "Equal to it",
            correct: false,
            misconception: "equal",
            teaching:
              "Check the readouts — they are never equal. The inscribed angle is consistently *smaller*: exactly half the central angle on the same arc.",
          },
          {
            id: "half",
            label: "Half of it",
            correct: true,
            teaching:
              "Exactly. Drag $P$ anywhere on the arc and the inscribed $\\angle APB$ stays at half of the central $\\angle AOB$.",
          },
          {
            id: "dbl",
            label: "Double it",
            correct: false,
            misconception: "inverted",
            teaching:
              "Backwards: the *central* angle is the larger one (double), so the inscribed angle is **half** the central angle.",
          },
          {
            id: "qtr",
            label: "A quarter of it",
            correct: false,
            misconception: "wrong-ratio",
            teaching:
              "Not a quarter — the readouts hold a steady $1:2$ ratio, so the inscribed angle is **half**, not a quarter.",
          },
        ],
        consolidation: {
          principle:
            "**Inscribed Angle Theorem:** an inscribed angle is half the central angle subtending the same arc — $\\angle APB = \\tfrac12\\angle AOB$.",
          selfExplainPrompt:
            "In your own words: why doesn't moving $P$ along the arc change the angle?",
        },
      },
    },
    { kind: "problem", problem: expressProblem },
    {
      kind: "instruction-mc",
      problem: {
        id: "ia-same-arc",
        prompt:
          "Two apexes $P$ and $Q$ both sit on the major arc above chord $AB$. Drag them independently and watch $\\angle APB$ and $\\angle AQB$.",
        exploreHint: "Drag P and Q independently",
        boardConfig: {
          boundingBox: BOX,
          elements: [
            center(),
            radiusAnchor(),
            circle("c", "O", "R"),
            { ...glider("A", -3.38, -1.23, "c"), constrain: keepChordClearOfApexes("O", "B", ["P", "Q"]) },
            { ...glider("B", 3.38, -1.23, "c"), constrain: keepChordClearOfApexes("O", "A", ["P", "Q"]) },
            { ...glider("P", -1.8, 3.1, "c"), constrain: sameSideAsCenter("O", "A", "B") },
            { ...glider("Q", 2.0, 2.95, "c"), constrain: sameSideAsCenter("O", "A", "B") },
            segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("Q", "A", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            segment("Q", "B", { strokeColor: COLORS.BRAND, strokeWidth: 2 }),
            angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT, radius: 0.8 }),
            angleMark("A", "Q", "B", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.8 }),
            readout(-5.7, 5.4, (r) => `∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠AQB = ${angleDeg(r.A, r.Q, r.B).toFixed(1)}°`),
          ],
        },
        xp: 12,
        options: [
          {
            id: "equal",
            label: "They are always equal",
            correct: true,
            teaching:
              "Both subtend the same chord $AB$ from the same arc, so each is half of the *same* central angle — equal, wherever $P$ and $Q$ sit.",
          },
          {
            id: "sum180",
            label: "They sum to $180^\\circ$",
            correct: false,
            misconception: "opposite-arc",
            teaching:
              "That is the rule for *opposite* angles of a cyclic quadrilateral — apexes on **opposite** arcs. Here $P$ and $Q$ share the **same** arc, so the angles are equal.",
          },
          {
            id: "depends",
            label: "It depends on where $P$ and $Q$ are",
            correct: false,
            misconception: "position-dependent",
            teaching:
              "Drag them — the two readouts stay locked together. Position on the arc doesn't matter; only the shared arc does.",
          },
        ],
        consolidation: {
          principle:
            "Angles subtending the **same arc** are equal: $\\angle APB = \\angle AQB$. This is the workhorse of angle chasing with concyclic points.",
        },
      },
    },
    {
      kind: "instruction-mc",
      problem: {
        id: "ia-semicircle",
        prompt:
          "Now $AB$ is a **diameter** (it passes through the center $O$). Drag $P$ around the circle. What is $\\angle APB$?",
        exploreHint: "Drag P around the circle",
        boardConfig: {
          boundingBox: BOX,
          elements: [
            center(),
            { id: "A", type: "point", parents: [-3.6, 0], attributes: { name: "A", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
            { id: "B", type: "point", parents: [3.6, 0], attributes: { name: "B", fixed: true, size: 4, fillColor: "#fff", strokeColor: COLORS.BRAND, strokeWidth: 2 } },
            circle("c", "O", "B"),
            segment("A", "B", { strokeColor: "#9c8c70", strokeWidth: 2, dash: 2 }),
            glider("P", 1.2, 3.4, "c"),
            segment("P", "A", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            segment("P", "B", { strokeColor: COLORS.ACCENT, strokeWidth: 2 }),
            ...centralArcMark("cen", "O", "A", "B", "P", { fillColor: COLORS.BRAND, strokeColor: COLORS.BRAND, radius: 0.9 }),
            angleMark("A", "P", "B", { fillColor: COLORS.ACCENT, strokeColor: COLORS.ACCENT }),
            readout(-5.7, 5.4, (r) => `central ∠AOB = ${angleDeg(r.A, r.O, r.B).toFixed(1)}°`),
            readout(-5.7, 4.7, (r) => `∠APB = ${angleDeg(r.A, r.P, r.B).toFixed(1)}°`),
          ],
        },
        xp: 12,
        options: [
          {
            id: "a60",
            label: "$60^\\circ$",
            correct: false,
            misconception: "guess-60",
            teaching:
              "Drag $P$ — the readout never settles on $60^\\circ$. With $AB$ a diameter the central angle is $180^\\circ$, so the inscribed angle is half: $90^\\circ$.",
          },
          {
            id: "a90",
            label: "$90^\\circ$",
            correct: true,
            teaching:
              "Right. A diameter spans a straight central angle of $180^\\circ$, and half of that is a right angle — for **every** position of $P$.",
          },
          {
            id: "a120",
            label: "It varies as $P$ moves",
            correct: false,
            misconception: "thinks-varies",
            teaching:
              "It looks like it might, but the readout is pinned at $90^\\circ$: a diameter always gives a right angle, wherever $P$ is.",
          },
        ],
        consolidation: {
          principle:
            "A neat special case worth remembering: an angle inscribed in a **semicircle** is always a right angle ($90^\\circ$). It falls straight out of the half-the-central-angle rule.",
        },
      },
    },
    {
      kind: "comprehension",
      task: {
        id: "ia-comprehension",
        prompt:
          "Here is the proof that two angles on the same arc are equal — the exact fact you'll prove in Freeplay. Pick the justification for each line.",
        xp: 8,
        lines: [
          {
            statement: "$A, B, P, Q$ lie on one circle (they are **concyclic**).",
            reasons: [
              { id: "given", label: "Given", correct: true, teaching: "Yes — this is the setup we are handed." },
              { id: "iat", label: "Inscribed Angle Theorem", correct: false, misconception: "rule-vs-given", teaching: "Not yet — that's the *tool* we apply next; the shared circle is simply given." },
              { id: "tsum", label: "Angle sum in a triangle", correct: false, misconception: "irrelevant-rule", teaching: "No triangle angle-sum here; the points being concyclic is just the given." },
            ],
          },
          {
            statement:
              "$\\angle APB$ and $\\angle AQB$ subtend the **same chord $AB$** from the **same arc**.",
            reasons: [
              { id: "samearc", label: "Both apexes lie on the same arc", correct: true, teaching: "Exactly — $P$ and $Q$ are on the same side of $AB$, so both angles open onto the same arc." },
              { id: "vertical", label: "Vertical angles", correct: false, misconception: "no-crossing", teaching: "There is no $X$-crossing here; this is about a shared arc, not vertical angles." },
              { id: "supp", label: "They are supplementary", correct: false, misconception: "opposite-arc", teaching: "Supplementary is the *opposite-arc* (cyclic-quadrilateral) case. Same arc gives equality, not a sum of $180^\\circ$." },
            ],
          },
          {
            statement: "$\\therefore\\ \\angle APB = \\angle AQB$.",
            reasons: [
              { id: "inscribed-same", label: "Inscribed angle (same arc)", correct: true, teaching: "That's the rule, by its Freeplay name: equal inscribed angles on the same arc." },
              { id: "alt", label: "Alternate angles", correct: false, misconception: "needs-parallels", teaching: "Alternate angles need parallel lines; here equality comes from the inscribed-angle rule." },
              { id: "line", label: "Angles on a straight line", correct: false, misconception: "no-straight-line", teaching: "No straight-line pair here — the equality is the inscribed-angle (same arc) rule." },
            ],
          },
        ],
        validatedText:
          "That's the entire proof: from $A, B, P, Q$ concyclic, the rule **inscribed angle (same arc)** gives $\\angle APB = \\angle AQB$. Now build it yourself.",
      },
    },
    {
      kind: "handoff",
      handoff: {
        title: "Now prove it yourself",
        body: "You've seen *why* it's true and read the proof. In Freeplay you'll construct it step by step on a figure you can drag — state that $A, B, P, Q$ are concyclic and derive $\\angle APB = \\angle AQB$.",
        freeplayPuzzleIds: ["inscribed-angle"],
        ctaLabel: "Open the Freeplay proof",
      },
    },
  ],
};
```

- [ ] **8.2 Add the staged-completion integration test.** Create `src/lib/progress/__tests__/stagedProgress.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getLesson } from "@/lib/content/course";
import { lessonSolvableIds } from "@/lib/content/lessonStages";
import { applyAttempt } from "@/lib/progress/recordAttempt";
import { reconcileSnapshot } from "@/lib/progress/reconcile";
import { emptySnapshot, type ProgressSnapshot } from "@/lib/progress/types";

const SOLVABLE = ["ia-half", "ia-express", "ia-same-arc", "ia-semicircle", "ia-comprehension"];

describe("inscribed-angle staged lesson progress", () => {
  it("exposes exactly the solvable stage ids", () => {
    const lesson = getLesson("inscribed-angle")!;
    expect(lessonSolvableIds(lesson)).toEqual(SOLVABLE);
  });

  it("completes only after every solvable stage is solved, awarding completion XP", () => {
    let snap: ProgressSnapshot = emptySnapshot();
    const completions: boolean[] = [];
    SOLVABLE.forEach((id) => {
      const { next, result } = applyAttempt(
        snap,
        { lessonId: "inscribed-angle", problemId: id, problemXp: 10, correct: true, elapsedMs: 1000 },
        1_000_000,
      );
      snap = next;
      completions.push(result.lessonCompleted);
    });
    // Not complete until the final solvable stage.
    expect(completions).toEqual([false, false, false, false, true]);
    expect(snap.lessons["inscribed-angle"].completedAt).toBe(1_000_000);
    // Completion XP (35) is included on top of the per-stage XP.
    expect(snap.totalXp).toBe(10 * SOLVABLE.length + 35);
  });

  it("reconcile keeps all solvable stage ids and derived completion", () => {
    let snap: ProgressSnapshot = emptySnapshot();
    SOLVABLE.forEach((id) => {
      snap = applyAttempt(snap, {
        lessonId: "inscribed-angle",
        problemId: id,
        problemXp: 10,
        correct: true,
        elapsedMs: 100,
      }).next;
    });
    const { snapshot } = reconcileSnapshot(snap);
    expect(snapshot.lessons["inscribed-angle"].completedProblemIds.sort()).toEqual(
      [...SOLVABLE].sort(),
    );
    expect(snapshot.lessons["inscribed-angle"].completedAt).toBeTruthy();
  });
});
```

Run `npx vitest run src/lib/progress/__tests__/stagedProgress.test.ts` → green.

- [ ] **8.3 Full suite + build + lint.** Run `npm test` (all green), `npm run build`, `npm run lint`. Fix any fallout (most likely: a stale reference to `inscribedAngle.problems[k]` elsewhere — grep `ia-half|ia-same-arc|ia-semicircle` across `src` to confirm nothing outside the lesson/Freeplay depends on those being top-level `problems`).

- [ ] **8.4 Manual smoke (the whole arc).** `npm run dev`, open `/lesson/inscribed-angle`, and confirm:
  - **Concept** card shows and contains **no** "Thales" mention; Start advances.
  - **Stage 2 (ia-half):** picking a wrong option shows its teaching; the Continue button reads "Read the explanation…" and stays disabled for ~3.0s with options locked; after the dwell, options re-enable. Picking **Half of it** shows confirming teaching + a "Remember this" consolidation with an "I can explain it →" prompt; Continue stays disabled until you acknowledge **and** ~1.5s passes.
  - **Stage 3 (ia-express):** renders via the existing `ProblemPlayer`; `c/2` is accepted; Reveal still works.
  - **Stage 4 (ia-same-arc)** and **Stage 5 (ia-semicircle):** same direct-instruction behavior; stage 5 reads as an interesting fact with **no** "Thales" naming.
  - **Stage 6 (comprehension):** three proof lines; a wrong reason teaches + dwells; once all three correct reasons are chosen, the validated banner appears and Continue unlocks. Reasons include the literal **Inscribed angle (same arc)** label.
  - **Stage 7 (handoff):** completion screen; "Open the Freeplay proof →" navigates to `/freeplay/inscribed-angle`; the secondary link goes to the next proposition.
  - **XP/persistence:** "+XP" toasts fire on first solve of each solvable stage; the completion-XP toast fires when the comprehension stage is solved; reloading mid-lesson resumes on the stage you left; revisiting shows solved stages as solved; the Dashboard course % reflects the five new solvable units.

- [ ] **8.5 Commit.**

```bash
git add src/ && git commit -m "$(cat <<'EOF'
feat(content): ship inscribed-angle direct-instruction arc into Freeplay
EOF
)"
```

---

## Definition of Done (Phase 1)

- `npm test`, `npm run build`, and `npm run lint` are all green.
- Every legacy lesson renders and behaves exactly as before (concept → `ProblemPlayer` problems → QED), with progress/XP/achievements preserved.
- The `inscribed-angle` lesson plays the full arc: concept → direct-instruction MC (every option teaches; forced 3.0s/1.5s dwell; unskippable consolidation) → algebraic problem → two more instruction MCs → fill-justification comprehension → Freeplay handoff.
- Stage progress, completion, and resume persist correctly (solvable-stage-id model), verified by `stagedProgress.test.ts` and the manual smoke.
- All work is on `lessons-to-freeplay-arc`; `movable-freeplay-figures` @ `9602e5d` remains a clean rollback point.

## Out of scope (later phases — see the spec)

- **P2:** migrate the remaining lessons to stages; author handoffs for their Freeplay puzzles; hint scaffolding.
- **P3:** spaced retrieval / interleaving / durability (revisit scheduling, mixed review sets).
- **P4:** mastery thresholds, metacognitive calibration prompts, light adaptivity.

These are intentionally not started in Phase 1; the `LessonStage` model and solvable-id progress generalization are the substrate they build on.

