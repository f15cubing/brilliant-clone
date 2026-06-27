/**
 * Translator factory + public surface for the NL step-input feature.
 *
 * Default backend is the deterministic local MOCK, so `npm test` and dev never
 * touch OpenAI. The Firebase-backed translator is selected only when explicitly
 * flagged on (`VITE_FREEPLAY_NL_BACKEND === "firebase"`) AND Firebase is
 * configured AND the caller is SIGNED IN — mirroring `api.ts`'s remote/local
 * verify fallback. Guests/anonymous users deterministically get the mock and
 * never construct the callable (the paid OpenAI endpoint is signed-in only; the
 * function itself is the authoritative gate — see `functions/src/index.ts`).
 */
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { FirebaseFunctionTranslator } from "./firebase";
import { LocalMockTranslator } from "./mock";
import type { Translator } from "./types";

/** True only when the firebase NL backend is flagged on AND configured. */
export const isFirebaseNLBackend =
  import.meta.env.VITE_FREEPLAY_NL_BACKEND === "firebase" && isFirebaseConfigured;

/**
 * Pick the translator. Guests (`signedIn !== true`) always get the local mock,
 * so they never issue a callable that the function would just reject with 401.
 */
export function getTranslator(opts?: { signedIn?: boolean }): Translator {
  if (isFirebaseNLBackend && opts?.signedIn === true) {
    return new FirebaseFunctionTranslator();
  }
  return new LocalMockTranslator();
}

export { LocalMockTranslator, TranslateError } from "./mock";
export { FirebaseFunctionTranslator } from "./firebase";
export {
  descriptorToFact,
  matchPremises,
  factToDescriptor,
  groundPremises,
  MapError,
  MAX_COLL,
  type MapErrorCode,
} from "./map";
export type {
  FactDescriptor,
  TranslateRequest,
  TranslationResult,
  Translator,
} from "./types";
