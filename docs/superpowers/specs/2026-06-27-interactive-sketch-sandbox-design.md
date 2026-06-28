# Interactive Sketch Sandbox — Design

**Status:** approved design (pre-implementation)
**Date:** 2026-06-27
**Author:** pairing session (Felipe + agent)

## Summary

A standalone, GeoGebra-like **sketch sandbox**: an interactive canvas where a
user creates geometric objects (points, lines, circles, …) with on-canvas tools,
drags free points to explore, and saves named sketches to their account. It is
built as a **reusable foundation** whose construction model is designed so a
later phase can feed user-built **auxiliary constructions** into the Competitive
Freeplay DDAR engine (cite new points/relations inside a proof). That freeplay
integration is explicitly **out of scope** for this build but its seam is
designed in.

## Goals

- Create objects on a canvas: free point, point-on-object (glider), segment,
  line, circle (center+point), intersection, midpoint, perpendicular line,
  parallel line, polygon. Plus select/drag and delete.
- Dragging a free point (or glider) live-updates every dependent object.
- Save/load named sketches to the user's account (Firebase), with a "My
  Sketches" list; JSON export/import as well.
- Reuse the existing declarative board stack (`BoardElementDef` +
  `useJSXGraph`) rather than introducing a second rendering path.

## Non-goals (this build)

- No freeplay/DDAR integration yet (only the data seam is designed in).
- No constraint solver / CAD-style numeric constraints (JSXGraph's dynamic
  dependency graph is sufficient).
- No measurement/readout tools, ray/vector, or free-text annotations (deferred;
  the "lean-plus" tool set was chosen over the "rich" set).
- No real-time collaboration / multi-user editing.

## Why this approach

JSXGraph is already a dynamic-geometry engine: it supports click-to-create
points (`board.on('down')`), gliders (a point bound to a line/circle),
intersections, midpoints, perpendiculars/parallels, and—critically—maintains an
internal **dependency graph that recomputes downstream objects on every drag**.
So we do **not** need a geometry kernel or constraint solver.

The codebase already isolates all imperative JSXGraph behind one hook
(`src/lib/geometry/useJSXGraph.ts`) fed by a **declarative** spec
(`BoardElementDef[]` in `src/lib/geometry/board-types.ts`). The sandbox stays on
that path: we model a sketch as an ordered list of construction **steps** and
**compile** it to `BoardElementDef[]`.

Alternatives considered and rejected:

- **Imperative JSXGraph + its native `board.save`/JSON blob.** Fastest to basic
  interactivity, but persistence becomes an opaque engine blob, it abandons the
  declarative separation the codebase is built around, and it is a poor source
  for emitting DDAR facts later.
- **Custom geometry / constraint engine (algeobra, Ceres/scipy-style solver).**
  Only warranted for CAD-style constraint sketchers; redundant here because
  JSXGraph already provides dynamic dependent geometry.

## Architecture

```
src/lib/sketch/
  types.ts            SketchStep, Construction, Tool (the serializable model)
  compile.ts          compile(steps) -> BoardElementDef[]  (pure, unit-tested)
  tools.ts            tool state machine / reducer          (pure, unit-tested)
  useSketchBoard.ts   React hook: wraps useJSXGraph, adds incremental
                      add/remove + pointer wiring for the tool machine
  ids.ts              point auto-labeling (A, B, C, …, A1, …) + unique ids

src/lib/firebase/
  sketchService.ts    Firestore CRUD for saved constructions (mirrors proofService)

src/lib/sketch/
  sketchStore.ts      load/save routing (configured && uid -> Firestore;
                      else localStorage) + JSON export/import (mirrors proofArchive)

src/components/sketch/
  SketchToolbar.tsx   tool palette (select, point, line, circle, …, delete)
  SketchCanvas.tsx    hosts the board div, owns tool state, renders steps
  SketchPage.tsx      /sketch route: canvas + title + save + My Sketches drawer
  MySketches.tsx      list/open/delete saved sketches

Routes (react-router):
  /sketch            new canvas (+ My Sketches access)
  /sketch/:id        open a saved construction
```

