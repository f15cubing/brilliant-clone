/**
 * `translateStep` — the only Cloud Function for the Freeplay NL feature.
 *
 * Security posture (defense in depth; the AI is untrusted and `verify()` on the
 * client is the sole source of truth):
 *   1. enforceAppCheck → only genuine app instances reach the function.
 *   2. require request.auth → signed-in users only (guests use the local mock).
 *   3. validate() → caps text/points/arrays, rejects malformed input early.
 *   4. per-uid Firestore rate-limit (Admin SDK; client access denied by rules).
 *   5. OpenAI structured-output call constrained by a per-request JSON schema.
 *   6. re-validate the model's output shape before returning.
 * The OpenAI key is a server secret (`firebase functions:secrets:set
 * OPENAI_API_KEY`) and never ships to the client.
 */
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import OpenAI from "openai";
import {
  DEFAULT_OPENAI_MODEL,
  translateWithLLM,
  type LLMClient,
  type LLMRequest,
} from "./openai";
import {
  DEFAULT_RATE_LIMIT,
  evaluateRateLimit,
  type RateLimitState,
} from "./ratelimit";
import { ValidationError, validateRequest } from "./validate";

initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const REGION = process.env.FUNCTIONS_REGION || "us-central1";

function makeClient(apiKey: string): LLMClient {
  const openai = new OpenAI({ apiKey });
  return {
    async createStructured(req: LLMRequest): Promise<string> {
      const completion = await openai.chat.completions.create({
        model: req.model,
        messages: req.messages,
        response_format: {
          type: "json_schema",
          json_schema: { name: req.schemaName, schema: req.schema, strict: true },
        },
      });
      return completion.choices[0]?.message?.content ?? "";
    },
  };
}

async function enforceRateLimit(uid: string): Promise<void> {
  const db = getFirestore();
  const ref = db.collection("ratelimits").doc(uid);
  const denied = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prev = (snap.exists ? (snap.data() as RateLimitState) : null) ?? null;
    const decision = evaluateRateLimit(prev, Date.now(), DEFAULT_RATE_LIMIT);
    if (!decision.allowed) return decision;
    tx.set(ref, decision.state);
    return null;
  });
  if (denied) {
    throw new HttpsError(
      "resource-exhausted",
      `Rate limit reached (${denied.reason}). Try again in ${denied.retryAfterSec ?? 60}s.`,
    );
  }
}

export const translateStep = onCall(
  {
    region: REGION,
    enforceAppCheck: true,
    secrets: [OPENAI_API_KEY],
    maxInstances: 5,
    timeoutSeconds: 30,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in to use natural-language steps.");
    }
    // enforceAppCheck rejects missing tokens at the platform level; this is a
    // belt-and-suspenders guard for misconfiguration.
    if (!request.app) {
      throw new HttpsError("failed-precondition", "App Check verification is required.");
    }

    let req;
    try {
      req = validateRequest(request.data);
    } catch (err) {
      if (err instanceof ValidationError) {
        throw new HttpsError("invalid-argument", err.message);
      }
      throw new HttpsError("invalid-argument", "Malformed request.");
    }

    await enforceRateLimit(request.auth.uid);

    try {
      const client = makeClient(OPENAI_API_KEY.value());
      const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;
      return await translateWithLLM(client, req, model);
    } catch (err) {
      console.error("[translateStep] OpenAI/translation error:", err);
      throw new HttpsError("internal", "The translator failed. Try again or use the builder.");
    }
  },
);
