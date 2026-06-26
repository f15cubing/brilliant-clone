import { describe, expect, it } from "vitest";
import { LocalMockTranslator, TranslateError } from "../mock";
import type { FactDescriptor, TranslateRequest } from "../types";

const POINTS = ["O", "A", "B", "C", "D", "M", "P", "Q"];
const tr = new LocalMockTranslator();

function reqFor(text: string): TranslateRequest {
  return { text, puzzleId: "t", points: POINTS, variables: ["A", "B"], established: [] };
}

async function conclusionOf(text: string): Promise<FactDescriptor> {
  return (await tr.translate(reqFor(text))).conclusion;
}

describe("LocalMockTranslator: single-clause grammar", () => {
  const cases: { text: string; expected: FactDescriptor }[] = [
    {
      text: "A, B, P, Q are concyclic",
      expected: { kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] },
    },
    {
      text: "AB is parallel to CD",
      expected: { kind: "rel", name: "para", points: ["A", "B", "C", "D"] },
    },
    {
      text: "AB is perpendicular to CD",
      expected: { kind: "rel", name: "perp", points: ["A", "B", "C", "D"] },
    },
    {
      text: "M is the midpoint of AB",
      expected: { kind: "rel", name: "midp", points: ["M", "A", "B"] },
    },
    {
      text: "A, B, C are collinear",
      expected: { kind: "rel", name: "coll", points: ["A", "B", "C"] },
    },
    {
      text: "angle APB = angle AQB",
      expected: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
    },
    {
      text: "AB = CD",
      expected: { kind: "rel", name: "cong", points: ["A", "B", "C", "D"] },
    },
  ];

  for (const { text, expected } of cases) {
    it(`"${text}"`, async () => {
      expect(await conclusionOf(text)).toEqual(expected);
    });
  }

  it("parses an angle-value with an expression", async () => {
    const c = await conclusionOf("angle AOB = 180 - angle(A,O,C)");
    expect(c.kind).toBe("aval");
    if (c.kind === "aval") {
      expect(c.angle).toEqual(["A", "O", "B"]);
      expect(c.expr.replace(/\s/g, "")).toBe("180-angle(A,O,C)");
    }
  });
});

describe("LocalMockTranslator: premise splitting", () => {
  it("'<concl> since <prem>' puts the conclusion first", async () => {
    const r = await tr.translate(
      reqFor("angle APB = angle AQB since A, B, P, Q are concyclic"),
    );
    expect(r.conclusion).toEqual({
      kind: "rel",
      name: "eqangle",
      points: ["A", "P", "B", "A", "Q", "B"],
    });
    expect(r.premises).toEqual([
      { kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] },
    ]);
  });

  it("'<prem> so <concl>' puts the conclusion last", async () => {
    const r = await tr.translate(
      reqFor("A, B, P, Q are concyclic so angle APB = angle AQB"),
    );
    expect(r.conclusion.kind).toBe("rel");
    if (r.conclusion.kind === "rel") expect(r.conclusion.name).toBe("eqangle");
    expect(r.premises).toHaveLength(1);
  });

  it("splits multiple premises on 'and'", async () => {
    const r = await tr.translate(
      reqFor("AB = CD since AB is parallel to CD and A, B, C are collinear"),
    );
    expect(r.premises).toHaveLength(2);
  });
});

describe("LocalMockTranslator: failures", () => {
  it("throws TranslateError on an unintelligible statement", async () => {
    await expect(tr.translate(reqFor("hello there friend"))).rejects.toBeInstanceOf(
      TranslateError,
    );
  });

  it("never emits points outside the figure", async () => {
    // Z is not in POINTS, so it must be dropped (A, B, P, Q remain).
    const r = await tr.translate(reqFor("A, B, P, Q, Z are concyclic"));
    expect(r.conclusion).toEqual({
      kind: "rel",
      name: "cyclic",
      points: ["A", "B", "P", "Q"],
    });
    if (r.conclusion.kind === "rel") {
      expect(r.conclusion.points).not.toContain("Z");
    }
  });
});
