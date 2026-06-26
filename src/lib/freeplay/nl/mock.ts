/**
 * Deterministic, dependency-free, NO-NETWORK local translator.
 *
 * This is the DEFAULT backend in dev/guest and whenever the Firebase NL backend
 * isn't configured (mirroring `api.ts`'s local-`verify` fallback). It uses a
 * small keyword grammar — narrow but demo-complete — and emits the same
 * `FactDescriptor` contract as the Firebase translator, so the entire
 * translate → map → verify pipeline works offline and anchors the unit tests.
 *
 * The grammar (see spec §5):
 *   - clause connectors split conclusion from premises:
 *       "<concl> since|because|as <prem(s)>"  or  "<prem(s)> so|therefore|hence <concl>"
 *   - premises are split on " and " / ";".
 *   - per-clause keyword → relation:
 *       concyclic/cyclic/circle → cyclic     parallel/∥ → para
 *       perpendicular/⊥         → perp       midpoint    → midp
 *       collinear/on a line     → coll       "angle ABC = angle DEF" → eqangle
 *       "angle ABC = <expr>"    → aval       "AB = CD"   → cong
 *
 * Crucially, only point tokens that appear in the figure are ever emitted, and
 * arity/expr are still re-checked by the (untrusted-input) mapper + verify().
 */
import type { FactDescriptor, TranslateRequest, TranslationResult, Translator } from "./types";

/** Connectors after which the *premises* follow (conclusion precedes). */
const PREMISE_LEADS = ["because", "since", "as"];
/** Connectors after which the *conclusion* follows (premises precede). */
const CONCLUSION_LEADS = ["therefore", "hence", "thus", "so"];

interface SplitResult {
  conclusion: string;
  premises: string[];
}

function splitClauses(text: string): SplitResult {
  let best: { index: number; word: string; lead: "premise" | "conclusion" } | null = null;
  const consider = (word: string, lead: "premise" | "conclusion") => {
    const m = new RegExp(`\\b${word}\\b`, "i").exec(text);
    if (m && (best === null || m.index < best.index)) {
      best = { index: m.index, word, lead };
    }
  };
  for (const w of PREMISE_LEADS) consider(w, "premise");
  for (const w of CONCLUSION_LEADS) consider(w, "conclusion");

  if (best === null) return { conclusion: text.trim(), premises: [] };
  // (TS can't narrow the closure assignment above.)
  const hit = best as { index: number; word: string; lead: "premise" | "conclusion" };
  const left = text.slice(0, hit.index).trim();
  const right = text.slice(hit.index + hit.word.length).trim();
  return hit.lead === "premise"
    ? { conclusion: left, premises: splitPremises(right) }
    : { conclusion: right, premises: splitPremises(left) };
}

function splitPremises(s: string): string[] {
  return s
    .split(/\band\b|;/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Decompose a single whitespace/punctuation-free word into figure points. */
function wordToPoints(word: string, sorted: string[]): string[] | null {
  const out: string[] = [];
  let i = 0;
  while (i < word.length) {
    let matched: string | null = null;
    for (const p of sorted) {
      if (word.startsWith(p, i)) {
        matched = p;
        break;
      }
    }
    if (matched === null) return null;
    out.push(matched);
    i += matched.length;
  }
  return out.length > 0 ? out : null;
}

/** Ordered figure points appearing in `s` (lowercase words / keywords ignored). */
function extractPoints(s: string, sorted: string[]): string[] {
  const out: string[] = [];
  for (const word of s.split(/[^A-Za-z0-9]+/)) {
    if (word.length === 0) continue;
    const pts = wordToPoints(word, sorted);
    if (pts) out.push(...pts);
  }
  return out;
}

function parseAngleClause(clause: string, sorted: string[]): FactDescriptor | null {
  const parts = clause.split(/=|equals|equal to|is equal to/i);
  if (parts.length < 2) return null;
  const lhs = parts[0];
  const rhs = parts.slice(1).join("=").trim();
  const lhsPts = extractPoints(lhs, sorted);
  if (lhsPts.length < 3) return null;
  const angle: [string, string, string] = [lhsPts[0], lhsPts[1], lhsPts[2]];

  const hasArith = /[-+*/()]/.test(rhs) || /\d/.test(rhs);
  const rhsPts = extractPoints(rhs, sorted);
  if (!hasArith && rhsPts.length === 3) {
    return {
      kind: "rel",
      name: "eqangle",
      points: [angle[0], angle[1], angle[2], rhsPts[0], rhsPts[1], rhsPts[2]],
    };
  }
  const expr = rhs.replace(/degrees?|°/gi, "").trim();
  return { kind: "aval", angle, expr };
}

function parseClause(clause: string, points: string[]): FactDescriptor | null {
  const sorted = [...points].sort((a, b) => b.length - a.length);
  const lower = clause.toLowerCase();

  if (lower.includes("angle") || clause.includes("∠")) {
    return parseAngleClause(clause, sorted);
  }
  if (lower.includes("midpoint")) {
    const pts = extractPoints(clause, sorted);
    return pts.length >= 3 ? { kind: "rel", name: "midp", points: pts.slice(0, 3) } : null;
  }
  if (lower.includes("parallel") || clause.includes("∥") || clause.includes("||")) {
    const pts = extractPoints(clause, sorted);
    return pts.length >= 4 ? { kind: "rel", name: "para", points: pts.slice(0, 4) } : null;
  }
  if (
    lower.includes("perpendicular") ||
    clause.includes("⊥") ||
    lower.includes("right angle")
  ) {
    const pts = extractPoints(clause, sorted);
    return pts.length >= 4 ? { kind: "rel", name: "perp", points: pts.slice(0, 4) } : null;
  }
  if (
    lower.includes("concyclic") ||
    lower.includes("cyclic") ||
    lower.includes("circle")
  ) {
    const pts = extractPoints(clause, sorted);
    return pts.length >= 4 ? { kind: "rel", name: "cyclic", points: pts.slice(0, 4) } : null;
  }
  if (
    lower.includes("collinear") ||
    lower.includes("on a line") ||
    lower.includes("on the line") ||
    lower.includes("on one line")
  ) {
    const pts = extractPoints(clause, sorted);
    return pts.length >= 3 ? { kind: "rel", name: "coll", points: pts } : null;
  }
  if (clause.includes("=") || lower.includes("congruent") || lower.includes("equal")) {
    const pts = extractPoints(clause, sorted);
    return pts.length >= 4 ? { kind: "rel", name: "cong", points: pts.slice(0, 4) } : null;
  }
  return null;
}

export class TranslateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslateError";
  }
}

export class LocalMockTranslator implements Translator {
  readonly id = "mock" as const;

  async translate(req: TranslateRequest): Promise<TranslationResult> {
    const { conclusion, premises } = splitClauses(req.text);
    const concl = parseClause(conclusion, req.points);
    if (!concl) {
      throw new TranslateError(
        "Couldn't understand that statement. Try naming the relation and its points, e.g. \"angle APB = angle AQB since A, B, P, Q are concyclic\".",
      );
    }
    const premiseDescriptors = premises
      .map((p) => parseClause(p, req.points))
      .filter((p): p is FactDescriptor => p !== null);

    return {
      conclusion: concl,
      premises: premiseDescriptors,
      ruleHint: undefined,
      notes: premiseDescriptors.length < premises.length
        ? "Some premise clauses couldn't be parsed and were dropped."
        : undefined,
    };
  }
}
