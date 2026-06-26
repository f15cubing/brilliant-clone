import { describe, expect, it } from "vitest";
import { subtendedCentralDeg, subtendedOrder } from "@/lib/geometry/circleAngles";
import { angleDeg } from "@/lib/geometry/measure";
import type { JXGElement } from "@/lib/geometry/board-types";

function pt(x: number, y: number): JXGElement {
  return { X: () => x, Y: () => y };
}

/** Point on the unit circle (center origin) at `deg` degrees, scaled by r. */
function onCircle(deg: number, r = 1, cx = 0, cy = 0): JXGElement {
  const rad = (deg * Math.PI) / 180;
  return pt(cx + r * Math.cos(rad), cy + r * Math.sin(rad));
}

describe("subtendedCentralDeg — inscribed angle theorem", () => {
  const center = pt(0, 0);

  it("central angle is twice the inscribed angle (apex on major arc)", () => {
    const a = onCircle(0);
    const b = onCircle(90);
    const apex = onCircle(225);
    const inscribed = angleDeg(a, apex, b);
    const central = subtendedCentralDeg(center, a, b, apex);
    expect(central).toBeCloseTo(2 * inscribed, 6);
    expect(central).toBeCloseTo(90, 6);
  });

  it("produces a reflex central angle when apex is on the minor arc", () => {
    const a = onCircle(0);
    const b = onCircle(90);
    const apex = onCircle(45); // between a and b => on minor arc
    const inscribed = angleDeg(a, apex, b);
    const central = subtendedCentralDeg(center, a, b, apex);
    expect(central).toBeGreaterThan(180);
    expect(central).toBeCloseTo(2 * inscribed, 6);
    expect(central).toBeCloseTo(270, 6);
  });

  it("holds the 2x identity across several generic configurations", () => {
    const configs: Array<[number, number, number]> = [
      [10, 140, 250],
      [30, 200, 330],
      [-20, 70, 190],
      [0, 120, 200],
    ];
    for (const [da, db, dapex] of configs) {
      const a = onCircle(da, 2.5, 1, -0.5);
      const b = onCircle(db, 2.5, 1, -0.5);
      const apex = onCircle(dapex, 2.5, 1, -0.5);
      const inscribed = angleDeg(a, apex, b);
      const central = subtendedCentralDeg(pt(1, -0.5), a, b, apex);
      expect(central).toBeCloseTo(2 * inscribed, 5);
    }
  });

  it("is symmetric in the two endpoints", () => {
    const a = onCircle(15);
    const b = onCircle(160);
    const apex = onCircle(280);
    expect(subtendedCentralDeg(center, a, b, apex)).toBeCloseTo(
      subtendedCentralDeg(center, b, a, apex),
      9,
    );
  });
});

describe("subtendedOrder", () => {
  const center = pt(0, 0);

  it("keeps order a->b when apex is outside the CCW arc a->b", () => {
    const a = onCircle(0);
    const b = onCircle(90);
    const apex = onCircle(225);
    const { from, to } = subtendedOrder(center, a, b, apex);
    expect(from).toBe(a);
    expect(to).toBe(b);
  });

  it("swaps to b->a when apex lies inside the CCW arc a->b", () => {
    const a = onCircle(0);
    const b = onCircle(90);
    const apex = onCircle(45);
    const { from, to } = subtendedOrder(center, a, b, apex);
    expect(from).toBe(b);
    expect(to).toBe(a);
  });
});
