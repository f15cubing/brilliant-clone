import { describe, expect, it } from "vitest";
import { initialSketchState, reduce, type ClickTarget, type SketchState } from "../tools";

const at = (x: number, y: number): ClickTarget => ({ at: { x, y }, hitId: null });
const hit = (id: string): ClickTarget => ({ at: { x: 0, y: 0 }, hitId: id });

/** Apply a sequence of clicks in a given mode, starting from empty. */
function run(actions: Array<["mode", string] | ["click", ClickTarget]>): SketchState {
  let s = initialSketchState;
  for (const a of actions) {
    s = a[0] === "mode"
      ? reduce(s, { type: "setMode", mode: a[1] as never })
      : reduce(s, { type: "click", target: a[1] });
  }
  return s;
}

describe("sketch tools reducer", () => {
  it("point tool: clicking empty space creates labeled free points", () => {
    const s = run([
      ["mode", "point"],
      ["click", at(0, 0)],
      ["click", at(2, 2)],
    ]);
    expect(s.steps.map((x) => x.kind)).toEqual(["point", "point"]);
    expect(s.steps.map((x) => x.label)).toEqual(["A", "B"]);
    expect(s.steps[0].args).toEqual([{ x: 0, y: 0 }]);
  });

  it("point tool: clicking a line creates a glider on it", () => {
    let s = run([
      ["mode", "line"],
      ["click", at(0, 0)],
      ["click", at(4, 0)],
    ]);
    const lineId = s.steps[2].id;
    s = reduce(s, { type: "setMode", mode: "point" });
    s = reduce(s, { type: "click", target: { at: { x: 2, y: 0 }, hitId: lineId } });
    const glider = s.steps[s.steps.length - 1];
    expect(glider.kind).toBe("glider");
    expect(glider.args).toEqual([{ x: 2, y: 0 }, lineId]);
  });

  it("segment tool: two empty clicks create two points and a segment referencing them", () => {
    const s = run([
      ["mode", "segment"],
      ["click", at(0, 0)],
      ["click", at(3, 4)],
    ]);
    expect(s.steps.map((x) => x.kind)).toEqual(["point", "point", "segment"]);
    const seg = s.steps[2];
    expect(seg.args).toEqual([s.steps[0].id, s.steps[1].id]);
    expect(s.buffer).toEqual([]); // buffer cleared after completion
  });

  it("segment tool: reuses an existing point when clicked instead of duplicating", () => {
    let s = run([
      ["mode", "point"],
      ["click", at(0, 0)],
    ]);
    const aId = s.steps[0].id;
    s = reduce(s, { type: "setMode", mode: "segment" });
    s = reduce(s, { type: "click", target: hit(aId) }); // reuse A
    s = reduce(s, { type: "click", target: at(5, 5) }); // new B
    expect(s.steps.filter((x) => x.kind === "point")).toHaveLength(2);
    const seg = s.steps[s.steps.length - 1];
    expect(seg.args[0]).toBe(aId);
  });

  it("circle tool: first click is the center, second the through-point", () => {
    const s = run([
      ["mode", "circle"],
      ["click", at(0, 0)],
      ["click", at(3, 0)],
    ]);
    const circle = s.steps[2];
    expect(circle.kind).toBe("circle");
    expect(circle.args).toEqual([s.steps[0].id, s.steps[1].id]); // [center, through]
  });

  it("midpoint tool produces a derived midpoint of two points", () => {
    const s = run([
      ["mode", "midpoint"],
      ["click", at(-2, 0)],
      ["click", at(2, 0)],
    ]);
    expect(s.steps[2].kind).toBe("midpoint");
  });

  it("perpendicular tool needs a line first, then a point", () => {
    let s = run([
      ["mode", "line"],
      ["click", at(0, 0)],
      ["click", at(4, 0)],
    ]);
    const lineId = s.steps[2].id;
    s = reduce(s, { type: "setMode", mode: "perpendicular" });
    // Clicking empty space first (no line) is ignored.
    s = reduce(s, { type: "click", target: at(1, 1) });
    expect(s.steps.some((x) => x.kind === "perpendicular")).toBe(false);
    // Now select the line, then a point off it.
    s = reduce(s, { type: "click", target: hit(lineId) });
    s = reduce(s, { type: "click", target: at(1, 3) });
    const perp = s.steps[s.steps.length - 1];
    expect(perp.kind).toBe("perpendicular");
    expect(perp.args[0]).toBe(lineId);
  });

  it("intersection tool collects two line/circle objects (ignores points)", () => {
    // Two lines crossing.
    let s = run([
      ["mode", "line"],
      ["click", at(0, 0)],
      ["click", at(4, 4)],
      ["mode", "line"],
      ["click", at(0, 4)],
      ["click", at(4, 0)],
    ]);
    const l1 = s.steps[2].id;
    const l2 = s.steps[5].id;
    s = reduce(s, { type: "setMode", mode: "intersection" });
    s = reduce(s, { type: "click", target: hit(s.steps[0].id) }); // a point — ignored
    expect(s.buffer).toEqual([]);
    s = reduce(s, { type: "click", target: hit(l1) });
    s = reduce(s, { type: "click", target: hit(l2) });
    const inter = s.steps[s.steps.length - 1];
    expect(inter.kind).toBe("intersection");
    expect(inter.args).toEqual([l1, l2, 0]);
  });

  it("polygon tool closes when the first vertex is re-clicked (≥3 points)", () => {
    let s = reduce(initialSketchState, { type: "setMode", mode: "polygon" });
    s = reduce(s, { type: "click", target: at(0, 0) });
    const firstId = s.steps[0].id;
    s = reduce(s, { type: "click", target: at(4, 0) });
    s = reduce(s, { type: "click", target: at(2, 3) });
    expect(s.steps.some((x) => x.kind === "polygon")).toBe(false); // not closed yet
    s = reduce(s, { type: "click", target: hit(firstId) }); // close
    const poly = s.steps[s.steps.length - 1];
    expect(poly.kind).toBe("polygon");
    expect(poly.args).toHaveLength(3);
  });

  it("delete cascades to dependents", () => {
    const s = run([
      ["mode", "segment"],
      ["click", at(0, 0)],
      ["click", at(4, 0)],
    ]);
    const aId = s.steps[0].id; // endpoint A
    // Deleting the endpoint removes the segment that references it too.
    const afterDelete = reduce(
      { ...s, mode: "delete" },
      { type: "click", target: hit(aId) },
    );
    expect(afterDelete.steps.find((x) => x.id === aId)).toBeUndefined();
    expect(afterDelete.steps.some((x) => x.kind === "segment")).toBe(false);
  });

  it("movePoint writes a dragged free point's new coordinate back", () => {
    let s = run([
      ["mode", "point"],
      ["click", at(0, 0)],
    ]);
    const id = s.steps[0].id;
    s = reduce(s, { type: "movePoint", id, at: { x: 7, y: 9 } });
    expect(s.steps[0].args).toEqual([{ x: 7, y: 9 }]);
  });

  it("switching tools clears the in-progress operand buffer", () => {
    let s = run([
      ["mode", "segment"],
      ["click", at(0, 0)], // one operand buffered
    ]);
    expect(s.buffer).toHaveLength(1);
    s = reduce(s, { type: "setMode", mode: "circle" });
    expect(s.buffer).toEqual([]);
  });

  it("load resets transient state and restores the monotonic counter", () => {
    const loaded = reduce(initialSketchState, {
      type: "load",
      steps: [
        { id: "o0", kind: "point", args: [{ x: 0, y: 0 }], label: "A" },
        { id: "o3", kind: "point", args: [{ x: 1, y: 1 }], label: "B" },
      ],
    });
    expect(loaded.mode).toBe("select");
    expect(loaded.seq).toBe(4); // next id won't collide with o3
    expect(loaded.buffer).toEqual([]);
  });
});
