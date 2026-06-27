import { describe, expect, it } from "vitest";
import { aval, canonicalKey, rel } from "../../dsl";
import { parseForm } from "../../form";
import { eqratio } from "../../lengths/dsl";
import {
  descriptorToFact,
  factToDescriptor,
  matchPremises,
  MapError,
  MAX_COLL,
} from "../map";
import type { FactDescriptor } from "../types";

const POINTS = ["O", "A", "B", "P", "Q"];
const RATIO_POINTS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const eight = (p: string[]): [string, string, string, string, string, string, string, string] =>
  [p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7]];

describe("descriptorToFact", () => {
  it("lowers a valid relation descriptor", () => {
    const f = descriptorToFact(
      { kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] },
      POINTS,
    );
    expect(f).toEqual(rel("cyclic", ["A", "B", "P", "Q"]));
  });

  it("lowers a valid angle-value descriptor (expr → parseForm)", () => {
    const f = descriptorToFact({ kind: "aval", angle: ["A", "P", "B"], expr: "90" }, POINTS);
    expect(f.kind).toBe("aval");
  });

  it("rejects an invented point → unknown_point", () => {
    expect.assertions(2);
    try {
      descriptorToFact({ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Z"] }, POINTS);
    } catch (e) {
      expect(e).toBeInstanceOf(MapError);
      expect((e as MapError).code).toBe("unknown_point");
    }
  });

  it("rejects wrong arity on a fixed-arity relation → bad_arity", () => {
    try {
      descriptorToFact({ kind: "rel", name: "cyclic", points: ["A", "B", "P"] }, POINTS);
    } catch (e) {
      expect((e as MapError).code).toBe("bad_arity");
    }
  });

  it("accepts coll with 3 points and rejects more than MAX_COLL", () => {
    expect(() =>
      descriptorToFact({ kind: "rel", name: "coll", points: ["A", "B", "P"] }, POINTS),
    ).not.toThrow();
    const many = Array.from({ length: MAX_COLL + 1 }, () => "A");
    try {
      descriptorToFact({ kind: "rel", name: "coll", points: many }, POINTS);
    } catch (e) {
      expect((e as MapError).code).toBe("bad_arity");
    }
  });

  it("rejects an unparseable expression → bad_expr", () => {
    try {
      descriptorToFact({ kind: "aval", angle: ["A", "P", "B"], expr: "A*B" }, POINTS);
    } catch (e) {
      expect((e as MapError).code).toBe("bad_expr");
    }
  });

  it("tolerates a LaTeX angle expr the AI mirrors from context (180 - \\angle AOB)", () => {
    // Regression for the format mismatch: the AI sometimes emits `\angle ...`
    // (the display syntax) instead of `angle(...)`. descriptorToFact must still
    // lower it to the SAME fact as the canonical parse syntax would.
    const latex = descriptorToFact(
      { kind: "aval", angle: ["A", "O", "B"], expr: "180 - \\angle AOC" },
      ["A", "O", "B", "C"],
    );
    const canonical = descriptorToFact(
      { kind: "aval", angle: ["A", "O", "B"], expr: "180 - angle(A,O,C)" },
      ["A", "O", "B", "C"],
    );
    expect(canonicalKey(latex)).toBe(canonicalKey(canonical));
  });

  it("tolerates a LaTeX angle expr with MULTI-CHARACTER labels (180 - \\angle A2B2C)", () => {
    // The reported case: an IMO-style figure with labels A2/B2/Q1. descriptorToFact
    // has the figure's points, so `\angle A2B2C` splits as angle(A2,B2,C) — not
    // angle(A,2,B,2,C) — and lowers to the same fact as the canonical comma form.
    const figure = ["A2", "B2", "C", "Q1"];
    const latex = descriptorToFact(
      { kind: "aval", angle: ["A2", "B2", "Q1"], expr: "180 - \\angle A2B2C" },
      figure,
    );
    const canonical = descriptorToFact(
      { kind: "aval", angle: ["A2", "B2", "Q1"], expr: "180 - angle(A2,B2,C)" },
      figure,
    );
    expect(canonicalKey(latex)).toBe(canonicalKey(canonical));
  });

  it("rejects an unknown relation → unknown_relation", () => {
    try {
      descriptorToFact(
        { kind: "rel", name: "bogus" as never, points: ["A", "B"] },
        POINTS,
      );
    } catch (e) {
      expect((e as MapError).code).toBe("unknown_relation");
    }
  });
});

describe("descriptorToFact: eqratio", () => {
  it("lowers a valid 8-point ratio descriptor to an EqRatio", () => {
    const f = descriptorToFact(
      { kind: "eqratio", points: eight(RATIO_POINTS) },
      RATIO_POINTS,
    );
    expect(f).toEqual(eqratio("A", "B", "C", "D", "E", "F", "G", "H"));
  });

  it("rejects ≠8 points → bad_arity (7)", () => {
    try {
      descriptorToFact(
        { kind: "eqratio", points: ["A", "B", "C", "D", "E", "F", "G"] as never },
        RATIO_POINTS,
      );
      expect.unreachable();
    } catch (e) {
      expect((e as MapError).code).toBe("bad_arity");
    }
  });

  it("rejects ≠8 points → bad_arity (9)", () => {
    try {
      descriptorToFact(
        { kind: "eqratio", points: [...RATIO_POINTS, "A"] as never },
        RATIO_POINTS,
      );
      expect.unreachable();
    } catch (e) {
      expect((e as MapError).code).toBe("bad_arity");
    }
  });

  it("rejects an off-figure label → unknown_point", () => {
    try {
      descriptorToFact(
        { kind: "eqratio", points: ["A", "B", "C", "D", "E", "F", "G", "Z"] },
        RATIO_POINTS,
      );
      expect.unreachable();
    } catch (e) {
      expect((e as MapError).code).toBe("unknown_point");
    }
  });

  it("rejects a non-array points → bad_descriptor", () => {
    try {
      descriptorToFact(
        { kind: "eqratio", points: "ABCDEFGH" as never },
        RATIO_POINTS,
      );
      expect.unreachable();
    } catch (e) {
      expect((e as MapError).code).toBe("bad_descriptor");
    }
  });
});

describe("matchPremises: eqratio symmetries (canonicalKeyL)", () => {
  const established = [eqratio("A", "B", "C", "D", "E", "F", "G", "H")]; // AB/CD = EF/GH

  const sameKey = (pts: string[], label: string) =>
    it(`resolves ${label} to the established ratio`, () => {
      const matched = matchPremises(
        [{ kind: "eqratio", points: eight(pts) }],
        established,
        RATIO_POINTS,
      );
      expect(canonicalKey(matched[0])).toBe(canonicalKey(established[0]));
      expect(matched[0]).toBe(established[0]); // resolved to the established instance
    });

  sameKey(["E", "F", "G", "H", "A", "B", "C", "D"], "swap ratios (EF/GH = AB/CD)");
  sameKey(["C", "D", "A", "B", "G", "H", "E", "F"], "invert both (CD/AB = GH/EF)");
  sameKey(["B", "A", "C", "D", "E", "F", "G", "H"], "endpoint swap (BA/CD = EF/GH)");
});

describe("factToDescriptor: eqratio round-trip", () => {
  it("round-trips an eqratio fact through descriptorToFact", () => {
    const f = eqratio("A", "B", "C", "D", "E", "F", "G", "H");
    const back = descriptorToFact(factToDescriptor(f), RATIO_POINTS);
    expect(canonicalKey(back)).toBe(canonicalKey(f));
    expect(factToDescriptor(f)).toEqual({ kind: "eqratio", points: eight(RATIO_POINTS) });
  });
});

describe("matchPremises", () => {
  it("resolves a premise descriptor to the established fact by canonicalKey", () => {
    const established = [rel("cyclic", ["A", "B", "P", "Q"])];
    const descriptors: FactDescriptor[] = [
      { kind: "rel", name: "cyclic", points: ["Q", "P", "B", "A"] }, // reordered
    ];
    const matched = matchPremises(descriptors, established, POINTS);
    expect(matched).toHaveLength(1);
    expect(canonicalKey(matched[0])).toBe(canonicalKey(established[0]));
    expect(matched[0]).toBe(established[0]); // resolved to the established instance
  });

  it("keeps a non-established premise as its lowered fact (verify rejects later)", () => {
    const matched = matchPremises(
      [{ kind: "rel", name: "cyclic", points: ["A", "B", "P", "Q"] }],
      [],
      POINTS,
    );
    expect(matched).toHaveLength(1);
    expect(canonicalKey(matched[0])).toBe(canonicalKey(rel("cyclic", ["A", "B", "P", "Q"])));
  });
});

describe("factToDescriptor", () => {
  it("round-trips a relation fact through descriptorToFact", () => {
    const f = rel("eqangle", ["A", "P", "B", "A", "Q", "B"]);
    const back = descriptorToFact(factToDescriptor(f), POINTS);
    expect(canonicalKey(back)).toBe(canonicalKey(f));
  });

  it("serializes an aval's expr in parse syntax (angle(...)), not \\angle LaTeX", () => {
    // The context fed to the AI must use the SAME syntax parseForm accepts, so
    // the model mirrors `angle(A,O,P)` rather than the unparseable `\angle AOP`.
    const f = aval(["A", "O", "B"], parseForm("180 - angle(A,O,P)"));
    const d = factToDescriptor(f);
    expect(d.kind).toBe("aval");
    if (d.kind !== "aval") throw new Error("expected aval");
    expect(d.expr).toBe("180 - angle(A,O,P)");
    expect(d.expr).not.toContain("\\angle");
  });

  it("round-trips an aval fact through descriptorToFact", () => {
    const f = aval(["A", "O", "B"], parseForm("180 - angle(A,O,P)"));
    const back = descriptorToFact(factToDescriptor(f), POINTS);
    expect(canonicalKey(back)).toBe(canonicalKey(f));
  });
});
