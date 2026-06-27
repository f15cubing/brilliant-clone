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

describe("LocalMockTranslator: ratio/proportion clauses", () => {
  it("product PA·PB = PC·PD → eqratio [P,A,P,C,P,D,P,B]", async () => {
    expect(await conclusionOf("PA·PB = PC·PD")).toEqual({
      kind: "eqratio",
      points: ["P", "A", "P", "C", "P", "D", "P", "B"],
    });
  });

  it("product with '*' operator parses identically", async () => {
    expect(await conclusionOf("PA*PB = PC*PD")).toEqual({
      kind: "eqratio",
      points: ["P", "A", "P", "C", "P", "D", "P", "B"],
    });
  });

  it("explicit ratio AB/CD = AP/BQ → eqratio [A,B,C,D,A,P,B,Q]", async () => {
    expect(await conclusionOf("AB/CD = AP/BQ")).toEqual({
      kind: "eqratio",
      points: ["A", "B", "C", "D", "A", "P", "B", "Q"],
    });
  });

  it("the 'power of a point' phrasing still routes through the product parse", async () => {
    expect(await conclusionOf("by power of a point, PA·PB = PC·PD")).toEqual({
      kind: "eqratio",
      points: ["P", "A", "P", "C", "P", "D", "P", "B"],
    });
  });

  it("drops a ratio premise whose tokens aren't figure points (→ notes)", async () => {
    const r = await tr.translate(
      reqFor("PA·PB = PC·PD since XY/ZW = UV/RS"),
    );
    expect(r.conclusion).toEqual({
      kind: "eqratio",
      points: ["P", "A", "P", "C", "P", "D", "P", "B"],
    });
    expect(r.premises).toHaveLength(0);
    expect(r.notes).toBeTruthy();
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
    // Each premise is tagged with the clause it was parsed from (grounding).
    expect(r.premises).toEqual([
      {
        kind: "rel",
        name: "cyclic",
        points: ["A", "B", "P", "Q"],
        source: "A, B, P, Q are concyclic",
      },
    ]);
  });

  it("tags each premise with its `source` clause (so it grounds)", async () => {
    const r = await tr.translate(
      reqFor("AB = CD since AB is parallel to CD and A, B, C are collinear"),
    );
    expect(r.premises.map((p) => p.source)).toEqual([
      "AB is parallel to CD",
      "A, B, C are collinear",
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

/**
 * Rule citations (" by <rule> on …") and bare point-lists: the GENERAL no-drop
 * improvements. A theorem's named lines must become their own `coll` premises
 * (each grounded) instead of being swallowed into the conclusion — this is the
 * deterministic mirror of the OpenAI faithful-completeness fix, and it is not
 * special-cased to Pappus.
 */
describe("LocalMockTranslator: rule citations + bare lines (no dropping)", () => {
  const IMO = ["A", "B", "C", "P", "Q", "A1", "B1", "A2", "B2", "P1", "Q1"];
  const trIMO = new LocalMockTranslator();
  const reqIMO = (text: string): TranslateRequest => ({
    text,
    puzzleId: "imo-2019-p2",
    points: IMO,
    variables: [],
    established: [],
  });
  // Name + points only (the exact `source` span is asserted separately).
  const shape = (p: FactDescriptor) =>
    p.kind === "rel" ? { name: p.name, points: p.points } : { kind: p.kind };

  it("inline 'by Pappus on L1 and L2, and PQ ∥ AB' captures ALL three premises", async () => {
    const r = await trIMO.translate(
      reqIMO("A2B2 is parallel to AB by infinite Pappus on APA1 and BQB1, and PQ parallel to AB"),
    );
    expect(r.conclusion).toEqual({ kind: "rel", name: "para", points: ["A2", "B2", "A", "B"] });
    expect(r.premises.map(shape)).toEqual([
      { name: "coll", points: ["A", "P", "A1"] },
      { name: "coll", points: ["B", "Q", "B1"] },
      { name: "para", points: ["P", "Q", "A", "B"] },
    ]);
    // Every premise carries a (non-empty) source span so it grounds downstream.
    expect(r.premises.every((p) => typeof p.source === "string" && p.source.length > 0)).toBe(
      true,
    );
  });

  it("is NOT Pappus-gated: any 'by <rule> on L1 and L2' yields two coll premises", async () => {
    const r = await trIMO.translate(
      reqIMO("A2B2 is parallel to AB by some theorem on ABC and A1B1C, and PQ parallel to AB"),
    );
    expect(r.conclusion).toEqual({ kind: "rel", name: "para", points: ["A2", "B2", "A", "B"] });
    expect(r.premises.map(shape)).toEqual([
      { name: "coll", points: ["A", "B", "C"] },
      { name: "coll", points: ["A1", "B1", "C"] },
      { name: "para", points: ["P", "Q", "A", "B"] },
    ]);
  });

  it("reads a bare point-list premise (no 'collinear' keyword) as coll", async () => {
    const r = await trIMO.translate(reqIMO("A2B2 is parallel to AB since A, P, A1"));
    expect(r.premises.map(shape)).toEqual([{ name: "coll", points: ["A", "P", "A1"] }]);
  });

  it("regression: 'by power of a point, …' still parses the conclusion (after 'by')", async () => {
    // POINTS (with D) — the " by " split must keep the conclusion AFTER "by" here.
    const r = await tr.translate(reqFor("by power of a point, PA·PB = PC·PD"));
    expect(r.conclusion).toEqual({
      kind: "eqratio",
      points: ["P", "A", "P", "C", "P", "D", "P", "B"],
    });
  });
});
