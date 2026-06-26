import { useMemo, useState } from "react";
import { MathText } from "@/components/MathText";
import {
  aval,
  canonicalKey,
  factLabel,
  rel,
  RELS,
  type Fact,
  type RelName,
} from "@/lib/freeplay/dsl";
import { fstr, parseForm } from "@/lib/freeplay/form";
import type { FactEntry } from "@/lib/freeplay/proof";
import {
  descriptorToFact,
  factToDescriptor,
  getTranslator,
  MapError,
  matchPremises,
  type TranslationResult,
} from "@/lib/freeplay/nl";
import {
  applySubst,
  parseSwaps,
  symmetryProblem,
  type Subst,
} from "@/lib/freeplay/symmetry";

type Kind = RelName | "aval";
type Mode = "derive" | "analogy";
type InputMode = "structured" | "nl";

/**
 * Optional single auto-repair round on a verify() rejection (spec §10 #3,
 * default OFF until measured). When off, "Retry" simply re-translates the same
 * text. The NL path NEVER auto-accepts: a human must click "Use".
 */
const NL_AUTO_REPAIR = false;

interface StepBuilderProps {
  pointIds: string[];
  facts: FactEntry[];
  givens: Fact[];
  busy: boolean;
  disabled: boolean;
  onAssert: (fact: Fact, premises: Fact[], opts?: { subst?: Subst }) => void;
  /** Puzzle id + variable names are passed to the NL translator for context. */
  puzzleId: string;
  variableNames?: string[];
}

const KINDS: { id: Kind; label: string; slots: string[] }[] = [
  { id: "aval", label: "Angle value  ∠ABC = …", slots: ["P", "V", "Q"] },
  ...(Object.keys(RELS) as RelName[]).map((n) => ({
    id: n,
    label: RELS[n].label,
    slots: RELS[n].slots,
  })),
];

const MAX_COLL = 8;

function tryBuild(kind: Kind, slots: string[], expr: string): Fact | null {
  if (kind === "aval") {
    if (slots.length !== 3) return null;
    try {
      return aval([slots[0], slots[1], slots[2]], parseForm(expr));
    } catch {
      return null;
    }
  }
  if (RELS[kind].variadic) {
    if (slots.length < 3) return null;
    return rel(kind, slots);
  }
  if (slots.length !== RELS[kind].arity) return null;
  return rel(kind, slots);
}

/** A lowered NL interpretation, ready to show and (on Use) to assert. */
interface Interpretation {
  conclusion: Fact;
  premises: Fact[];
  notes?: string;
}

/**
 * Lets the learner build a new fact (relation or angle value) and cite the
 * established facts it relies on. The rule name is NOT requested — the engine
 * reports it on acceptance. A parallel "NL" mode lets the learner type the step
 * in words; it is translated, shown back, and routed through the SAME onAssert.
 */
