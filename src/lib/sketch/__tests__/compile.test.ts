import { describe, expect, it } from "vitest";
import { compile, compileStep } from "../compile";
import type { SketchStep } from "../types";

const point = (id: string, x: number, y: number, label?: string): SketchStep => ({
  id,
  kind: "point",
  args: [{ x, y }],
  label,
});

describe("sketch compile", () => {
  it("compiles a free point to a point element at literal coords", () => {
    const [def] = compileStep(point("o0", 1, 2, "A"));
    expect(def.type).toBe("point");
    expect(def.id).toBe("o0");
    expect(def.parents).toEqual([1, 2]);
    expect((def.attributes as { name: string }).name).toBe("A");
  });

  it("compiles a glider to [x, y, {ref host}]", () => {
    const def = compileStep({ id: "o2", kind: "glider", args: [{ x: 0, y: 0 }, "o1"] })[0];
    expect(def.type).toBe("glider");
    expect(def.parents).toEqual([0, 0, { ref: "o1" }]);
  });

  it("compiles segment/line/circle/midpoint with ref parents", () => {
    expect(compileStep({ id: "s", kind: "segment", args: ["a", "b"] })[0].parents).toEqual([
      { ref: "a" },
      { ref: "b" },
    ]);
    expect(compileStep({ id: "l", kind: "line", args: ["a", "b"] })[0].type).toBe("line");
    expect(compileStep({ id: "c", kind: "circle", args: ["o", "p"] })[0].parents).toEqual([
      { ref: "o" },
      { ref: "p" },
    ]);
    const mid = compileStep({ id: "m", kind: "midpoint", args: ["a", "b"] })[0];
    expect(mid.type).toBe("midpoint");
  });

  it("compiles an intersection with its branch index (defaulting to 0)", () => {
    expect(compileStep({ id: "i", kind: "intersection", args: ["l1", "l2", 1] })[0].parents).toEqual([
      { ref: "l1" },
      { ref: "l2" },
      1,
    ]);
    // Missing index → defaults to 0.
    expect(compileStep({ id: "i", kind: "intersection", args: ["l1", "l2"] })[0].parents).toEqual([
      { ref: "l1" },
      { ref: "l2" },
      0,
    ]);
  });

  it("compiles perpendicular/parallel as [line, point] and polygon over all vertices", () => {
    expect(compileStep({ id: "p", kind: "perpendicular", args: ["l", "pt"] })[0].type).toBe(
      "perpendicular",
    );
    expect(compileStep({ id: "p", kind: "parallel", args: ["l", "pt"] })[0].type).toBe("parallel");
    const poly = compileStep({ id: "g", kind: "polygon", args: ["a", "b", "c"] })[0];
    expect(poly.parents).toEqual([{ ref: "a" }, { ref: "b" }, { ref: "c" }]);
  });

  it("compiles a whole construction in order", () => {
    const steps: SketchStep[] = [
      point("o0", 0, 0, "A"),
      point("o1", 4, 0, "B"),
      { id: "o2", kind: "segment", args: ["o0", "o1"] },
    ];
    const defs = compile(steps);
    expect(defs.map((d) => d.type)).toEqual(["point", "point", "segment"]);
    expect(defs.map((d) => d.id)).toEqual(["o0", "o1", "o2"]);
  });

  it("throws on a structurally invalid step (defensive: import validates first)", () => {
    expect(() => compileStep({ id: "x", kind: "segment", args: [{ x: 0, y: 0 }, "b"] })).toThrow();
    expect(() => compileStep({ id: "x", kind: "point", args: ["notacoord"] })).toThrow();
  });
});
