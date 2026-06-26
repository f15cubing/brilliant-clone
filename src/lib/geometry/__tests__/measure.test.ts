import { describe, expect, it } from "vitest";
import { angleDeg, dist, fmtDeg, inward, mid } from "@/lib/geometry/measure";
import type { JXGElement } from "@/lib/geometry/board-types";

/** Minimal stand-in for a JSXGraph point: only X()/Y() are used. */
function pt(x: number, y: number): JXGElement {
  return { X: () => x, Y: () => y };
}

describe("angleDeg", () => {
  it("measures a right angle", () => {
    expect(angleDeg(pt(1, 0), pt(0, 0), pt(0, 1))).toBeCloseTo(90, 9);
  });

  it("measures a straight angle (collinear, opposite rays)", () => {
    expect(angleDeg(pt(1, 0), pt(0, 0), pt(-1, 0))).toBeCloseTo(180, 9);
  });

  it("measures a 45-degree angle", () => {
    expect(angleDeg(pt(1, 0), pt(0, 0), pt(1, 1))).toBeCloseTo(45, 9);
  });

  it("is unsigned (orientation-independent)", () => {
    const a = angleDeg(pt(1, 0), pt(0, 0), pt(0, 1));
    const b = angleDeg(pt(0, 1), pt(0, 0), pt(1, 0));
    expect(a).toBeCloseTo(b, 9);
  });

  it("interior angles of a triangle sum to 180", () => {
    const A = pt(-3.5, -2.2);
    const B = pt(3.5, -2.6);
    const C = pt(0.4, 3);
    const sum =
      angleDeg(B, A, C) + angleDeg(A, B, C) + angleDeg(A, C, B);
    expect(sum).toBeCloseTo(180, 6);
  });
});

describe("fmtDeg", () => {
  it("rounds to one decimal by default with a degree sign", () => {
    expect(fmtDeg(63.44)).toBe("63.4°");
  });

  it("respects a custom digit count", () => {
    expect(fmtDeg(90, 0)).toBe("90°");
    expect(fmtDeg(12.3456, 2)).toBe("12.35°");
  });
});

describe("dist", () => {
  it("computes a 3-4-5 distance", () => {
    expect(dist(pt(0, 0), pt(3, 4))).toBeCloseTo(5, 9);
  });

  it("is zero for coincident points", () => {
    expect(dist(pt(2, 7), pt(2, 7))).toBe(0);
  });
});

describe("mid", () => {
  it("returns the midpoint coordinates", () => {
    expect(mid(pt(0, 0), pt(2, 4))).toEqual([1, 2]);
    expect(mid(pt(-3, 5), pt(3, -5))).toEqual([0, 0]);
  });
});

describe("inward", () => {
  it("points along the angle bisector at distance d", () => {
    const v = pt(0, 0);
    const [x, y] = inward(v, pt(1, 0), pt(0, 1), 1);
    // Bisector of the +x / +y axes is the 45-degree direction.
    expect(x).toBeCloseTo(Math.SQRT1_2, 9);
    expect(y).toBeCloseTo(Math.SQRT1_2, 9);
    expect(Math.hypot(x, y)).toBeCloseTo(1, 9);
  });

  it("lands strictly inside the angle (equidistant in angle from both rays)", () => {
    const v = pt(0, 0);
    const p1 = pt(2, 0);
    const p2 = pt(0, 3);
    const [x, y] = inward(v, p1, p2, 0.5);
    const probe = pt(x, y);
    const toP1 = angleDeg(probe, v, p1);
    const toP2 = angleDeg(probe, v, p2);
    expect(toP1).toBeCloseTo(toP2, 6);
  });

  it("does not throw or NaN when a ray is degenerate (point at vertex)", () => {
    const v = pt(1, 1);
    const [x, y] = inward(v, v, pt(2, 1), 1);
    expect(Number.isFinite(x)).toBe(true);
    expect(Number.isFinite(y)).toBe(true);
  });
});
