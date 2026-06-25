import type {
  BoardConstraint,
  BoardElementDef,
  BoardRefs,
} from "@/lib/geometry/board-types";
import {
  type ParallelAngleKind,
  type ParallelVertex,
  parallelAngleRayPoints,
} from "@/lib/geometry/parallelAngles";
import { subtendedOrder } from "@/lib/geometry/circleAngles";
import { angleDeg, fmtDeg, inward } from "@/lib/geometry/measure";

// Byrne figure palette. Four mutually-distinct hues so a single diagram can
// color-code up to four different elements (see incenterLemma's angle marks).
const BRAND = "#27418c"; // ultramarine
const ACCENT = "#c0392b"; // vermilion
const WRONG = "#b9831a"; // ochre (the "other"/contrasting element)
const OK = "#3b6b4a"; // green (equalities, correct construction)
const STROKE = "#1b1714"; // ink — neutral construction lines
const STROKE_AUX = "#9c8c70"; // warm grey — subordinate guide lines

/** A draggable named point. */
export function point(
  id: string,
  x: number,
  y: number,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    id,
    type: "point",
    parents: [x, y],
    attributes: {
      name: id,
      size: 4,
      strokeColor: BRAND,
      fillColor: "#fff",
      strokeWidth: 2,
      label: { fontSize: 18, offset: [8, 8], cssStyle: "font-weight:600;" },
      ...attrs,
    },
  };
}

/** A fixed (non-draggable) point. */
export function fixedPoint(
  id: string,
  x: number,
  y: number,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return point(id, x, y, { fixed: true, ...attrs });
}

/**
 * Drag constraint keeping a glider on the same side of chord `aId`-`bId` as the
 * circle center `centerId` — i.e. confined to the major arc. When a drag would
 * cross the chord, the glider is snapped back to its last valid position, so it
 * cannot leave that arc.
 */
export function sameSideAsCenter(
  centerId: string,
  aId: string,
  bId: string,
): BoardConstraint {
  return (refs, el) => {
    const a = refs[aId];
    const b = refs[bId];
    const o = refs[centerId];
    if (!a || !b || !o) return;
    const side = (x: number, y: number) =>
      Math.sign((b.X() - a.X()) * (y - a.Y()) - (b.Y() - a.Y()) * (x - a.X()));
    const sideCenter = side(o.X(), o.Y());
    const sideEl = side(el.X(), el.Y());
    const state = el as { _lastValid?: [number, number] };
    if (sideEl !== 0 && sideCenter !== 0 && sideEl !== sideCenter) {
      return state._lastValid;
    }
    state._lastValid = [el.X(), el.Y()];
    return undefined;
  };
}

/**
 * Drag constraint for a CHORD ENDPOINT (the dragged element together with
 * `partnerId` defines the chord): keeps every apex point in `apexIds` on the
 * same side of that chord as the circle center `centerId`. This stops a chord
 * endpoint from sweeping across the apexes (which would flip them onto the minor
 * arc). If a drag would move an apex off the center's side, the endpoint snaps
 * back to its last valid position. Complements `sameSideAsCenter`, which keeps
 * the apexes themselves from crossing the chord.
 */
export function keepChordClearOfApexes(
  centerId: string,
  partnerId: string,
  apexIds: string[],
): BoardConstraint {
  return (refs, el) => {
    const o = refs[centerId];
    const partner = refs[partnerId];
    if (!o || !partner) return;
    const ax = el.X();
    const ay = el.Y();
    const bx = partner.X();
    const by = partner.Y();
    const side = (x: number, y: number) =>
      Math.sign((bx - ax) * (y - ay) - (by - ay) * (x - ax));
    const sideCenter = side(o.X(), o.Y());
    const state = el as { _lastClear?: [number, number] };
    let ok = sideCenter !== 0;
    for (const id of apexIds) {
      const apex = refs[id];
      if (!apex) continue;
      const s = side(apex.X(), apex.Y());
      if (s === 0 || s !== sideCenter) {
        ok = false;
        break;
      }
    }
    if (!ok) return state._lastClear;
    state._lastClear = [el.X(), el.Y()];
    return undefined;
  };
}

/**
 * Drag constraint keeping concyclic points in a fixed cyclic order around
 * `centerId`, so a polygon through them (e.g. a cyclic quadrilateral ABCD) stays
 * convex and never self-intersects. If a drag would reorder the vertices, the
 * dragged point snaps back to its last valid position. Accepts either rotational
 * orientation (clockwise or counter-clockwise) as long as the order is kept.
 */
