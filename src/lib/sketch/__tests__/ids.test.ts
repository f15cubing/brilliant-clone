import { describe, expect, it } from "vitest";
import { labelForIndex, nextPointLabel, nextSeq, objectId, usedLabels } from "../ids";
import type { SketchStep } from "../types";

describe("sketch ids", () => {
  it("labels index 0..27 as A..Z, A1, B1", () => {
    expect(labelForIndex(0)).toBe("A");
    expect(labelForIndex(25)).toBe("Z");
    expect(labelForIndex(26)).toBe("A1");
    expect(labelForIndex(27)).toBe("B1");
  });

  it("nextPointLabel returns the first unused label (stable across deletes)", () => {
    // A and C exist (B was deleted) → next free label is B, not D.
    expect(nextPointLabel(new Set(["A", "C"]))).toBe("B");
    expect(nextPointLabel(new Set())).toBe("A");
    expect(nextPointLabel(new Set(["A", "B", "C"]))).toBe("D");
  });

  it("objectId / nextSeq round-trip the monotonic counter", () => {
    expect(objectId(0)).toBe("o0");
    const steps: SketchStep[] = [
      { id: "o0", kind: "point", args: [{ x: 0, y: 0 }] },
      { id: "o5", kind: "point", args: [{ x: 1, y: 1 }] },
    ];
    expect(nextSeq(steps)).toBe(6); // max numeric id (5) + 1
    expect(nextSeq([])).toBe(0);
  });

  it("usedLabels collects the labels present on steps", () => {
    const steps: SketchStep[] = [
      { id: "o0", kind: "point", args: [{ x: 0, y: 0 }], label: "A" },
      { id: "o1", kind: "segment", args: ["o0", "o0"] },
      { id: "o2", kind: "point", args: [{ x: 1, y: 1 }], label: "B" },
    ];
    expect(usedLabels(steps)).toEqual(new Set(["A", "B"]));
  });
});
