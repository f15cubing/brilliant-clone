/**
 * Persistence routing for saved sketches (mirrors `freeplay/proofArchive`):
 *   - signed-in (`configured && uid`) -> Firestore via `sketchService`;
 *   - everyone else (guest / Firebase off) -> a `localStorage` array.
 *
 * The pure routing is easy to unit-test (mock the service, stub localStorage);
 * the page wires `env` from `useAuth()`.
 */
import {
  deleteSketchForUser,
  listSketchesForUser,
  loadSketchForUser,
  saveSketchForUser,
} from "@/lib/firebase/sketchService";
import type { Construction } from "./types";

/** localStorage key holding the guest sketch list (an array of constructions). */
export const GUEST_SKETCHES_KEY = "geo-sketches-guest";

export interface SketchEnv {
  configured: boolean;
  uid: string | null;
}

const isCloud = (env: SketchEnv): env is { configured: true; uid: string } =>
  env.configured && env.uid != null;

/** Read the guest sketch array (parse errors / absence degrade to `[]`). */
export function loadGuestSketches(): Construction[] {
  try {
    const raw = localStorage.getItem(GUEST_SKETCHES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Construction[]) : [];
  } catch {
    return [];
  }
}

function writeGuestSketches(list: Construction[]): void {
  localStorage.setItem(GUEST_SKETCHES_KEY, JSON.stringify(list));
}

/** All of the env's sketches, newest-edited first. */
export async function listSketches(env: SketchEnv): Promise<Construction[]> {
  if (isCloud(env)) return listSketchesForUser(env.uid);
  return loadGuestSketches().sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Create or update a sketch (upsert by id). */
export async function saveSketch(env: SketchEnv, c: Construction): Promise<void> {
  if (isCloud(env)) {
    await saveSketchForUser(env.uid, { ...c, ownerUid: env.uid });
    return;
  }
  const list = loadGuestSketches().filter((s) => s.id !== c.id);
  list.push(c);
  writeGuestSketches(list);
}

/** Load one sketch by id (or null). */
export async function loadSketch(env: SketchEnv, id: string): Promise<Construction | null> {
  if (isCloud(env)) return loadSketchForUser(env.uid, id);
  return loadGuestSketches().find((s) => s.id === id) ?? null;
}

/** Delete one sketch by id. */
export async function deleteSketch(env: SketchEnv, id: string): Promise<void> {
  if (isCloud(env)) {
    await deleteSketchForUser(env.uid, id);
    return;
  }
  writeGuestSketches(loadGuestSketches().filter((s) => s.id !== id));
}