export function keepConvexOrder(centerId: string, ids: string[]): BoardConstraint {
  const TWO_PI = 2 * Math.PI;
  const strictlyIncreasing = (arr: number[]) => {
    for (let i = 1; i < arr.length; i++) if (arr[i] <= arr[i - 1]) return false;
    return true;
  };
  return (refs, el) => {
    const o = refs[centerId];
    if (!o || ids.some((id) => !refs[id])) return;
    const ang = (id: string) => Math.atan2(refs[id].Y() - o.Y(), refs[id].X() - o.X());
    const base = ang(ids[0]);
    const rel = ids.map((id) => {
      const t = (ang(id) - base) % TWO_PI;
      return t < 0 ? t + TWO_PI : t;
    });
    const tail = rel.slice(1);
    const distinct = tail.every((x) => x > 1e-6);
    const ordered =
      distinct &&
      (strictlyIncreasing(tail) || strictlyIncreasing([...tail].reverse()));
    const state = el as { _lastConvex?: [number, number] };
    if (!ordered) return state._lastConvex;
    state._lastConvex = [el.X(), el.Y()];
    return undefined;
  };
}

/** A point that glides along an existing circle/line element. */
export function glider(
  id: string,
  x: number,
  y: number,
  hostId: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    id,
    type: "glider",
    parents: [x, y, { ref: hostId }],
    attributes: {
      name: id,
      size: 4,
      strokeColor: BRAND,
      fillColor: "#fff",
      strokeWidth: 2,
      label: { fontSize: 18, offset: [8, 8], cssStyle: "font-weight:600;" },
      ...attrs,
    },
  };
}

export function segment(
  a: string,
  b: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    type: "segment",
    parents: [{ ref: a }, { ref: b }],
    attributes: { strokeColor: STROKE, strokeWidth: 2.5, ...attrs },
  };
}

export function polygon(
  ids: string[],
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    type: "polygon",
    parents: ids.map((id) => ({ ref: id })),
    attributes: {
      borders: { strokeColor: STROKE, strokeWidth: 2.5 },
      fillColor: BRAND,
      fillOpacity: 0.08,
      vertices: { visible: false },
      ...attrs,
    },
  };
}

export function circle(
  id: string,
  centerId: string,
  throughId: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    id,
    type: "circle",
    parents: [{ ref: centerId }, { ref: throughId }],
    attributes: { strokeColor: STROKE_AUX, strokeWidth: 2, ...attrs },
  };
}

/**
 * A small angle marker (sector) at vertex `v` between p1 and p2.
 *
 * Always draws the minor (<=180 deg) sector so the highlight matches the
 * value reported by `angleDeg`, never the reflex/outside angle. The point
 * order `(p1, v, p2)` still decides which side of the vertex the sector sits
 * on, so authors must pick points that place the sector on the intended side
 * of the figure (e.g. an exterior angle uses a point on the extended ray).
 */
export function angleMark(
  p1: string,
  v: string,
  p2: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    type: "angle",
    parents: [{ ref: p1 }, { ref: v }, { ref: p2 }],
    attributes: {
      radius: 0.7,
      type: "sector",
      selection: "minor",
      fillColor: ACCENT,
      fillOpacity: 0.25,
      strokeColor: ACCENT,
      name: "",
      withLabel: false,
      ...attrs,
    },
  };
}

/**
 * Central angle at `center` that subtends the SAME arc as the inscribed angle at
 * `apex` (the arc AB not containing the apex). Unlike a plain `angleMark`, this
 * draws the major/reflex sector when the apex is on the minor arc, so the
 * highlighted central angle is always exactly twice the inscribed angle — even
 * when the inscribed angle is obtuse and the central angle exceeds 180 deg.
 *
 * The two boundary rays are reordered each update so the drawn counter-clockwise
 * sector lands on the correct arc; `selection: "auto"` keeps the raw sweep
 * (no clamp to <=180).
 */
