/**
 * Translator factory + public surface for the NL step-input feature.
 *
 * Default backend is the deterministic local MOCK, so `npm test` and dev never
 * touch OpenAI. The Firebase-backed translator is selected only when explicitly
 * flagged on (`VITE_FREEPLAY_NL_BACKEND === "firebase"`) AND Firebase is
 * configured — mirroring `api.ts`'s remote/local verify fallback.
 */
import { isFirebaseConfigured } from "@/lib/firebase/config";
import { FirebaseFunctionTranslator } from "./firebase";
import { LocalMockTranslator } from "./mock";
import type { Translator } from "./types";

export function getTranslator(): Translator {
  const backend = import.meta.env.VITE_FREEPLAY_NL_BACKEND;
  if (backend === "firebase" && isFirebaseConfigured) {
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