export function StepBuilder({
  pointIds,
  facts,
  givens,
  busy,
  disabled,
  onAssert,
  puzzleId,
  variableNames = [],
}: StepBuilderProps) {
  const [inputMode, setInputMode] = useState<InputMode>("structured");
  const [mode, setMode] = useState<Mode>("derive");
  const [kind, setKind] = useState<Kind>("aval");
  const [slots, setSlots] = useState<string[]>([]);
  const [expr, setExpr] = useState("");
  const [cited, setCited] = useState<Set<number>>(new Set());

  // --- analogy ("by symmetry") state ---
  const [mirrorId, setMirrorId] = useState<number | null>(null);
  const [swaps, setSwaps] = useState("");

  const subst = useMemo<Subst | null>(
    () => parseSwaps(swaps, new Set(pointIds)),
    [swaps, pointIds],
  );
  const mirrorFact = facts.find((f) => f.id === mirrorId) ?? null;
  const analogyPreview = useMemo<Fact | null>(() => {
    if (!mirrorFact || !subst) return null;
    return applySubst(mirrorFact.fact, subst);
  }, [mirrorFact, subst]);
  const swapsError = swaps.trim().length > 0 && !subst;
  const symIssue = useMemo(
    () => (subst ? symmetryProblem(subst, givens, pointIds) : null),
    [subst, givens, pointIds],
  );
  const canAnalogize =
    !busy &&
    !disabled &&
    analogyPreview !== null &&
    subst !== null &&
    symIssue === null;

  const submitAnalogy = () => {
    if (!analogyPreview || !subst || !mirrorFact) return;
    onAssert(analogyPreview, [mirrorFact.fact], { subst });
    setMirrorId(null);
    setSwaps("");
  };

  const meta = KINDS.find((k) => k.id === kind)!;
  const variadic = kind !== "aval" && !!RELS[kind as RelName]?.variadic;
  const maxArity = variadic ? MAX_COLL : meta.slots.length;
  // For variadic kinds always show one spare empty slot (min 3, capped).
  const slotHints = variadic
    ? Array.from(
        { length: Math.min(maxArity, Math.max(3, slots.length + 1)) },
        (_, i) => meta.slots[i] ?? "pt",
      )
    : meta.slots;

  const preview = useMemo(
    () => tryBuild(kind, slots, expr),
    [kind, slots, expr],
  );
  const exprError =
    kind === "aval" && expr.trim().length > 0 && slots.length === 3 && !preview;

  const reset = () => {
    setSlots([]);
    setExpr("");
    setCited(new Set());
  };

  const changeKind = (next: Kind) => {
    setKind(next);
    setSlots([]);
  };

  const pushPoint = (id: string) => {
    if (slots.length >= maxArity) return;
    setSlots([...slots, id]);
  };
  const popSlot = (index: number) => setSlots(slots.filter((_, i) => i !== index));

  const toggleCited = (factId: number) => {
    const next = new Set(cited);
    if (next.has(factId)) next.delete(factId);
    else next.add(factId);
    setCited(next);
  };

  const canAssert = !busy && !disabled && preview !== null && cited.size > 0;

  const submit = () => {
    if (!preview) return;
    const premises = facts.filter((f) => cited.has(f.id)).map((f) => f.fact);
    onAssert(preview, premises);
    reset();
  };

  /** Pre-fill the structured builder from an NL interpretation (spec §10 #7). */
  const prefillFromInterpretation = (interp: Interpretation) => {
    const c = interp.conclusion;
    if (c.kind === "aval") {
      setKind("aval");
      setSlots([c.angle[0], c.angle[1], c.angle[2]]);
      setExpr(fstr(c.form));
    } else {
      setKind(c.name);
      setSlots([...c.points]);
      setExpr("");
    }
    const wanted = new Set(interp.premises.map(canonicalKey));
    setCited(new Set(facts.filter((f) => wanted.has(canonicalKey(f.fact))).map((f) => f.id)));
    setMode("derive");
    setInputMode("structured");
  };

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-rule p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">
          Assert a new fact
        </h2>
        <div className="flex rounded-sm border border-rule text-[0.6rem]">
          {(["structured", "nl"] as InputMode[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => setInputMode(m)}
              className={[
                "px-2 py-1 font-mono uppercase tracking-wide transition",
                inputMode === m
                  ? "bg-ultramarine text-paper"
                  : "text-ink-soft hover:text-ink",
              ].join(" ")}
            >
              {m === "structured" ? "Structured" : "In words"}
            </button>
          ))}
        </div>
      </div>

      {inputMode === "nl" ? (
        <NLPanel
          pointIds={pointIds}
          facts={facts}
          puzzleId={puzzleId}
          variableNames={variableNames}
          busy={busy}
          disabled={disabled}
          onAssert={onAssert}
          onEdit={prefillFromInterpretation}
        />
      ) : (
        <>
          <div className="flex items-center justify-end">
            <div className="flex rounded-sm border border-rule text-[0.6rem]">
              {(["derive", "analogy"] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => setMode(m)}
                  className={[
                    "px-2 py-1 font-mono uppercase tracking-wide transition",
                    mode === m
                      ? "bg-ultramarine text-paper"
                      : "text-ink-soft hover:text-ink",
                  ].join(" ")}
                >
                  {m === "derive" ? "Derive" : "By symmetry"}
                </button>
              ))}
            </div>
          </div>

          {mode === "derive" && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                  Claim
                </span>
                <select
                  value={kind}
                  disabled={disabled}
                  onChange={(e) => changeKind(e.target.value as Kind)}
                  className="rounded-sm border border-rule bg-paper px-2 py-1.5 font-serif text-ink"
                >
                  {KINDS.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                  {kind === "aval" ? "Angle points (V is the vertex)" : "Points"}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {slotHints.map((hint, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => slots[i] !== undefined && popSlot(i)}
                      className={[
                        "h-9 w-9 rounded-sm border font-mono text-sm transition",
                        slots[i] !== undefined
                          ? "border-ultramarine bg-ultramarine/10 text-ultramarine"
                          : "border-dashed border-rule text-ink-faint",
                      ].join(" ")}
                      title={slots[i] !== undefined ? "Click to clear" : hint}
                    >
                      {slots[i] ?? hint.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {pointIds.map((id) => (
                  <button
                    key={id}
                    type="button"
                    disabled={disabled || slots.length >= maxArity}
                    onClick={() => pushPoint(id)}
                    className="h-8 min-w-8 rounded-full border border-rule px-2 font-mono text-sm text-ink transition hover:border-ultramarine hover:text-ultramarine disabled:opacity-40"
                  >
                    {id}
                  </button>
                ))}
              </div>

              {kind === "aval" && (
                <label className="flex flex-col gap-1.5">
                  <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                    equals (degrees)
                  </span>
                  <input
                    value={expr}
                    disabled={disabled}
                    onChange={(e) => setExpr(e.target.value)}
                    placeholder="e.g. 180 - angle(B,I,A)   or   A/2 + B/2"
                    className="rounded-sm border border-rule bg-paper px-2 py-1.5 font-mono text-ink"
                  />
                  <span className="font-mono text-[0.58rem] leading-relaxed text-ink-faint">
                    Reference another angle as <code>angle(A,B,C)</code> (vertex B). Mix with
                    numbers and variables, e.g. <code>180 - angle(B,I,A)</code>.
                  </span>
                  {exprError && (
                    <span className="font-mono text-[0.62rem] text-vermilion">
                      Couldn't parse that expression.
                    </span>
                  )}
                </label>
              )}

              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                  Because we already have…
                </span>
                <div className="flex flex-col gap-1">
                  {facts.map((f, idx) => (
                    <label
                      key={f.id}
                      className="flex cursor-pointer items-start gap-2 rounded-sm px-1.5 py-1 hover:bg-panel-soft"
                    >
                      <input
                        type="checkbox"
                        checked={cited.has(f.id)}
                        disabled={disabled}
                        onChange={() => toggleCited(f.id)}
                        className="mt-1"
                      />
                      <span className="font-serif text-sm text-ink-soft">
                        <span className="font-mono text-xs text-ink-faint">{idx + 1}. </span>
                        <MathText>{factLabel(f.fact)}</MathText>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {preview && (
                <p className="font-serif text-sm text-ink-soft">
                  Asserting: <MathText>{factLabel(preview)}</MathText>
                </p>
              )}
              <button
                type="button"
                onClick={submit}
                disabled={!canAssert}
                className="rounded-sm bg-ultramarine px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper transition hover:bg-ultramarine/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Checking…" : "Assert step"}
              </button>
            </>
          )}

          {mode === "analogy" && (
            <>
              <p className="font-serif text-sm text-ink-soft">
                Re-use a finished argument with the letters switched. Pick a proven
                fact and a relabeling of the points; if those swaps map the puzzle's
                givens onto themselves, the mirrored fact follows by symmetry.
              </p>

              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                  Mirror this fact
                </span>
                <div className="flex flex-col gap-1">
                  {facts.map((f, idx) => (
                    <label
                      key={f.id}
                      className="flex cursor-pointer items-start gap-2 rounded-sm px-1.5 py-1 hover:bg-panel-soft"
                    >
                      <input
                        type="radio"
                        name="mirror"
                        checked={mirrorId === f.id}
                        disabled={disabled}
                        onChange={() => setMirrorId(f.id)}
                        className="mt-1"
                      />
                      <span className="font-serif text-sm text-ink-soft">
                        <span className="font-mono text-xs text-ink-faint">
                          {idx + 1}.{" "}
                        </span>
                        <MathText>{factLabel(f.fact)}</MathText>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
                  Swap points
                </span>
                <input
                  value={swaps}
                  disabled={disabled}
                  onChange={(e) => setSwaps(e.target.value)}
                  placeholder="e.g. A-B, P-Q, A1-B1, P1-Q1, A2-B2"
                  className="rounded-sm border border-rule bg-paper px-2 py-1.5 font-mono text-ink"
                />
                <span className="font-mono text-[0.58rem] leading-relaxed text-ink-faint">
                  Comma-separated pairs to swap; any point not listed stays fixed.
                </span>
                {swapsError && (
                  <span className="font-mono text-[0.62rem] text-vermilion">
                    Couldn't read those swaps (use known points, disjoint pairs).
                  </span>
                )}
              </label>

              {subst && symIssue === null && (
                <p className="font-mono text-[0.62rem] text-correct">
                  ✓ These swaps map the givens onto themselves — the analogy is valid.
                </p>
              )}
              {subst && symIssue?.kind === "breaks" && (
                <p className="font-serif text-[0.7rem] leading-relaxed text-ochre-deep">
                  ✗ This isn't a symmetry: the given{" "}
                  <MathText>{factLabel(symIssue.given)}</MathText> has no matching
                  given after the swap. Make sure every point built from a swapped
                  one is swapped too (and shared points stay fixed).
                </p>
              )}
              {subst && symIssue?.kind === "not_bijection" && (
                <p className="font-mono text-[0.62rem] text-ochre-deep">
                  ✗ Those swaps aren't a valid relabeling of the points.
                </p>
              )}

              {analogyPreview && (
                <p className="font-serif text-sm text-ink-soft">
                  Asserting: <MathText>{factLabel(analogyPreview)}</MathText>
                </p>
              )}
              <button
                type="button"
                onClick={submitAnalogy}
                disabled={!canAnalogize}
                className="rounded-sm bg-ultramarine px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper transition hover:bg-ultramarine/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Checking…" : "Assert by symmetry"}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

interface NLPanelProps {
  pointIds: string[];
  facts: FactEntry[];
  puzzleId: string;
  variableNames: string[];
  busy: boolean;
  disabled: boolean;
  onAssert: (fact: Fact, premises: Fact[], opts?: { subst?: Subst }) => void;
  onEdit: (interp: Interpretation) => void;
}

/**
 * Natural-language step input. Type a deduction → Translate → confirm the parsed
 * interpretation → Use (routes through the SAME onAssert/verify path). The AI is
 * untrusted: nothing is asserted without an explicit click, and a verify()
 * rejection surfaces via the arena's existing feedback banner.
 */
function NLPanel({
  pointIds,
  facts,
  puzzleId,
  variableNames,
  busy,
  disabled,
  onAssert,
  onEdit,
}: NLPanelProps) {
  const [text, setText] = useState("");
  const [translating, setTranslating] = useState(false);
  const [interp, setInterp] = useState<Interpretation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTranslate = async (note?: string) => {
    if (text.trim().length === 0) return;
    setTranslating(true);
    setError(null);
    setInterp(null);
    const established = facts.map((f) => f.fact);
    try {
      const translator = getTranslator();
      const result: TranslationResult = await translator.translate({
        text: note ? `${text}\n(note: ${note})` : text,
        puzzleId,
        points: pointIds,
        variables: variableNames,
        established: established.map(factToDescriptor),
      });
      // Lower + strictly validate BEFORE any verify() call.
      const conclusion = descriptorToFact(result.conclusion, pointIds);
      const premises = matchPremises(result.premises, established, pointIds);
      setInterp({ conclusion, premises, notes: result.notes });
    } catch (err) {
      if (err instanceof MapError) {
        setError(err.message);
      } else {
        setError(
          (err as Error)?.message ??
            "Couldn't translate that. Try rephrasing, or use the structured builder.",
        );
      }
    } finally {
      setTranslating(false);
    }
  };

  const use = () => {
    if (!interp) return;
    onAssert(interp.conclusion, interp.premises);
    // Keep the interpretation on screen so the verify() result reads alongside it.
  };

  const busyAny = busy || translating;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[0.62rem] uppercase tracking-wide text-ink-faint">
          Describe the step in words
        </span>
        <textarea
          value={text}
          disabled={disabled || translating}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={
            "e.g. angle APB = angle AQB since A, B, P, Q are concyclic"
          }
          className="resize-y rounded-sm border border-rule bg-paper px-2 py-1.5 font-serif text-ink"
        />
        <span className="font-mono text-[0.58rem] leading-relaxed text-ink-faint">
          Name the relation and its points; cite the facts you're using with{" "}
          <code>since</code> / <code>because</code> / <code>so</code>. We'll show
          the parsed step before anything is checked.
        </span>
      </label>

      <button
        type="button"
        onClick={() => void runTranslate()}
        disabled={disabled || busyAny || text.trim().length === 0}
        className="self-start rounded-sm border border-ultramarine px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ultramarine transition hover:bg-ultramarine/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {translating ? "Translating…" : "Translate"}
      </button>

      {error && (
        <p className="rounded-sm border border-vermilion/40 bg-vermilion/10 px-3 py-2 font-serif text-sm text-vermilion">
          {error}
        </p>
      )}

      {interp && (
        <div className="flex flex-col gap-2 rounded-sm border border-rule bg-panel-soft p-3">
          <span className="font-mono text-[0.6rem] uppercase tracking-wide text-ink-faint">
            Parsed interpretation
          </span>
          <p className="font-serif text-sm text-ink">
            Assert <MathText>{factLabel(interp.conclusion)}</MathText>
          </p>
          {interp.premises.length > 0 && (
            <p className="font-serif text-sm text-ink-soft">
              because{" "}
              {interp.premises.map((p, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  <MathText>{factLabel(p)}</MathText>
                </span>
              ))}
            </p>
          )}
          {interp.premises.length === 0 && (
            <p className="font-mono text-[0.62rem] text-ochre-deep">
              No premises were parsed — verify() will reject this as unjustified.
              Add a “since …” clause or use Edit.
            </p>
          )}
          {interp.notes && (
            <p className="font-serif text-[0.72rem] italic text-ink-faint">
              {interp.notes}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={use}
              disabled={disabled || busyAny}
              className="rounded-sm bg-ultramarine px-4 py-2 font-mono text-xs uppercase tracking-wide text-paper transition hover:bg-ultramarine/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Checking…" : "Use"}
            </button>
            <button
              type="button"
              onClick={() => onEdit(interp)}
              disabled={disabled || busyAny}
              className="rounded-sm border border-rule px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink disabled:opacity-40"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => void runTranslate(NL_AUTO_REPAIR ? "the previous attempt was rejected" : undefined)}
              disabled={disabled || busyAny}
              className="rounded-sm border border-rule px-4 py-2 font-mono text-xs uppercase tracking-wide text-ink-soft transition hover:border-ink-faint hover:text-ink disabled:opacity-40"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