### 1. Data model (`types.ts`)

```ts
export type Tool =
  | "point" | "glider" | "segment" | "line" | "circle"
  | "intersection" | "midpoint" | "perpendicular" | "parallel" | "polygon";

/** A literal free coordinate (a free point's draggable position). */
export interface FreeCoord { x: number; y: number }

/** One construction step. `args` reference prior step ids and/or literal coords. */
export interface SketchStep {
  id: string;                 // stable unique id (also the object's board id)
  tool: Tool;
  args: (string | FreeCoord)[];
  label?: string;             // display label (auto-assigned for points)
  style?: Record<string, unknown>;
}

export interface Construction {
  id: string;
  title: string;
  steps: SketchStep[];
  boundingBox?: [number, number, number, number];
  createdAt: number;
  updatedAt: number;
  ownerUid?: string;
}
```

The **ordered step list is the entire serializable state**. Dragging a free
point or glider writes the updated coordinate back into that step's `args` (so
"save" just persists `steps`). Dependent objects hold no coordinates — they are
recomputed by JSXGraph from their parents.

### 2. Compiler (`compile.ts`, pure)

`compile(steps): BoardElementDef[]` maps each step to one (or a few)
`BoardElementDef`s, referencing parents via the existing `{ ref: id }` arg form:

| Tool | JSXGraph type | Parents |
|------|---------------|---------|
| point | `point` | literal `[x,y]` |
| glider | `glider` | `[x, y, {ref:parent}]` (projected onto a line/circle) |
| segment | `segment` | two point refs |
| line | `line` | two point refs |
| circle | `circle` | center ref + through-point ref |
| intersection | `intersection` | two object refs + a stored index (0/1) |
| midpoint | `midpoint` | two point refs |
| perpendicular | `perpendicular` | a line ref + a point ref |
| parallel | `parallel` | a line ref + a point ref |
| polygon | `polygon` | ≥3 point refs |

Pure and unit-tested (steps → defs); no JSXGraph or DOM needed in tests.

### 3. Tool state machine (`tools.ts`, pure reducer)

State = `{ activeTool, operandBuffer: string[] }`. A pointer event yields an
intent (`hitObjectId | emptyAt(x,y)`); the reducer:

- **select**: drag/move; click object selects it (for delete/styling).
- **point**: click empty → append a free-point step. Click an existing
  line/circle with the point tool → append a **glider** on it.
- **segment/line/circle/midpoint**: collect two point operands (creating free
  points on empty clicks), then append the step.
- **perpendicular/parallel**: collect a line operand then a point operand.
- **intersection**: collect two object operands; pick the index nearest the
  click when two intersections exist.
- **polygon**: collect points until the first point is re-clicked (closes).
- **delete**: remove the clicked step and **cascade** to all dependents
  (topological: any step referencing a removed id is removed too).

Auto-labels points A, B, C, …, A1, … (via `ids.ts`). Pure and unit-tested
(event sequence → resulting steps).

### 4. Rendering hook (`useSketchBoard.ts`)

Wraps the existing `useJSXGraph`. Two additions over today's hook:

- **Incremental add/remove**: appending/deleting a step must not rebuild the
  board (that would lose drag state and flicker). The current hook already does
  incremental `buildElements` (for overlays) and `removeObject` (for clearing
  overlays) — we generalize those into `addStep(def)` / `removeStep(id)`
  primitives the sketch hook drives. The existing problem/freeplay boards keep
  using `useJSXGraph` unchanged.
- **Pointer wiring**: `board.on('down'|'up'|'move')` translate to the tool
  reducer's intents; free-point drags write coordinates back into the step.

This is the only module touching imperative JSXGraph for the sandbox, preserving
the codebase's single-bridge rule.

### 5. Persistence (`sketchService.ts` + `sketchStore.ts`)

