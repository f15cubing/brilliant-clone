import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Construction } from "../types";

// Mock the Firestore service so the cloud path is exercised without firebase.
const saveSketchForUser = vi.fn();
const listSketchesForUser = vi.fn();
const loadSketchForUser = vi.fn();
const deleteSketchForUser = vi.fn();
vi.mock("@/lib/firebase/sketchService", () => ({
  saveSketchForUser: (...a: unknown[]) => saveSketchForUser(...a),
  listSketchesForUser: (...a: unknown[]) => listSketchesForUser(...a),
  loadSketchForUser: (...a: unknown[]) => loadSketchForUser(...a),
  deleteSketchForUser: (...a: unknown[]) => deleteSketchForUser(...a),
}));

import {
  GUEST_SKETCHES_KEY,
  deleteSketch,
  listSketches,
  loadGuestSketches,
  loadSketch,
  saveSketch,
} from "../sketchStore";

const make = (id: string, updatedAt: number): Construction => ({
  id,
  title: id,
  steps: [{ id: "o0", kind: "point", args: [{ x: 0, y: 0 }], label: "A" }],
  createdAt: 0,
  updatedAt,
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
  saveSketchForUser.mockReset().mockResolvedValue(undefined);
  listSketchesForUser.mockReset().mockResolvedValue([]);
  loadSketchForUser.mockReset().mockResolvedValue(null);
  deleteSketchForUser.mockReset().mockResolvedValue(undefined);
  installLocalStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sketchStore — cloud routing (configured && uid)", () => {
  const env = { configured: true, uid: "u1" };

  it("save routes to the service with the owner uid stamped", async () => {
    await saveSketch(env, make("s1", 100));
    expect(saveSketchForUser).toHaveBeenCalledWith("u1", expect.objectContaining({ id: "s1", ownerUid: "u1" }));
  });

  it("list/load/delete route to the service", async () => {
    await listSketches(env);
    expect(listSketchesForUser).toHaveBeenCalledWith("u1");
    await loadSketch(env, "s1");
    expect(loadSketchForUser).toHaveBeenCalledWith("u1", "s1");
    await deleteSketch(env, "s1");
    expect(deleteSketchForUser).toHaveBeenCalledWith("u1", "s1");
  });
});

describe("sketchStore — guest routing (localStorage)", () => {
  const env = { configured: false, uid: null };

  it("save upserts by id and never touches the service", async () => {
    await saveSketch(env, make("s1", 100));
    await saveSketch(env, make("s2", 200));
    await saveSketch(env, { ...make("s1", 300), title: "edited" }); // update s1
    expect(saveSketchForUser).not.toHaveBeenCalled();

    const all = loadGuestSketches();
    expect(all).toHaveLength(2);
    expect(all.find((s) => s.id === "s1")?.title).toBe("edited");
  });

  it("list returns guest sketches sorted newest-edited first", async () => {
    await saveSketch(env, make("old", 100));
    await saveSketch(env, make("new", 500));
    const list = await listSketches(env);
    expect(list.map((s) => s.id)).toEqual(["new", "old"]);
  });

  it("load finds by id; delete removes it", async () => {
    await saveSketch(env, make("s1", 100));
    expect((await loadSketch(env, "s1"))?.id).toBe("s1");
    await deleteSketch(env, "s1");
    expect(await loadSketch(env, "s1")).toBeNull();
  });

  it("configured-but-logged-out also uses guest storage", async () => {
    await saveSketch({ configured: true, uid: null }, make("s1", 100));
    expect(saveSketchForUser).not.toHaveBeenCalled();
    expect(loadGuestSketches()).toHaveLength(1);
  });

  it("loadGuestSketches degrades to [] on malformed storage", () => {
    localStorage.setItem(GUEST_SKETCHES_KEY, "{not json");
    expect(loadGuestSketches()).toEqual([]);
  });
});
