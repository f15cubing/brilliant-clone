import { describe, expect, it } from "vitest";
import {
  parallelAngleDeg,
  parallelAngleRayPoints,
} from "@/lib/geometry/parallelAngles";
import type { BoardRefs, JXGElement } from "@/lib/geometry/board-types";

function pt(x: number, y: number): JXGElement {
  return { X: () => x, Y: () => y };
}

/**
 * Two horizontal parallel lines (upper y=1, lower y=-1) cut by a transversal.
 * P1 is the upper intersection, P2 the lower one.
 */
function refs(p1x = 0, p2x = 1): BoardRefs {
  return {
    L1L: pt(-3, 1),
    L1R: pt(3, 1),
    L2L: pt(-3, -1),
    L2R: pt(3, -1),
    P1: pt(p1x, 1),
    P2: pt(p2x, -1),
  };
}

describe("parallelAngleDeg — angle relationships", () => {
  it("corresponding angles at P1 and P2 are equal", () => {
    const r = refs();
    const at1 = parallelAngleDeg(r, "P1", "corresponding");
    const at2 = parallelAngleDeg(r, "P2", "corresponding");
    expect(at1).toBeCloseTo(at2, 9);
  });

  it("alternate angles at P1 and P2 are equal", () => {
    const r = refs();
    const at1 = parallelAngleDeg(r, "P1", "alternate");
    const at2 = parallelAngleDeg(r, "P2", "alternate");
    expect(at1).toBeCloseTo(at2, 9);
  });

  it("co-interior angles at P1 and P2 are supplementary", () => {
    const r = refs();
    const at1 = parallelAngleDeg(r, "P1", "cointerior");
    const at2 = parallelAngleDeg(r, "P2", "cointerior");
    expect(at1 + at2).toBeCloseTo(180, 9);
  });

  it("all marked angles stay in the open interval (0, 180)", () => {
    const r = refs(0.4, 1.7);
    for (const kind of ["corresponding", "alternate", "cointerior"] as const) {
      for (const v of ["P1", "P2"] as const) {
        const a = parallelAngleDeg(r, v, kind);
        expect(a).toBeGreaterThan(0);
        expect(a).toBeLessThan(180);
      }
    }
  });

  it("relationships hold after rotating the transversal (continuity)", () => {
    // Steeper transversal: equality/supplementary relations must persist.
    const r = refs(-1, 2);
    expect(parallelAngleDeg(r, "P1", "corresponding")).toBeCloseTo(
      parallelAngleDeg(r, "P2", "corresponding"),
      9,
    );
    expect(parallelAngleDeg(r, "P1", "alternate")).toBeCloseTo(
      parallelAngleDeg(r, "P2", "alternate"),
      9,
    );
    expect(
      parallelAngleDeg(r, "P1", "cointerior") +
        parallelAngleDeg(r, "P2", "cointerior"),
    ).toBeCloseTo(180, 9);
  });

  it("matches the directly-computed angle for a known transversal", () => {
    // e = (1,0); t = unit(P2-P1) with P1=(0,1), P2=(1,-1) => unit(1,-2).
    // corresponding at P1 uses line=-e, trans=+t => angle = atan2(2, -1).
    const r = refs(0, 1);
    const expected = (Math.atan2(2, -1) * 180) / Math.PI;
    expect(parallelAngleDeg(r, "P1", "corresponding")).toBeCloseTo(expected, 9);
  });
});

describe("parallelAngleRayPoints", () => {
  it("places both ray endpoints at the fixed ray scale from the vertex", () => {
    const r = refs();
    const { line, trans } = parallelAngleRayPoints(r, "P1", "alternate");
    const v = r.P1;
    expect(Math.hypot(line[0] - v.X(), line[1] - v.Y())).toBeCloseTo(0.6, 9);
    expect(Math.hypot(trans[0] - v.X(), trans[1] - v.Y())).toBeCloseTo(0.6, 9);
  });

  it("anchors ray points at the requested vertex", () => {
    const r = refs(0.2, 1.3);
    const { line } = parallelAngleRayPoints(r, "P2", "corresponding");
    // Endpoint should be within one ray-scale of P2.
    expect(Math.hypot(line[0] - r.P2.X(), line[1] - r.P2.Y())).toBeCloseTo(
      0.6,
      9,
    );
  });
});
