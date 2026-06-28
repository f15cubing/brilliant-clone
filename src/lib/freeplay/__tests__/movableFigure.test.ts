import { describe, expect, it } from "vitest";
import type { Coords } from "@/lib/freeplay/check";
import { factHoldsL } from "@/lib/freeplay/lengths/dsl";
import { buildMovableFigureDef } from "@/lib/freeplay/movableFigure";
import { FREEPLAY_PUZZLES, getPuzzle } from "@/lib/freeplay/puzzles";
import { isValidRealization, makeRng } from "@/lib/freeplay/realize";
import type { BoardRefs } from "@/lib/geometry/board-types";

/** Build a mock JSXGraph refs map (only X()/Y() are read by the figure logic). */
function mockRefs(coords: Record<string, [number, number]>): BoardRefs {
  const refs: BoardRefs = {};
  for (const [id, [x, y]] of Object.entries(coords)) {
    refs[id] = { X: () => x, Y: () => y } as unknown as BoardRefs[string];
  }
  return refs;
}

const movable = FREEPLAY_PUZZLES.filter((p) => p.constructFrom);

describe("movable freeplay figures", () => {
  it("a majority of the catalog is draggable", () => {
    // The straightforward (free-plane-point) puzzles are converted; the
    // glider/numeric ones gracefully fall back to a fixed board.
    expect(movable.length).toBeGreaterThanOrEqual(10);
    expect(movable.length).toBeGreaterThan(FREEPLAY_PUZZLES.length / 2);
  });

  for (const puzzle of movable) {
    const free: Coords = {};
    for (const id of puzzle.freePoints ?? []) free[id] = puzzle.coords[id];
    const bindings = puzzle.variables ?? {};

    describe(puzzle.id, () => {
      it("declares free points it can actually drive", () => {
        expect(puzzle.freePoints && puzzle.freePoints.length).toBeGreaterThan(0);
      });

      it("constructFrom(canonical free points) is a valid realization", () => {
        const r = puzzle.constructFrom!(free);
        expect(
          isValidRealization(puzzle, {
            coords: r.coords,
            bindings: r.bindings ?? bindings,
          }),
        ).toBe(true);
      });

      it("the goal holds at the canonical free positions", () => {
        const r = puzzle.constructFrom!(free);
        expect(factHoldsL(puzzle.goal, r.coords, r.bindings ?? bindings)).toBe(
          true,
        );
      });

      it("echoes the dragged free points back unchanged", () => {
        const r = puzzle.constructFrom!(free);
        for (const id of puzzle.freePoints!) {
          expect(r.coords[id][0]).toBeCloseTo(free[id][0], 9);
          expect(r.coords[id][1]).toBeCloseTo(free[id][1], 9);
        }
      });

      it("keeps every given satisfied as the free points are dragged", () => {
        // Glider puzzles enforce each point's locus via a JSXGraph glider (not
        // constructFrom), so an arbitrary plane perturbation isn't a legal drag —
        // a glider's locus may itself depend on the perturbed handles. Their
        // correctness is covered by the canonical-validity check above.
        if (puzzle.movable) {
          expect(
            isValidRealization(puzzle, {
              coords: puzzle.constructFrom!(free).coords,
              bindings,
            }),
          ).toBe(true);
          return;
        }
        // Only plane-only puzzles reach here (glider puzzles returned above), so
        // every free point is a plane handle that can be perturbed arbitrarily.
        const rng = makeRng(0x5eed + puzzle.id.length);
        let realized = 0;
        for (let i = 0; i < 16; i++) {
          const dragged: Coords = {};
          for (const id of puzzle.freePoints!) {
            dragged[id] = [
              free[id][0] + (rng() * 2 - 1) * 0.4,
              free[id][1] + (rng() * 2 - 1) * 0.4,
            ];
          }
          let coords: Coords;
          try {
            coords = puzzle.constructFrom!(dragged).coords;
          } catch {
            continue; // a degenerate drag; the figure guard snaps these back
          }
          const finite = Object.values(coords).every(
            (p) => Number.isFinite(p[0]) && Number.isFinite(p[1]),
          );
          if (!finite) continue;
          realized++;
          // Configuration independence: every hypothesis the proof relies on
          // still holds at the new position, so dragging can never invalidate it.
          for (const g of puzzle.given) {
            expect(factHoldsL(g, coords, bindings)).toBe(true);
          }
        }
        expect(realized).toBeGreaterThan(0);
      });
    });
  }
});

describe("buildMovableFigureDef", () => {
  const midsegment = getPuzzle("midsegment")!;
  const def = buildMovableFigureDef(midsegment);

  it("renders free points as draggable, dependents as fixed computed points", () => {
    const A = def.elements.find((e) => e.id === "A");
    const M = def.elements.find((e) => e.id === "M");
    expect(A?.type).toBe("point");
    expect(A?.attributes?.fixed).toBeFalsy();
    expect(typeof A?.constrain).toBe("function");

    expect(M?.type).toBe("point");
    expect(M?.attributes?.fixed).toBe(true);
    expect(
      M?.parents.every((p) => typeof p === "object" && p !== null && "fn" in p),
    ).toBe(true);
  });

  it("includes the puzzle's figure overlays and a bounding box", () => {
    expect(def.boundingBox).toBeDefined();
    // 3 free + 2 dependent points + the polygon + the MN segment.
    expect(def.elements.length).toBeGreaterThanOrEqual(7);
  });

  it("computes dependent coordinates from the live free points", () => {
    const M = def.elements.find((e) => e.id === "M")!;
    const refs = mockRefs({ A: [0, 5], B: [-4, -2], C: [5, -1] });
    const fx = (M.parents[0] as { fn: (r: BoardRefs) => number }).fn;
    const fy = (M.parents[1] as { fn: (r: BoardRefs) => number }).fn;
    expect(fx(refs)).toBeCloseTo(-2); // midpoint of A(0,5) and B(-4,-2)
    expect(fy(refs)).toBeCloseTo(1.5);
  });

  it("snaps a free point back when a drag makes the figure degenerate", () => {
    const A = def.elements.find((e) => e.id === "A")!;
    const constrain = A.constrain!;
    const good = mockRefs({ A: [0, 5], B: [-4, -2], C: [5, -1] });
    // A non-degenerate triangle is accepted (no snap-back).
    expect(constrain(good, good.A)).toBeUndefined();
    // A coinciding with B is degenerate ⇒ snap A back to its last valid spot.
    const bad = mockRefs({ A: [-4, -2], B: [-4, -2], C: [5, -1] });
    const snapped = constrain(bad, bad.A);
    expect(snapped).toEqual(midsegment.coords.A);
  });
});
