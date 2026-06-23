# Product Requirements Document: Interactive Olympiad Geometry

## 1. Overview

A Brilliant-style interactive learning web app focused on a single course: **Olympiad Geometry** (modeled on Chapter 1, "Angle Chasing," of Evan Chen's *Euclidean Geometry in Mathematical Olympiads*). Learners study by *doing*: every problem features a manipulable geometric construction (GeoGebra-style) so they can drag points and see that a theorem holds for *any* triangle. Wrong answers trigger visual, diagram-based explanations.

### Vision

Replace passive geometry lectures with hands-on, problem-first lessons where understanding "clicks" because the learner can move the figure and watch the invariant survive.

### Goals

- Teach angle-chasing fundamentals through interactive, draggable diagrams.
- Persist each learner's lesson and course progress across sessions and devices via login.
- Make authoring new lessons/problems easy (data-driven content).
- Keep learners motivated with lightweight gamification (XP, progress, achievements) — **no daily streak**.

### Non-Goals (this release)

- Multiple courses (single course only).
- Payments / Premium tiers.
- Weekly Leagues / leaderboards.
- Daily streaks and notifications.
- Real AI tutor. (Hints/explanations are authored static content.)

---

## 2. Tech Stack

- **Language:** TypeScript
- **Build/Dev:** Vite
- **UI:** React + Tailwind CSS
- **Interactive geometry:** JSXGraph (dynamic geometry engine; draggable points, constraints, live measurements), wrapped behind a custom `useJSXGraph` hook for safe lifecycle management. (Alternative considered: **Mafs** — declarative/React-first — rejected for now because it lacks out-of-the-box Euclidean tools.)
- **Math typesetting:** KaTeX
- **Math input:** MathLive (or MathQuill) for algebraic answer entry.
- **Client-side CAS:** math.js to check symbolic equivalence of learner answers (e.g., `90 - A/2`).
- **Backend / Auth / Data:** Firebase
  - **Firebase Auth** (email/password) for accounts.
  - **Cloud Firestore** for persisting user progress (XP, completed lessons/problems, per-course progress).
- **State:** lightweight client store ( React context) hydrated from Firestore.
- **Hosting:** Firebase Hosting (build target for Vite output).

---

## 3. User Persona

**Gabriel — 18, Colombia.** Motivated self-learner who wants to learn olympiad geometry. Comfortable on the web, prefers learning by interacting rather than reading. Wants to *see* why a theorem is true, get clear feedback when wrong, and have his progress saved so he can pick up where he left off.

---

## 4. User Stories

- As Gabriel, I can **create an account and log in**, so my lesson and course progress is saved and stays consistent across sessions/devices.
- As Gabriel, I can **work through lessons with an interactive geometric construction I can drag around** (like GeoGebra), so I can explore the figure.
- As Gabriel, when I **get a question wrong, I see an explanation with drawings/diagrams**, so I understand my mistake.
- As Gabriel, I solve **problems in the style of EGMO Chapter 1 (angle chasing)**, so the content matches real olympiad training.
- As Gabriel, I can **drag a triangle/figure and watch a theorem still hold for any configuration**, so I build intuition that the result is general.
- As Gabriel, I can **see a dashboard of my progress and gamification (XP, achievements, completion)**, so I stay motivated.

---

## 5. MVP Feature Requirements

### 5.1 Authentication & Progress Persistence

- Sign up / log in (email/password) via Firebase Auth.
- On login, load the user's progress doc from Firestore; on logout, clear local state.
- Progress that persists: XP total, completed problems, completed lessons, per-lesson and per-course completion %, achievements earned, last-position ("continue where you left off").
- Writes happen on each problem completion and lesson completion (optimistic local update + Firestore sync).

### 5.2 Course & Lesson Structure

- **One course:** Olympiad Geometry — Angle Chasing.
- **4-7 lessons**, each with **5-7 questions (solvables)**.
- Content is **data-driven** (typed TS/JSON content files) so adding a lesson = adding a content object; no new components required for standard problem types.
- Lessons progress simple -> complex; later lessons can require earlier ones (soft gating optional).

### 5.3 Interactive Geometry (every problem)

- Each problem renders a JSXGraph board with a construction defined declaratively in content (`boardConfig`).
- The board is mounted via a custom `**useJSXGraph`** hook: it creates the board inside a `useRef` container, applies the declarative config, and **destroys the board instance on unmount** to avoid memory leaks and redundant re-renders. The React tree never manipulates JSXGraph internals directly.
- Draggable points (with constraints), lines, circles, angle markers, and **live measurement labels** that update as the figure moves.
- Used both to *explore* (drag the triangle, watch the angle relationship hold) and to *answer* (read off a value / pick the consequence).
- **Mobile touch:** interactive geometry is hard on touch devices. Mitigations: larger hit targets for draggable points, lock page scroll/pinch-zoom while interacting with a board, guard against accidental drags, and verify each board on touch as part of acceptance.

### 5.4 Solvable / Problem Engine

- Problem types (via `answerConfig`): **multiple-choice** (multi-try, no penalty), **algebraic answer** (math-aware input via MathLive, checked for symbolic equivalence with math.js — e.g., `90 - A/2` ≡ `(180 - A)/2`), and **geometric action** (interactive-geometry-driven; read off or construct on the board).
- **Instant feedback banner** (bottom) on submit: correct / incorrect.
- On **incorrect**: render the explanation as a **state transition on the learner's current board** — draw new construction lines, highlight arcs/angles, or annotate directly on their existing configuration so they keep the context of their mistake. Explanations are *not* a separate static image and do not replace the board. Driven by `explanations[].boardOverlayConfig`, keyed to a `triggerCondition` (e.g., which wrong option was chosen).
- "Reveal answer" + explanation available after attempts.
- Completing a problem awards XP; completing all problems completes the lesson.

### 5.5 Dashboard & Gamification (no streak)

- Dashboard shows: total XP, course progress %, per-lesson completion, "Continue learning," and achievements/badges (e.g., "Finished Inscribed Angles," "First 100 XP").
- XP awarded per solved problem and per completed lesson.
- Progress bars per lesson and for the overall course..

---

## 6. Content Plan (Angle Chasing — EGMO Ch. 1 flavored)

Author 4-7 lessons, 5-7 problems each, all with interactive diagrams. Proposed lessons:

1. **Angles in a Triangle & on a Line** — angle sum = 180°, straight/vertical angles; drag vertices to confirm invariance.
2. **The Inscribed Angle Theorem** — inscribed angle = half central angle / half its arc; drag the apex around the circle and watch the angle stay constant.
3. **Cyclic Quadrilaterals** — opposite angles sum to 180°; drag the four points on the circle.
4. **Tangents & the Tangent-Chord Angle** — angle between tangent and chord equals inscribed angle in alternate segment.
5. **Incenter/Excenter Lemma**.
6. *(stretch)* **Isogonal / Angle Bisector chasing**.
7. *(stretch)* **Putting it together: multi-step angle chase**.

Each problem object specifies: prompt, construction spec, problem type, correct answer, and one or more wrong-answer explanations (text + board overlay).

### Static Content Schema

Content is data-driven TypeScript. The strict interface enforces separation of concerns (content vs. engine):

```ts
interface Problem {
  id: string;
  prompt: string;                 // Markdown / KaTeX supported
  boardConfig: JSXGraphDef;       // Declarative setup for the interactive board
  answerConfig:                   // discriminated union of answer types
    | AlgebraicAnswer             // math-aware input, checked via math.js equivalence
    | MultipleChoice              // multi-try options
    | GeometricAction;            // answered by manipulating/reading the board
  explanations: {
    triggerCondition: string;     // e.g. "selected_B" or "default_wrong"
    text: string;                 // Markdown / KaTeX
    boardOverlayConfig?: JSXGraphDef; // lines/highlights added to the current board
  }[];
}
```

- `JSXGraphDef` is a serializable description of board elements (points, segments, circles, angles, labels, constraints) consumed by the `useJSXGraph` hook.
- `AlgebraicAnswer` stores the canonical expression and the variable set; equivalence is decided by math.js, not string match.

---

## 7. Data Model (Firestore)

- `users/{uid}`: `{ displayName, email, createdAt, totalXp }`
- `users/{uid}/progress/{courseId}`: `{ completionPct, completedLessonIds[], lastLessonId }`
- `users/{uid}/lessonProgress/{lessonId}`: tracks completion plus per-problem attempt metadata (for future spaced repetition / stuck-point analysis):

```json
{
  "completedProblemIds": ["prob1", "prob2"],
  "problemStats": {
    "prob1": { "attempts": 1, "timeSpentMs": 45000 },
    "prob2": {
      "attempts": 3,
      "timeSpentMs": 120000,
      "lastMistakeId": "wrong_cyclic_assumption"
    }
  },
  "xpEarned": 50,
  "completedAt": "timestamp"
}
```

- `users/{uid}/achievements/{achievementId}`: `{ earnedAt }`
- Course/lesson/problem *content* is shipped in the app bundle (static TS), not in Firestore.

---

## 8. App Surface (Routes)

- `/login`, `/signup` — auth screens.
- `/` — dashboard (XP, course progress, continue, achievements). Auth-gated.
- `/course` — Olympiad Geometry overview / lesson map with completion state.
- `/lesson/:lessonId` — focused problem player (interactive board + feedback).

---

## 8a. Architectural & Technical Risks

- **React + JSXGraph imperative mismatch.** JSXGraph is imperative; React is declarative. Risk: memory leaks, redundant board re-renders. *Mitigation:* a single `useJSXGraph` hook owns board mount/config/teardown inside a `useRef`; React only passes serializable `JSXGraphDef`. (Mafs evaluated as a declarative alternative; deferred.)
- **Algebraic answer input.** Olympiad answers are expressions (e.g., `90° - A/2`), not plain numbers. Risk: a numeric/text input can't represent or grade them. *Mitigation:* MathLive input + math.js symbolic-equivalence check.
- **Mobile touch interactions.** Dragging constructions is fragile on touch. *Mitigation:* large hit targets, scroll/zoom locking on the board, accidental-drag guards, explicit touch acceptance testing.
- **Explanation state management.** Risk: a separate explanation image breaks the learner's mental context. *Mitigation:* explanations are overlays/state transitions on the learner's *current* board (`boardOverlayConfig` keyed to `triggerCondition`).

---

## 9. Success Criteria

- A logged-in user can complete a lesson; XP/progress/achievements persist in Firestore and survive logout/login and reload.
- Every problem has a working draggable construction with live measurements.
- Wrong answers always surface a diagram-based explanation.
- Adding a new lesson requires only adding a content object (no engine changes).
- 4-7 lessons authored, 5-7 problems each, all angle-chasing themed.

---

## 10. Open Questions / Future

- Add more EGMO chapters (Circles, Power of a Point, Lengths & Ratios) as additional units.
- Optional: spaced-repetition review of solved problem types.
- Optional later: streaks, leagues, AI hints (Koji-style).

