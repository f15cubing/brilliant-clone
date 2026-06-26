import { describe, expect, it } from "vitest";
import { canonicalKey, rel } from "../../dsl";
import {
  descriptorToFact,
  factToDescriptor,
  matchPremises,
  MapError,
  MAX_COLL,
} from "../map";
import type { FactDescriptor } from "../types";

const POINTS = ["O", "A", "B", "P", "Q"];

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
});
