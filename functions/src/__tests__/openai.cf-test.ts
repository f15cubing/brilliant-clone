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
