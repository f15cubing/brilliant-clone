import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rel } from "@/lib/freeplay/dsl";
import type { ProofDraft } from "@/lib/freeplay/proof";

// Mock the Firestore service so the cloud path is exercised without firebase.
const saveDraftForUser = vi.fn();
const loadDraftForUser = vi.fn();
const deleteDraftForUser = vi.fn();
const listDraftSummariesForUser = vi.fn();
vi.mock("@/lib/firebase/draftService", () => ({
  saveDraftForUser: (...a: unknown[]) => saveDraftForUser(...a),
  loadDraftForUser: (...a: unknown[]) => loadDraftForUser(...a),
  deleteDraftForUser: (...a: unknown[]) => deleteDraftForUser(...a),
  listDraftSummariesForUser: (...a: unknown[]) => listDraftSummariesForUser(...a),
}));

import {
  GUEST_DRAFTS_KEY,
  fetchDraft,
  listDraftIds,
  loadGuestDraft,
  loadGuestDraftSummaries,
  recordDraft,
  removeDraft,
} from "@/lib/freeplay/proofDraft";

const draft: ProofDraft = {
  version: 1,
  derived: [
    {
      id: 2,
      fact: rel("para", ["M", "N", "B", "C"]),
      source: "derived",
      rule: "midsegment",
      premises: [rel("midp", ["M", "A", "B"])],
    },
  ],
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

const cloudEnv = { configured: true, uid: "user-123", testMode: false };
const guestEnv = { configured: false, uid: null, testMode: false };

beforeEach(() => {
  saveDraftForUser.mockReset().mockResolvedValue(undefined);
  loadDraftForUser.mockReset().mockResolvedValue(null);
  deleteDraftForUser.mockReset().mockResolvedValue(undefined);
  listDraftSummariesForUser.mockReset().mockResolvedValue([]);
  installLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("recordDraft — routing", () => {
  it("cloud: signed-in user writes via draftService", async () => {
    await recordDraft(cloudEnv, "midseg", draft);
    expect(saveDraftForUser).toHaveBeenCalledWith("user-123", "midseg", draft);
    expect(loadGuestDraft("midseg")).toBeNull();
  });

  it("guest (not configured): upserts into localStorage", async () => {
    await recordDraft(guestEnv, "midseg", draft);
    expect(saveDraftForUser).not.toHaveBeenCalled();
    expect(loadGuestDraft("midseg")?.derived).toEqual(draft.derived);
  });

  it("guest (configured but logged out): also routes to localStorage", async () => {
    await recordDraft({ configured: true, uid: null, testMode: false }, "midseg", draft);
    expect(saveDraftForUser).not.toHaveBeenCalled();
    expect(loadGuestDraft("midseg")?.derived).toEqual(draft.derived);
  });

  it("test mode: never persists (neither cloud nor local)", async () => {
    await recordDraft({ ...cloudEnv, testMode: true }, "midseg", draft);
    expect(saveDraftForUser).not.toHaveBeenCalled();
    expect(localStorage.getItem(GUEST_DRAFTS_KEY)).toBeNull();
  });

  it("guest: re-saving the same puzzle OVERWRITES (one draft per puzzle)", async () => {
    await recordDraft(guestEnv, "midseg", draft);
    const bigger: ProofDraft = {
      version: 1,
      derived: [...draft.derived, { ...draft.derived[0], id: 3 }],
    };
    await recordDraft(guestEnv, "midseg", bigger);
    const summaries = loadGuestDraftSummaries();
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ puzzleId: "midseg", stepCount: 2 });
  });
});

describe("fetchDraft / removeDraft / listDraftIds — routing", () => {
  it("fetchDraft cloud: returns the service result", async () => {
    loadDraftForUser.mockResolvedValueOnce(draft);
    expect(await fetchDraft(cloudEnv, "midseg")).toEqual(draft);
    expect(loadDraftForUser).toHaveBeenCalledWith("user-123", "midseg");
  });

  it("fetchDraft guest: returns from localStorage", async () => {
    await recordDraft(guestEnv, "midseg", draft);
    expect((await fetchDraft(guestEnv, "midseg"))?.derived).toEqual(draft.derived);
  });

  it("fetchDraft test mode: returns null without touching the service", async () => {
    expect(await fetchDraft({ ...cloudEnv, testMode: true }, "midseg")).toBeNull();
    expect(loadDraftForUser).not.toHaveBeenCalled();
  });

  it("removeDraft guest: deletes the localStorage entry", async () => {
    await recordDraft(guestEnv, "midseg", draft);
    await removeDraft(guestEnv, "midseg");
    expect(loadGuestDraft("midseg")).toBeNull();
  });

  it("removeDraft cloud: calls the service", async () => {
    await removeDraft(cloudEnv, "midseg");
    expect(deleteDraftForUser).toHaveBeenCalledWith("user-123", "midseg");
  });

  it("listDraftIds cloud: delegates to the service", async () => {
    listDraftSummariesForUser.mockResolvedValueOnce([
      { puzzleId: "midseg", stepCount: 1, updatedAt: 123 },
    ]);
    expect(await listDraftIds(cloudEnv)).toEqual([
      { puzzleId: "midseg", stepCount: 1, updatedAt: 123 },
    ]);
  });

  it("listDraftIds guest: reads localStorage summaries", async () => {
    await recordDraft(guestEnv, "midseg", draft);
    const ids = await listDraftIds(guestEnv);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toMatchObject({ puzzleId: "midseg", stepCount: 1 });
  });

  it("listDraftIds test mode: returns empty", async () => {
    expect(await listDraftIds({ ...cloudEnv, testMode: true })).toEqual([]);
  });
});
