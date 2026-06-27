import { describe, expect, it } from "vitest";
import { LIMITS, ValidationError, validateRequest, validateResultShape } from "../validate";

const base = {
  text: "angle APB equals angle AQB since A, B, P, Q are concyclic",
  puzzleId: "inscribed-angle",
  points: ["A", "B", "P", "Q", "O"],
  variables: [],
  established: [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] }],
};

describe("validateRequest", () => {
  it("accepts a well-formed request", () => {
    const req = validateRequest(base);
    expect(req.puzzleId).toBe("inscribed-angle");
    expect(req.points).toHaveLength(5);
    expect(req.established).toHaveLength(1);
  });

  it("rejects an over-long text", () => {
    expect(() => validateRequest({ ...base, text: "x".repeat(LIMITS.text + 1) })).toThrow(
      ValidationError,
    );
  });

  it("rejects empty text", () => {
    expect(() => validateRequest({ ...base, text: "   " })).toThrow(ValidationError);
  });

  it("rejects bad point labels", () => {
    expect(() => validateRequest({ ...base, points: ["A", "toolongname"] })).toThrow(
      ValidationError,
    );
  });

  it("rejects too many points", () => {
    const points = Array.from({ length: LIMITS.maxPoints + 1 }, (_, i) => `P${i % 9}`);
    expect(() => validateRequest({ ...base, points })).toThrow(ValidationError);
  });

  it("drops malformed established context instead of failing", () => {
    const req = validateRequest({
      ...base,
      established: [
        { kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] },
        { kind: "rel", name: "nonsense", points: ["A", "B"] },
      ],
    });
    expect(req.established).toHaveLength(1);
  });
});

describe("validateResultShape", () => {
  const points = ["A", "B", "P", "Q"];

  it("accepts a valid eqangle conclusion", () => {
    const res = validateResultShape(
      {
        conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
        premises: [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] }],
      },
      points,
    );
    expect(res.conclusion.kind).toBe("rel");
    expect(res.premises).toHaveLength(1);
  });

  it("rejects a conclusion referencing an unknown point", () => {
    expect(() =>
      validateResultShape(
        { conclusion: { kind: "rel", name: "cyclic", points: ["A", "B", "P", "Z"] }, premises: [] },
        points,
      ),
    ).toThrow(ValidationError);
  });

  it("rejects an unknown relation name", () => {
    expect(() =>
      validateResultShape(
        { conclusion: { kind: "rel", name: "evil", points: ["A", "B", "P", "Q"] }, premises: [] },
        points,
      ),
    ).toThrow(ValidationError);
  });

  it("preserves a premise `source` (grounding metadata), but never on the conclusion", () => {
    const res = validateResultShape(
      {
        // A `source` on the conclusion must be ignored.
        conclusion: {
          kind: "rel",
          name: "eqangle",
          points: ["A", "P", "B", "A", "Q", "B"],
          source: "should be dropped",
        },
        premises: [
          {
            kind: "rel",
            name: "cyclic",
            points: ["A", "B", "P", "Q"],
            source: "A, B, P, Q are concyclic",
          },
        ],
      },
      points,
    );
    expect(res.premises[0].source).toBe("A, B, P, Q are concyclic");
    expect((res.conclusion as { source?: string }).source).toBeUndefined();
  });

  it("caps an over-long premise `source` at the text limit", () => {
    const res = validateResultShape(
      {
        conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
        premises: [
          {
            kind: "rel",
            name: "cyclic",
            points: ["A", "B", "P", "Q"],
            source: "x".repeat(LIMITS.text + 50),
          },
        ],
      },
      points,
    );
    expect(res.premises[0].source).toHaveLength(LIMITS.text);
  });
});
