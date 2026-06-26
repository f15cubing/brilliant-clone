/**
 * Self-contained contract types for the Cloud Function. Deliberately NOT imported
 * from the web app (`src/`) so the function package stays standalone. These must
 * stay structurally compatible with the client's `nl/types.ts`.
 */
export type RelName =
  | "coll"
  | "para"
  | "perp"
  | "cong"
  | "cyclic"
  | "midp"
  | "eqangle";

export const REL_NAMES: RelName[] = [
  "coll",
  "para",
  "perp",
  "cong",
  "cyclic",
  "midp",
  "eqangle",
];

export type FactDescriptor =
  | { kind: "rel"; name: RelName; points: string[] }
  | { kind: "aval"; angle: [string, string, string]; expr: string }
  // A length PROPORTION AB/CD = EF/GH over EXACTLY 8 ordered point labels
  // [A,B,C,D,E,F,G,H]. Mirrors the client's `nl/types.ts` variant — keep in sync.
  | {
      kind: "eqratio";
      points: [string, string, string, string, string, string, string, string];
    };

export interface TranslationResult {
  premises: FactDescriptor[];
  conclusion: FactDescriptor;
  ruleHint?: string;
  notes?: string;
}

export interface TranslateRequest {
  text: string;
  puzzleId: string;
  points: string[];
  variables: string[];
  established: FactDescriptor[];
}
