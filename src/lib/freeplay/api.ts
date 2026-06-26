/**
 * Verification entry point used by the UI.
 *
 * If `VITE_FREEPLAY_API_URL` is set, calls the Python symbolic backend with a
 * Firebase ID token; otherwise runs the local rule-engine verifier.
 */
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { verify, type VerifyInput, type VerifyResult } from "./verify";

const API_URL = import.meta.env.VITE_FREEPLAY_API_URL as string | undefined;

async function idToken(): Promise<string | undefined> {
  if (!isFirebaseConfigured) return undefined;
  try {
    return await auth.currentUser?.getIdToken();
  } catch {
    return undefined;
  }
}

async function remoteVerify(
  input: VerifyInput,
  problemId: string,
): Promise<VerifyResult> {
  const token = await idToken();
  const res = await fetch(`${API_URL}/verify-step`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      problemId,
      establishedFacts: input.establishedFacts,
      candidateFact: input.candidateFact,
      justification: { premises: input.citedPremises },
    }),
  });
  if (!res.ok) throw new Error(`verify-step failed: ${res.status}`);
  return (await res.json()) as VerifyResult;
}

export async function verifyStep(
  input: VerifyInput,
  problemId: string,
): Promise<VerifyResult> {
  if (API_URL) {
    try {
      return await remoteVerify(input, problemId);
    } catch (err) {
      console.warn("[freeplay] backend verify failed, using local engine:", err);
    }
  }
  return verify(input);
}

export type { VerifyInput, VerifyResult };
