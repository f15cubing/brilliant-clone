import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { CompiledProof } from "@/lib/freeplay/proofRecord";

// Mock the Firestore service so the cloud path is exercised without firebase.
const listProofsForUser = vi.fn();
vi.mock("@/lib/firebase/proofService", () => ({
  listProofsForUser: (...a: unknown[]) => listProofsForUser(...a),
  saveProofForUser: vi.fn(),
}));

import { GUEST_PROOFS_KEY } from "@/lib/freeplay/useProofRecorder";
import {
  latestPerPuzzle,
  loadSolvedProofs,
  solvedAtMillis,
  type ArchivedProof,
} from "@/lib/freeplay/proofArchive";

const base = (puzzleId: string): CompiledProof => ({
  puzzleId,
  title: puzzleId,
  blurb: "",
  difficulty: "core",
  givens: [],
  steps: [],
  goal: rel("para", ["A", "B", "C", "D"]),
  stepCount: 0,
});

const archived = (
  puzzleId: string,
  solvedAtMs: number,
  extra?: Partial<ArchivedProof>,
): ArchivedProof => ({
  ...base(puzzleId),
  id: `${puzzleId}-${solvedAtMs}`,
  solvedAtMillis: solvedAtMs,
  ...extra,
});

function installLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
}

beforeEach(() => {
  listProofsForUser.mockReset().mockResolvedValue([]);
  installLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("solvedAtMillis", () => {
  it("passes through a plain number (guest timestamp)", () => {
    expect(solvedAtMillis(1234)).toBe(1234);
  });
  it("uses toMillis() on a Firestore Timestamp instance", () => {
    expect(solvedAtMillis({ toMillis: () => 5000 })).toBe(5000);
  });
  it("converts a serialized { seconds } shape", () => {
    expect(solvedAtMillis({ seconds: 2 })).toBe(2000);
  });
  it("falls back to 0 for null/undefined/unknown", () => {
    expect(solvedAtMillis(null)).toBe(0);
    expect(solvedAtMillis(undefined)).toBe(0);
    expect(solvedAtMillis("nope")).toBe(0);
  });
});

describe("latestPerPuzzle", () => {
  it("keeps one entry per puzzle (the latest) sorted newest-first", () => {
    const older = archived("p1", 100);
    const newer = archived("p1", 300, { stepCount: 5 });
    const other = archived("p2", 200);

    const result = latestPerPuzzle([older, newer, other]);

    expect(result.map((p) => p.puzzleId)).toEqual(["p1", "p2"]);
    expect(result[0].stepCount).toBe(5); // kept the newer p1 solve
    expect(result[0].solvedAtMillis).toBe(300);
  });

  it("returns an empty array for no proofs", () => {
    expect(latestPerPuzzle([])).toEqual([]);
  });
});

describe("loadSolvedProofs — routing", () => {
  it("cloud: reads via proofService and normalizes solvedAt", async () => {
    listProofsForUser.mockResolvedValueOnce([
      { ...base("p1"), id: "doc1", solvedAt: { toMillis: () => 999 } },
    ]);
    const res = await loadSolvedProofs({ configured: true, uid: "u1" });
    expect(listProofsForUser).toHaveBeenCalledWith("u1");
    expect(res[0]).toMatchObject({
      id: "doc1",
      puzzleId: "p1",
      solvedAtMillis: 999,
    });
  });

  it("guest: reads the localStorage history and normalizes solvedAt", async () => {
    localStorage.setItem(
      GUEST_PROOFS_KEY,
      JSON.stringify([{ ...base("p1"), solvedAt: 1234 }]),
    );
    const res = await loadSolvedProofs({ configured: false, uid: null });
    expect(listProofsForUser).not.toHaveBeenCalled();
    expect(res[0]).toMatchObject({ puzzleId: "p1", solvedAtMillis: 1234 });
  });

  it("guest (configured but logged out): also reads localStorage", async () => {
    const res = await loadSolvedProofs({ configured: true, uid: null });
    expect(listProofsForUser).not.toHaveBeenCalled();
    expect(res).toEqual([]);
  });
});
