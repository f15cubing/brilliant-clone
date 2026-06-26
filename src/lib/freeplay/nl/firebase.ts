/**
 * Production translator: calls the `translateStep` Firebase Cloud Function
 * (which holds the OpenAI key server-side, gated by Auth + App Check). The
 * client bundle gains NO OpenAI dependency or key.
 *
 * `HttpsError` codes from the function are mapped to friendly client copy.
 */
import { httpsCallable, type FunctionsError } from "firebase/functions";
import { functions } from "@/lib/firebase/config";
import type { TranslateRequest, TranslationResult, Translator } from "./types";

function friendlyMessage(err: unknown): string {
  const code = (err as Partial<FunctionsError>)?.code ?? "";
  switch (code) {
    case "functions/unauthenticated":
      return "Please sign in to use natural-language steps.";
    case "functions/failed-precondition":
      return "App verification failed. Reload the page and try again.";
    case "functions/invalid-argument":
      return "That request couldn't be processed — try rephrasing, or use the builder.";
    case "functions/resource-exhausted":
      return "You've hit the translation rate limit. Wait a minute and try again.";
    case "functions/internal":
      return "The translator had a problem. Try again, or use the structured builder.";
    default:
      return "Couldn't reach the translator. Check your connection or use the builder.";
  }
}

export class FirebaseFunctionTranslator implements Translator {
  readonly id = "firebase" as const;

  async translate(req: TranslateRequest): Promise<TranslationResult> {
    if (!functions) {
      throw new Error("The translation service isn't available right now.");
    }
    const callable = httpsCallable<TranslateRequest, TranslationResult>(
      functions,
      "translateStep",
    );
    try {
      const res = await callable(req);
      return res.data;
    } catch (err) {
      throw new Error(friendlyMessage(err), { cause: err });
    }
  }
}
