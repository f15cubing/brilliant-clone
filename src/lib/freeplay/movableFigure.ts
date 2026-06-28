/**
 * Builds a MOVABLE declarative JSXGraph board for a puzzle.
 *
 * The puzzle's `freePoints` become draggable points; every other point is
 * `constructFrom`-derived and recomputes live as the free points move (dependent
 * coordinates are `{ fn }` parents that re-run the puzzle's construction on every
 * board update). A per-board validity guard snaps a free point back if a drag
 * would make the figure degenerate or break a given.
 *
 * This is the rendering half of `docs/design/MOVABLE_FIGURES.md`. It reuses the
 * existing single bridge (`useJSXGraph`), which already evaluates `{ fn }` parents
 * on every update and runs `constrain` callbacks on drag — so no new imperative
 * code is needed. Puzzles WITHOUT `constructFrom` never reach here; the caller
 * (`MovableFigure`) falls back to the static `buildFigureDef`.
 *
 * Verification is unaffected: the verifier checks steps against `puzzle.coords`
 * plus sampled realizations, never the live board, so dragging is purely
 * exploratory and can never change whether a proof step is accepted.
 */
import { COLORS, glider, point } from "@/lib/content/boards";
import type {
  BoardConstraint,
  BoardElementDef,
  BoardRefs,
  JSXGraphDef,
} from "@/lib/geometry/board-types";
import type { Coords } from "./check";
import type { V } from "./geom";
import { isValidRealization } from "./realize";
import type { Puzzle } from "./types";

/** Read the live positions of the free points from the board's element map. */
function freeFromRefs(refs: BoardRefs, freePoints: string[]): Coords {
  const free: Coords = {};
  for (const id of freePoints) {
    const el = refs[id];
    if (el) {
      const xy: V = [el.X(), el.Y()];
      free[id] = xy;
    }
  }
  return free;
}

/** True iff every coordinate in the realization is a finite number. */
function allFinite(coords: Coords): boolean {
  return Object.values(coords).every(
    (p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]),
  );
}

/**
 * A live `constructFrom` evaluator memoized on the free-point signature, so the
 * construction runs at most once per board update (not once per coordinate
 * function). On a throwing / non-finite / degenerate result it returns the last
 * good coordinates so dependent points never jump to NaN mid-drag.
 */
function makeLiveCoords(
  puzzle: Puzzle,
  freePoints: string[],
): (refs: BoardRefs) => Coords {
  let lastSig = "";
  let lastCoords: Coords = { ...puzzle.coords };
  return (refs) => {
    const free = freeFromRefs(refs, freePoints);
    const sig = freePoints
      .map((id) => (free[id] ? `${free[id][0]},${free[id][1]}` : "_"))
      .join("|");
    if (sig === lastSig) return lastCoords;
    lastSig = sig;
    try {
      const r = puzzle.constructFrom!(free);
      if (r?.coords && allFinite(r.coords)) lastCoords = r.coords;
    } catch {
      /* keep the last good coordinates */
    }
    return lastCoords;
  };
}

/**
 * A drag guard shared by all free points: a drag is committed only if the
 * resulting full realization is non-degenerate and still satisfies every given
 * (`isValidRealization`); otherwise the dragged point snaps back to its last
 * valid position. State (the last valid free-point positions) lives in the
 * closure, seeded with the canonical coordinates.
 */
function makeValidityGuard(
  puzzle: Puzzle,
  freePoints: string[],
): (id: string) => BoardConstraint {
  const lastValid: Coords = {};
  for (const id of freePoints) {
    const c = puzzle.coords[id];
    if (c) lastValid[id] = [c[0], c[1]];
  }
  return (id) => (refs) => {
    const free = freeFromRefs(refs, freePoints);
    let ok: boolean;
    try {
      ok = isValidRealization(puzzle, puzzle.constructFrom!(free));
    } catch {
      ok = false;
    }
    if (ok) {
      for (const fid of freePoints) if (free[fid]) lastValid[fid] = free[fid];
      return undefined;
    }
    return lastValid[id];
  };
}

/** A dependent point whose coordinates are recomputed from the free points. */
function computedPoint(
  id: string,
  live: (refs: BoardRefs) => Coords,
): BoardElementDef {
  return {
    id,
    type: "point",
    parents: [
      { fn: (r) => live(r)[id]?.[0] ?? NaN },
      { fn: (r) => live(r)[id]?.[1] ?? NaN },
    ],
    attributes: {
      name: id,
      size: 4,
      fixed: true,
      strokeColor: COLORS.BRAND,
      fillColor: "#fff",
      strokeWidth: 2,
      label: { fontSize: 18, offset: [8, 8], cssStyle: "font-weight:600;" },
    },
  };
}

/**
 * Compile a puzzle into a movable board: draggable free points, live-computed
 * dependent points, then the puzzle's figure overlays (which reference points by
 * id and follow automatically). Requires `puzzle.constructFrom`.
 */
export function buildMovableFigureDef(puzzle: Puzzle): JSXGraphDef {
  const ids = Object.keys(puzzle.coords);
  const free = new Set(puzzle.freePoints ?? []);

  const xs = ids.map((id) => puzzle.coords[id][0]);
  const ys = ids.map((id) => puzzle.coords[id][1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  // Extra padding (vs the fixed board's +1.2) gives room to drag before the
  // figure runs into the viewport edge.
  const half = Math.max(maxX - minX, maxY - minY) / 2 + 2;

  const freeIds = [...free];
  const live = makeLiveCoords(puzzle, freeIds);
  const guard = makeValidityGuard(puzzle, freeIds);
  const gliderSpec = puzzle.movable?.gliders ?? {};
  const hosts = puzzle.movable?.hosts ?? [];
  // The snap-back guard recomputes the whole figure on every drag tick. That is
  // exactly what a plane-only puzzle wants, but for glider puzzles a plane handle
  // (e.g. a circle centre or the basepoints of a perpendicular bisector) can move
  // a glider's locus, and the glider only reprojects AFTER the handler runs — so
  // the guard would read a stale, briefly-invalid config and snap the drag back.
  // The gliders already keep every point on its locus, so we skip the guard then.
  const hasGliders = Object.keys(gliderSpec).length > 0;

  const elements: BoardElementDef[] = [];

  // Order matters so each element's parents already exist in the refs map when
  // JSXGraph first evaluates them:
  //   1. plane free points  2. host loci (ride on the plane points)
  //   3. glider free points (ride on the hosts)  4. dependents  5. figure.
  for (const id of ids) {
    if (!free.has(id) || gliderSpec[id]) continue;
    const [x, y] = puzzle.coords[id];
    elements.push({
      ...point(id, x, y, { size: 5, fillColor: COLORS.BRAND }),
      constrain: hasGliders ? undefined : guard(id),
    });
  }
  elements.push(...hosts);
  for (const id of ids) {
    if (!free.has(id) || !gliderSpec[id]) continue;
    const [x, y] = puzzle.coords[id];
    elements.push({
      ...glider(id, x, y, gliderSpec[id].on, { size: 5, fillColor: COLORS.BRAND }),
      constrain: gliderSpec[id].constrain,
    });
  }
  for (const id of ids) {
    if (free.has(id)) continue;
    elements.push(computedPoint(id, live));
  }
  elements.push(...puzzle.figure);

  return {
    boundingBox: [cx - half, cy + half, cx + half, cy - half],
    keepAspectRatio: true,
    freeNavigation: true,
    elements,
  };
}
