import { describe, expect, it } from "vitest";
import { parseConstruction, serializeConstruction, validateSteps } from "../serialize";
import type { Construction } from "../types";

const construction: Construction = {
  id: "c1",
  title: "Triangle",
  steps: [
    { id: "o0", kind: "point", args: [{ x: 0, y: 0 }], label: "A" },
    { id: "o1", kind: "point", args: [{ x: 4, y: 0 }], label: "B" },
    { id: "o2", kind: "segment", args: ["o0", "o1"] },
  ],
  createdAt: 1000,
  updatedAt: 2000,
};

describe("sketch serialize", () => {
  it("round-trips a construction through JSON (refreshing updatedAt)", () => {
    const json = serializeConstruction(construction);
    const back = parseConstruction(json);
    expect(back.title).toBe("Triangle");
    expect(back.steps).toHaveLength(3);
    expect(back.steps[2].args).toEqual(["o0", "o1"]);
    expect(back.updatedAt).toBeGreaterThanOrEqual(construction.updatedAt);
  });

  it("rejects a forward reference (enforces topological order / no cycles)", () => {
    expect(() =>
      validateSteps([
        { id: "o0", kind: "segment", args: ["o1", "o2"] }, // refs not yet defined
        { id: "o1", kind: "point", args: [{ x: 0, y: 0 }] },
      ]),
    ).toThrow(/forward id|unknown/);
  });

  it("rejects an unknown step kind and a malformed arg", () => {
    expect(() => validateSteps([{ id: "o0", kind: "wormhole", args: [] }])).toThrow();
    expect(() =>
      validateSteps([{ id: "o0", kind: "point", args: ["notacoord-ref-to-nothing"] }]),
    ).toThrow();
  });

  it("rejects a duplicate id", () => {
    expect(() =>
      validateSteps([
        { id: "o0", kind: "point", args: [{ x: 0, y: 0 }] },
        { id: "o0", kind: "point", args: [{ x: 1, y: 1 }] },
      ]),
    ).toThrow(/duplicate/);
  });
});