Mirror the proof-archive dual-backend pattern (`src/lib/freeplay/proofArchive.ts`
+ `src/lib/firebase/proofService.ts`):

- **Signed-in** (`configured && uid`): Firestore collection
  `users/{uid}/sketches/{id}` storing `Construction`. CRUD: create, update
  (autosave debounced), list, delete.
- **Guest / Firebase off**: `localStorage` under a `sketches:v1` key.
- **Export/Import**: download a `Construction` as JSON; import validates
  against the model (unknown tools rejected) before loading.
- Firestore security rules: a user may read/write only their own
  `users/{uid}/sketches/**` (extends the existing rules; reviewed with the
  security-rules auditor before deploy).

### 6. Freeplay-integration seam (designed-in, built later)

The step model carries enough semantics to later emit DDAR facts without a
rewrite. A future `src/lib/sketch/toFacts.ts` will provide
`stepsToCoords(steps): Coords` and `stepsToFacts(steps): LFact[]`:

- midpoint(M,A,B) → `midp(M,A,B)`
- glider on a line through P,Q, plus the point → `coll(P,Q,glider)`
- glider on a circle (center O, through R) → `cyclic`/`cong(O,·)` witnesses
- perpendicular/parallel steps → `perp`/`para`
- intersection on two lines → `coll` on each line

Phase 3 wires that into the freeplay puzzle board so a learner can add auxiliary
points mid-proof and cite them. **Not built now**, but the model above is shaped
for it (every dependent object knows its defining parents and relation).

## Data flow

```
toolbar click ──▶ activeTool
canvas pointer ─▶ tools.reducer(state, intent) ─▶ new SketchStep[]
SketchStep[] ──▶ compile() ──▶ BoardElementDef[] ──▶ useSketchBoard ─▶ JSXGraph
free-point drag ─▶ write {x,y} back into its step ─▶ (autosave)
save ──▶ sketchStore.save(Construction) ─▶ Firestore | localStorage
open ──▶ sketchStore.load(id) ─▶ steps ─▶ compile ─▶ render
```

## Error handling & edge cases

- **Degenerate constructs** (intersection of parallels, circle of zero radius):
  JSXGraph yields a non-existent point; the compiler/hook marks the step
  "unrealized" (greyed, not deleted, so the user can fix operands) rather than
  crashing.
- **Dangling refs on delete**: delete cascades to dependents (topological), so
  no step ever references a missing id.
- **Import validation**: unknown `tool`, missing parents, or a cyclic reference
  → the import is rejected with a message; a partial/corrupt sketch never
  renders.
- **Autosave failure** (offline / Firestore error): fall back to localStorage
  and surface a non-blocking "saved locally" notice (same posture as the proof
  recorder).
- **Guest mode**: fully usable; sketches live in localStorage and can be
  exported; a sign-in later can migrate them (nice-to-have, not MVP-blocking).

## Testing strategy

- **Pure unit tests (Vitest):** `compile.ts` (steps → expected defs, incl.
  intersection index + glider parent), `tools.ts` (event sequences → expected
  steps, incl. delete-cascade and polygon-close), `ids.ts` (label sequence).
- **Persistence:** round-trip `Construction` → JSON → `Construction`; import
  validation rejects malformed/cyclic inputs.
- Component/board rendering is exercised manually (consistent with the repo's
  current "component/UI tests are the main gap" status); the logic that *can* be
  pure is pure and covered.
- The existing freeplay/engine suites are untouched.

## Phasing

1. **Canvas MVP (ephemeral):** routes, toolbar, the lean-plus tool set,
   compile + tools + hook, drag, delete-cascade. Sketch lives in memory + JSON
   export/import.
2. **Account persistence:** `sketchService` + `sketchStore`, autosave, "My
   Sketches" list, Firestore rules.
3. **Freeplay integration (separate spec):** `toFacts.ts` + wiring auxiliary
   constructions into the freeplay proof board.

This document covers phases 1–2; phase 3 gets its own design.
