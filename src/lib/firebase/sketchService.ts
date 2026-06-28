/**
 * Per-user storage of saved sketches (the interactive construction sandbox).
 *
 * Firestore layout (owner-only; see firestore.rules):
 *   users/{uid}/sketches/{sketchId} -> { title, createdAt, updatedAt, stepsJson, … }
 *
 * Unlike the append-only proof history, a sketch has a STABLE id and is
 * overwritten in place on save (`setDoc`), so editing updates one document.
 *
 * The construction's `steps` are stored as a JSON STRING (`stepsJson`) rather
 * than a native array. Steps are never queried server-side, and a JSON blob
 * sidesteps Firestore's nested-array constraints and any schema drift in the
 * step shape. `loadSketchForUser` parses + validates it back into `steps`.
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { validateSteps } from "@/lib/sketch/serialize";
import type { Construction } from "@/lib/sketch/types";

/** The Firestore document shape for a sketch (id is the doc key, not a field). */
interface SketchDoc {
  title: string;
  createdAt: number;
  updatedAt: number;
  stepsJson: string;
  boundingBox?: [number, number, number, number];
  ownerUid: string;
}

function toDoc(uid: string, c: Construction): SketchDoc {
  const d: SketchDoc = {
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    stepsJson: JSON.stringify(c.steps),
    ownerUid: uid,
  };
  if (c.boundingBox) d.boundingBox = c.boundingBox;
  return d;
}

function fromDoc(id: string, data: DocumentData): Construction {
  return {
    id,
    title: typeof data.title === "string" ? data.title : "Untitled sketch",
    steps: validateSteps(JSON.parse((data.stepsJson as string) ?? "[]")),
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
    updatedAt: typeof data.updatedAt === "number" ? data.updatedAt : 0,
    boundingBox: data.boundingBox,
    ownerUid: data.ownerUid,
  };
}

/** Create or overwrite the sketch document (stable id ⇒ edits update in place). */
export async function saveSketchForUser(uid: string, c: Construction): Promise<void> {
  await setDoc(doc(db, "users", uid, "sketches", c.id), toDoc(uid, c));
}

/** A user's sketches, newest-edited first. */
export async function listSketchesForUser(uid: string): Promise<Construction[]> {
  const snap = await getDocs(
    query(collection(db, "users", uid, "sketches"), orderBy("updatedAt", "desc")),
  );
  return snap.docs.map((d) => fromDoc(d.id, d.data()));
}

/** Load one sketch by id, or null if it does not exist. */
export async function loadSketchForUser(uid: string, id: string): Promise<Construction | null> {
  const snap = await getDoc(doc(db, "users", uid, "sketches", id));
  return snap.exists() ? fromDoc(snap.id, snap.data()) : null;
}

/** Delete one sketch by id. */
export async function deleteSketchForUser(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "sketches", id));
}
