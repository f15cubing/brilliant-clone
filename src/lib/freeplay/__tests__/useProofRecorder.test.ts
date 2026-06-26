import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { CompiledProof } from "@/lib/freeplay/proofRecord";

// Mock the Firestore service so the cloud path is exercised without firebase.
const saveProofForUser = vi.fn<(uid: string, p: CompiledProof) => Promise<string>>();
vi.mock("@/lib/firebase/proofService", () => ({
  saveProofForUser: (uid: string, p: CompiledProof) => saveProofForUser(uid, p),
}));

import {
  GUEST_PROOFS_KEY,
  loadGuestProofs,
  makeAttemptGuard,
  recordCompiledProof,
} from "@/lib/freeplay/useProofRecorder";

const compiled: CompiledProof = {
  puzzleId: "midsegment",
  title: "The midsegment of a triangle",
  blurb: "Prove MN ∥ BC.",
  difficulty: "core",
  givens: [rel("midp", ["M", "A", "B"])],
  steps: [],
  goal: rel("para", ["M", "N", "B", "C"]),
  stepCount: 0,
};

/** Map-backed localStorage so the guest path works under the node test env. */
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
  saveProofForUser.mockReset();
  saveProofForUser.mockResolvedValue("new-doc-id");
  installLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recordCompiledProof — routing", () => {
  it("cloud: signed-in user writes via proofService and reports 'cloud' saved", async () => {
    const result = await recordCompiledProof(
      { configured: true, uid: "user-123", testMode: false },
      compiled,
    );
    expect(saveProofForUser).toHaveBeenCalledTimes(1);
    expect(saveProofForUser).toHaveBeenCalledWith("user-123", compiled);
    expect(result).toEqual({ status: "saved", scope: "cloud" });
    // Guest storage untouched on the cloud path.
    expect(loadGuestProofs()).toEqual([]);
  });

  it("guest (not configured): appends to localStorage and reports 'local' saved", async () => {
    const result = await recordCompiledProof(
      { configured: false, uid: null, testMode: false },
      compiled,
    );
    expect(saveProofForUser).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "saved", scope: "local" });

    const history = loadGuestProofs();
    expect(history).toHaveLength(1);
    expect(history[0].puzzleId).toBe("midsegment");
    expect(typeof history[0].solvedAt).toBe("number");
  });

  it("guest (configured but logged out): also routes to localStorage", async () => {
    const result = await recordCompiledProof(
      { configured: true, uid: null, testMode: false },
      compiled,
    );
    expect(saveProofForUser).not.toHaveBeenCalled();
    expect(result.scope).toBe("local");
  });

  it("guest path APPENDS (full history — one record per solve)", async () => {
    const env = { configured: false, uid: null, testMode: false };
    await recordCompiledProof(env, compiled);
    await recordCompiledProof(env, { ...compiled, stepCount: 2 });
    const history = loadGuestProofs();
    expect(history).toHaveLength(2);
    expect(history.map((p) => p.stepCount)).toEqual([0, 2]);
  });

  it("test mode: never persists (idle), neither cloud nor local", async () => {
    const result = await recordCompiledProof(
      { configured: true, uid: "user-123", testMode: true },
      compiled,
    );
    expect(saveProofForUser).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "idle" });
    expect(localStorage.getItem(GUEST_PROOFS_KEY)).toBeNull();
  });

  it("cloud failure resolves to an error state (never throws)", async () => {
    saveProofForUser.mockRejectedValueOnce(new Error("offline"));
    const result = await recordCompiledProof(
      { configured: true, uid: "user-123", testMode: false },
      compiled,
    );
    expect(result).toEqual({ status: "error", scope: "cloud" });
  });
});

describe("makeAttemptGuard — single-save idempotency", () => {
  it("returns true once per key, false for repeats", () => {
    const guard = makeAttemptGuard();
    expect(guard("midsegment#0")).toBe(true);
    expect(guard("midsegment#0")).toBe(false); // re-render / StrictMode repeat
    expect(guard("midsegment#0")).toBe(false);
  });

  it("treats a new attempt key (e.g. after Reset) as savable again", () => {
    const guard = makeAttemptGuard();
    expect(guard("midsegment#0")).toBe(true);
    expect(guard("midsegment#1")).toBe(true);
  });
});