export function centralArcMark(
  id: string,
  center: string,
  a: string,
  b: string,
  apex: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef[] {
  const fromId = `${id}_from`;
  const toId = `${id}_to`;
  return [
    {
      id: fromId,
      type: "point",
      parents: [
        { fn: (r) => subtendedOrder(r[center], r[a], r[b], r[apex]).from.X() },
        { fn: (r) => subtendedOrder(r[center], r[a], r[b], r[apex]).from.Y() },
      ],
      attributes: { visible: false, fixed: true, size: 0.1 },
    },
    {
      id: toId,
      type: "point",
      parents: [
        { fn: (r) => subtendedOrder(r[center], r[a], r[b], r[apex]).to.X() },
        { fn: (r) => subtendedOrder(r[center], r[a], r[b], r[apex]).to.Y() },
      ],
      attributes: { visible: false, fixed: true, size: 0.1 },
    },
    angleMark(fromId, center, toId, { selection: "auto", ...attrs }),
  ];
}

/** A live label that prints the interior angle at vertex `v` (between p1, p2). */
export function angleLabel(
  p1: string,
  v: string,
  p2: string,
  opts: { color?: string; dist?: number; prefix?: string } = {},
): BoardElementDef {
  const color = opts.color ?? STROKE;
  const d = opts.dist ?? 1.05;
  const prefix = opts.prefix ?? "";
  return {
    type: "text",
    parents: [
      { fn: (r) => inward(r[v], r[p1], r[p2], d)[0] },
      { fn: (r) => inward(r[v], r[p1], r[p2], d)[1] },
      { fn: (r) => prefix + fmtDeg(angleDeg(r[p1], r[v], r[p2])) },
    ],
    attributes: {
      fontSize: 16,
      anchorX: "middle",
      anchorY: "middle",
      cssStyle: `font-weight:700;color:${color};`,
      fixed: true,
      highlight: false,
    },
  };
}

/** A free-floating live text label positioned at fixed board coordinates. */
export function readout(
  x: number,
  y: number,
  fn: (r: BoardRefs) => string,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    type: "text",
    parents: [x, y, { fn }],
    attributes: {
      fontSize: 15,
      anchorX: "left",
      cssStyle: "font-weight:600;color:#1b1714;",
      fixed: true,
      highlight: false,
      ...attrs,
    },
  };
}

/**
 * Angle mark for parallel-lines lessons: places two hidden ray endpoints from
 * direction vectors so the highlighted sector stays continuously on the intended
 * corresponding, alternate, or co-interior angle as the transversal rotates.
 */
export function parallelAngleMark(
  id: string,
  vertex: ParallelVertex,
  kind: ParallelAngleKind,
  attrs: Record<string, unknown> = {},
): BoardElementDef[] {
  const lineId = `${id}_line`;
  const transId = `${id}_trans`;
  const v = vertex;

  return [
    {
      id: lineId,
      type: "point",
      parents: [
        { fn: (r) => parallelAngleRayPoints(r, v, kind).line[0] },
        { fn: (r) => parallelAngleRayPoints(r, v, kind).line[1] },
      ],
      attributes: { visible: false, fixed: true, size: 0.1 },
    },
    {
      id: transId,
      type: "point",
      parents: [
        { fn: (r) => parallelAngleRayPoints(r, v, kind).trans[0] },
        { fn: (r) => parallelAngleRayPoints(r, v, kind).trans[1] },
      ],
      attributes: { visible: false, fixed: true, size: 0.1 },
    },
    angleMark(lineId, vertex, transId, attrs),
  ];
}

/** Internal angle bisector at `vertex` between rays to `p1` and `p2`. */
export function angleBisector(
  p1: string,
  vertex: string,
  p2: string,
  id?: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    id,
    type: "bisector",
    parents: [{ ref: p1 }, { ref: vertex }, { ref: p2 }],
    attributes: { visible: false, straightFirst: false, straightLast: false, ...attrs },
  };
}

/** Intersection of two lines/segments/circles (index 0 = first intersection). */
export function intersection(
  id: string,
  a: string,
  b: string,
  attrs: Record<string, unknown> = {},
): BoardElementDef {
  return {
    id,
    type: "intersection",
    parents: [{ ref: a }, { ref: b }, 0],
    attributes: {
      name: id,
      size: 3,
      fixed: true,
      fillColor: COLORS.OK,
      strokeColor: COLORS.OK,
      strokeWidth: 2,
      withLabel: true,
      label: { fontSize: 16, offset: [6, 6] },
      ...attrs,
    },
  };
}

export const COLORS = { BRAND, ACCENT, WRONG, OK };
