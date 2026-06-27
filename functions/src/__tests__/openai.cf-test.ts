import { describe, expect, it, vi } from "vitest";
import {
  buildJsonSchema,
  translateWithLLM,
  type LLMClient,
  type LLMRequest,
} from "../openai";
import type { TranslateRequest } from "../types";
import { ValidationError } from "../validate";

const req: TranslateRequest = {
  text: "angle APB equals angle AQB since A, B, P, Q are concyclic",
  puzzleId: "inscribed-angle",
  points: ["A", "B", "P", "Q", "O"],
  variables: [],
  established: [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] }],
};

/** A fake client that returns a fixed JSON payload — no network, no key. */
function fakeClient(payload: unknown): LLMClient {
  return {
    createStructured: vi.fn(async () => JSON.stringify(payload)),
  };
}

describe("buildJsonSchema", () => {
  it("locks the point enum to the figure's points", () => {
    const schema = buildJsonSchema(req) as Record<string, unknown>;
    const json = JSON.stringify(schema);
    expect(json).toContain('"A"');
    expect(json).not.toContain('"Z"');
    expect(json).toContain("eqangle");
  });

  it("includes an eqratio anyOf branch with minItems/maxItems 8 and enum points", () => {
    const schema = buildJsonSchema(req) as Record<string, unknown>;
    const descriptor = (schema.properties as Record<string, Record<string, unknown>>)
      .conclusion;
    const branches = descriptor.anyOf as Array<Record<string, unknown>>;
    const eqratioBranch = branches.find((b) => {
      const props = b.properties as Record<string, { enum?: string[] }>;
      return props.kind?.enum?.[0] === "eqratio";
    });
    expect(eqratioBranch).toBeDefined();
    const points = (eqratioBranch!.properties as Record<string, Record<string, unknown>>)
      .points;
    expect(points.minItems).toBe(8);
    expect(points.maxItems).toBe(8);
    expect((points.items as { enum: string[] }).enum).toEqual(req.points);
  });

  it("REQUIRES a `source` on every premise branch, but NOT on the conclusion", () => {
    const schema = buildJsonSchema(req) as Record<string, unknown>;
    const props = schema.properties as Record<string, Record<string, unknown>>;

    // The conclusion descriptor carries no `source` requirement.
    for (const b of props.conclusion.anyOf as Array<Record<string, unknown>>) {
      expect(b.required as string[]).not.toContain("source");
    }

    // Every premise descriptor branch requires a string `source`.
    const premiseItems = props.premises.items as Record<string, unknown>;
    const premiseBranches = premiseItems.anyOf as Array<Record<string, unknown>>;
    expect(premiseBranches.length).toBeGreaterThan(0);
    for (const b of premiseBranches) {
      expect(b.required as string[]).toContain("source");
      expect((b.properties as Record<string, unknown>).source).toEqual({ type: "string" });
    }
  });
});

describe("angle expression format (prompt)", () => {
  it("requires angle(...) parse syntax in `expr` and forbids \\angle LaTeX", async () => {
    const client = fakeClient({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [],
    });
    await translateWithLLM(client, req, "m");
    const call = (client.createStructured as unknown as { mock: { calls: LLMRequest[][] } })
      .mock.calls[0][0];
    const prompt = call.messages.map((m) => m.content).join("\n");
    // Positive: the `angle(P,Q,R)` form is named in both the vocab and a few-shot.
    expect(prompt).toContain("angle(P,Q,R)");
    expect(prompt).toContain('"180 - angle(A,O,C)"');
    // Negative: the model is told NOT to emit the display/LaTeX angle syntax.
    expect(prompt).toMatch(/NEVER use LaTeX/i);
    expect(prompt).toContain("\\angle");
  });
});

describe("translateWithLLM", () => {
  it("parses + re-validates a good structured response", async () => {
    const client = fakeClient({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] }],
    });
    const res = await translateWithLLM(client, req, "fake-model");
    expect(res.conclusion).toEqual({
      kind: "rel",
      name: "eqangle",
      points: ["A", "P", "B", "A", "Q", "B"],
    });
    expect(res.premises).toHaveLength(1);
  });

  it("preserves a premise `source` quote through output re-validation", async () => {
    const client = fakeClient({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [
        {
          kind: "rel",
          name: "cyclic",
          points: ["A", "B", "P", "Q"],
          source: "A, B, P, Q are concyclic",
        },
      ],
    });
    const res = await translateWithLLM(client, req, "m");
    expect(res.premises[0].source).toBe("A, B, P, Q are concyclic");
  });

  it("passes the configured model through to the client", async () => {
    const client = fakeClient({
      conclusion: { kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] },
      premises: [],
    });
    await translateWithLLM(client, req, "model-xyz");
    const call = (client.createStructured as unknown as { mock: { calls: LLMRequest[][] } })
      .mock.calls[0][0];
    expect(call.model).toBe("model-xyz");
  });

  it("throws on invalid JSON from the model", async () => {
    const bad: LLMClient = { createStructured: async () => "not json{" };
    await expect(translateWithLLM(bad, req, "m")).rejects.toThrow();
  });

  it("rejects a hallucinated point (output re-validation)", async () => {
    const client = fakeClient({
      conclusion: { kind: "rel", name: "cyclic", points: ["A", "B", "P", "Z"] },
      premises: [],
    });
    await expect(translateWithLLM(client, req, "m")).rejects.toThrow(ValidationError);
  });
});

