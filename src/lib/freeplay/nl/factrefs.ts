/**
 * Resolve "by fact N" citations inside a learner's natural-language step.
 *
 * The "Established facts" panel numbers facts by 1-based position, so `fact 3`
 * means the 3rd established fact (`facts[2]`). This pure helper extracts those
 * numeric citations from free text — so the caller can add the referenced facts
 * as cited premises — and returns the text with the citation phrases removed
 * (what's left is the actual geometric claim to translate).
 *
 * Recognized forms (case-insensitive):
 *   - `fact 3`, `facts 3`
 *   - `by fact 3`
 *   - `fact #3`, `facts #3`
 *   - lists: `facts 3, 5 and 7`, `fact 3 and 4`, `facts 3, 5, and 7`
 *   - bare `#3`
 *
 * CONTRACT — bare numbers are NOT references. A position is only recognized when
 * introduced by a `fact`/`facts` keyword or a `#`. This is deliberate: a claim
 * routinely contains numbers (`= 90`, `180 - x`, `A/2`) and those must never be
 * mistaken for fact citations.
 */

// A citation is either a `fact`/`facts` keyword (optionally led by `by`) followed
// by a number list, or a bare `#N`. Numbers inside the keyword form may carry an
// optional `#`, and list separators are `,`, `and`, or `, and`. The `\b...\b`
// boundaries keep words like "artifact"/"factor" from matching, and requiring a
// trailing `\d+` keeps prose ("the key fact is") from matching.
const FACT_REF =
  /(?:\bby\s+)?\bfacts?\b\s*#?\s*\d+(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+)#?\s*\d+)*|#\s*\d+/gi;

// Connector words / punctuation that become meaningless once the citation they
// introduced is stripped, but only when they end up dangling at the very end.
const TRAILING_CONNECTORS = /(?:[\s,]+|\b(?:by|and|since|because|so)\b)+$/i;

/**
 * @param text       the learner's raw input.
 * @param factCount  how many established facts exist; the valid range is 1..factCount.
 * @returns
 *   - `numbers`: sorted, unique, in-range (1..factCount) referenced positions.
 *   - `outOfRange`: sorted, unique referenced positions that are < 1 or > factCount.
 *   - `cleanedText`: `text` with the citation phrases removed, runs of whitespace
 *     collapsed to single spaces, and any dangling trailing connector
 *     words/punctuation (`by`, `and`, `since`, `because`, `so`, commas) trimmed
 *     off the end.
 */
export function resolveFactRefs(
  text: string,
  factCount: number,
): { numbers: number[]; cleanedText: string; outOfRange: number[] } {
  const referenced: number[] = [];
  for (const match of text.matchAll(FACT_REF)) {
    const digits = match[0].match(/\d+/g);
    if (!digits) continue;
    for (const d of digits) referenced.push(Number.parseInt(d, 10));
  }

  const inRange = new Set<number>();
  const out = new Set<number>();
  for (const n of referenced) {
    if (n >= 1 && n <= factCount) inRange.add(n);
    else out.add(n);
  }

  const ascending = (a: number, b: number) => a - b;
  const cleanedText = text
    .replace(FACT_REF, " ")
    .replace(/\s+/g, " ")
    .replace(TRAILING_CONNECTORS, "")
    .trim();

  return {
    numbers: [...inRange].sort(ascending),
    cleanedText,
    outOfRange: [...out].sort(ascending),
  };
}