describe("translateWithLLM: eqratio path (injected fake client)", () => {
  it("accepts a valid 8-point eqratio conclusion", async () => {
    const client = fakeClient({
      conclusion: { kind: "eqratio", points: ["A", "B", "P", "Q", "A", "B", "P", "Q"] },
      premises: [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] }],
    });
    const res = await translateWithLLM(client, req, "m");
    expect(res.conclusion).toEqual({
      kind: "eqratio",
      points: ["A", "B", "P", "Q", "A", "B", "P", "Q"],
    });
  });

  it("rejects a 7-point ratio (output re-validation)", async () => {
    const client = fakeClient({
      conclusion: { kind: "eqratio", points: ["A", "B", "P", "Q", "A", "B", "P"] },
      premises: [],
    });
    await expect(translateWithLLM(client, req, "m")).rejects.toThrow(ValidationError);
  });

  it("rejects a 9-point ratio (output re-validation)", async () => {
    const client = fakeClient({
      conclusion: { kind: "eqratio", points: ["A", "B", "P", "Q", "A", "B", "P", "Q", "A"] },
      premises: [],
    });
    await expect(translateWithLLM(client, req, "m")).rejects.toThrow(ValidationError);
  });

  it("rejects an off-figure label inside an 8-point ratio", async () => {
    const client = fakeClient({
      conclusion: { kind: "eqratio", points: ["A", "B", "P", "Q", "A", "B", "P", "Z"] },
      premises: [],
    });
    await expect(translateWithLLM(client, req, "m")).rejects.toThrow(ValidationError);
  });
});

/**
 * The faithfulness/completeness contract: the prompt must instruct the model to
 * cite EVERY stated premise (no minimization bias that silently drops the
 * "obvious" ones), and a faithful multi-premise response must pass through the
 * function boundary with all premises + their `source` quotes intact. This is
 * the general fix for steps like Pappus / SAS-SSS / directed-angle concyclic
 * that cite 3+ premises.
 */
describe("faithful completeness: prompt + multi-premise pass-through", () => {
  it("the prompt requires citing every stated premise and drops the minimization bias", async () => {
    const client = fakeClient({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "P", "B", "A", "Q", "B"] },
      premises: [],
    });
    await translateWithLLM(client, req, "m");
    const call = (client.createStructured as unknown as { mock: { calls: LLMRequest[][] } })
      .mock.calls[0][0];
    const prompt = call.messages.map((m) => m.content).join("\n");
    // The minimization bias that made the model drop stated premises is gone…
    expect(prompt).not.toContain("ALWAYS better");
    expect(prompt).not.toMatch(/citing fewer/i);
    // …replaced by an explicit completeness rule + a multi-premise worked example.
    expect(prompt).toMatch(/cite a premise for every relation the learner states/i);
    expect(prompt).toContain("never minimization");
    expect(prompt).toContain("Pappus");
  });

  it("keeps all three premises (2 coll + para) of a faithful Pappus response", async () => {
    const pappusReq: TranslateRequest = {
      text: "A2B2 ∥ AB by infinite Pappus on A,P,A1 and B,Q,B1, since PQ ∥ AB",
      puzzleId: "imo-2019-p2",
      points: ["A", "B", "C", "P", "Q", "A1", "B1", "A2", "B2", "P1", "Q1"],
      variables: [],
      established: [],
    };
    const client = fakeClient({
      conclusion: { kind: "rel", name: "para", points: ["A2", "B2", "A", "B"] },
      premises: [
        { kind: "rel", name: "coll", points: ["A", "P", "A1"], source: "A,P,A1" },
        { kind: "rel", name: "coll", points: ["B", "Q", "B1"], source: "B,Q,B1" },
        { kind: "rel", name: "para", points: ["P", "Q", "A", "B"], source: "PQ ∥ AB" },
      ],
    });
    const res = await translateWithLLM(client, pappusReq, "m");
    expect(res.premises).toHaveLength(3);
    expect(res.premises.map((p) => p.source)).toEqual(["A,P,A1", "B,Q,B1", "PQ ∥ AB"]);
  });

  it("keeps all three cong premises of an SSS-style response (with sources)", async () => {
    const sssReq: TranslateRequest = {
      text: "angle ABC = angle DEF since AB = DE and BC = EF and CA = FD",
      puzzleId: "t",
      points: ["A", "B", "C", "D", "E", "F"],
      variables: [],
      established: [],
    };
    const client = fakeClient({
      conclusion: { kind: "rel", name: "eqangle", points: ["A", "B", "C", "D", "E", "F"] },
      premises: [
        { kind: "rel", name: "cong", points: ["A", "B", "D", "E"], source: "AB = DE" },
        { kind: "rel", name: "cong", points: ["B", "C", "E", "F"], source: "BC = EF" },
        { kind: "rel", name: "cong", points: ["C", "A", "F", "D"], source: "CA = FD" },
      ],
    });
    const res = await translateWithLLM(client, sssReq, "m");
    expect(res.premises).toHaveLength(3);
    expect(res.premises.map((p) => p.source)).toEqual(["AB = DE", "BC = EF", "CA = FD"]);
  });
});
