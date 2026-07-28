/**
 * v1 verifier (local stand-in for the Python symbolic backend).
 *
 * A step is accepted iff:
 *   1. the asserted fact is TRUE in the figure (numeric check), AND
 *   2. some theorem in the rule library derives it in ONE step from exactly the
 *      facts the learner cited.
 *
 * This accepts ANY valid single-step deduction (not a single scripted path),
 * and cleanly separates "not true" from "true but doesn't follow".
 */
import { AngleAR } from "./ar";
import { factHolds, type Coords, type VarBindings } from "./check";
import { canonicalKey, factEqual, isAmong, rel, type EqRatio, type Fact } from "./dsl";
import {
  RULES_READING_FIGURE_INCIDENCE,
  type Justification,
} from "./justification";
import { factHoldsL, type LFact, type LRule } from "./lengths/dsl";
import { LengthAR } from "./lengths/lengthAR";
import { RATIO_RULES } from "./lengths/rules";
import { RULES } from "./rules";
import { analogSource, isGivenSymmetry, type Subst } from "./symmetry";
import type { Realization } from "./types";

/**
 * The full single-step rule set the verifier runs: the shipped angle/incidence
 * `RULES` plus the LENGTH/RATIO rules (`RATIO_RULES`). The ratio rules are
 * composed HERE, at the verify layer — exactly as the research lab's
 * `lengths/verify.ts` composes `[...RULES, ...LENGTH_RULES]` — rather than being
 * spliced into the shipped `RULES` export, so the angle-only rule list (and the
 * tests that assert against it) is left untouched. A `Rule` widens to an `LRule`
 * (its `Fact[]` result is an `LFact[]`), so the two kinds mix freely.
 */
const ALL_RULES: LRule[] = [...RULES, ...RATIO_RULES];

/** Collinearity is treated as FREE figure structure for the angle chase (see `verify`). */
const isColl = (f: LFact): f is Fact => f.kind === "rel" && f.name === "coll";

/**
 * Expand every coll(≥4) into all its 3-point sub-collinearities (keeping the
 * original). Lets the learner state a whole line once — `coll(Q,A1,Q1,A2)` —
 * while the 3-point rules still see every triple they need. Used only to FEED
 * the rules; the learner's cited list (for the necessity check) is untouched.
 */
function expandColls(facts: Fact[]): Fact[] {
  const out = [...facts];
  const seen = new Set(facts.map(canonicalKey));
  for (const f of facts) {
    if (f.kind !== "rel" || f.name !== "coll" || f.points.length <= 3) continue;
    const p = f.points;
    for (let i = 0; i < p.length; i++)
      for (let j = i + 1; j < p.length; j++)
        for (let k = j + 1; k < p.length; k++) {
          const tri = rel("coll", [p[i], p[j], p[k]]);
          const key = canonicalKey(tri);
          if (!seen.has(key)) {
            seen.add(key);
            out.push(tri);
          }
        }
  }
  return out;
}

export interface VerifyInput {
  coords: Coords;
  bindings: VarBindings;
  establishedFacts: LFact[];
  candidateFact: LFact;
  citedPremises: LFact[];
  /** The puzzle's given facts (hypotheses). Required for "by symmetry" steps. */
  givens?: LFact[];
  /** When present, the step is justified "by symmetry" under this relabeling. */
  analogy?: { subst: Subst };
  /**
   * Independent generic realizations of the figure (all satisfying the givens) to
   * check the step against. When present (≥1), the step must be true AND derivable
   * in EVERY realization — so a step that is only coincidentally valid in the one
   * canonical figure is rejected. When omitted, the single `coords`/`bindings`
   * realization is used and behavior is identical to the original single-figure
   * verifier.
   */
  realizations?: Realization[];
  /**
   * Recover an auditable `justification` for an accepted step (the algebraic
   * certificate, the facts a rule matched, and any uncited facts the engine
   * supplied). Off by default: recovering it costs extra derivations, and the
   * accept/reject decision never depends on it, so only callers that persist or
   * display a proof need to ask.
   */
  witness?: boolean;
}

export type VerifyResult =
  | {
      valid: true;
      rule: string;
      /**
       * The auditable reason: an algebraic certificate, or the facts a named
       * rule matched, plus any established facts the engine supplied uncited.
       * Present whenever it could be recovered; `rule` is unchanged either way,
       * so nothing downstream is forced to consume it.
       */
      justification?: Justification;
    }
  | {
      valid: false;
      reason:
        | "not_true"
        | "unknown_premise"
        | "unjustified"
        | "not_symmetry"
        | "extraneous_premises";
    };

/**
 * Does `cited` derive `candidate` in one step? Returns the rule name, or null.
 * Never throws — a misbehaving rule is skipped. Three reasoning layers are tried
 * in order:
 *   1. DD — each rule scans the (coll-expanded) cited facts; a direct
 *      `factEqual` match returns that rule's name. Ratio (`eqratio`) outputs are
 *      collected separately for the length layer.
 *   2. AngleAR — directed-angle Gaussian elimination over cited ∪ DD angle
 *      consequences (skipped for ratio candidates, which carry no angle equation).
 *   3. LengthAR — log-length Gaussian elimination over the cited facts ∪ one-step
 *      DD/length consequences (so e.g. a cited proportion fuses with a rule's
 *      bridge proportion to close an SAS-similarity ratio chase).
 */
/**
 * The minimal subset of `facts` on which `rule` still produces `candidate`.
 *
 * Rules report only their conclusions, not which hypotheses they matched, so the
 * witness is recovered from outside by dropping facts one at a time and seeing
 * whether the rule keeps firing. That gives an auditable "this theorem was
 * applied to exactly these facts" without touching any of the 38 rule bodies.
 */
function ruleMatchedSubset(
  rule: LRule,
  facts: Fact[],
  ruleCtx: Parameters<LRule["derive"]>[1],
  candidate: LFact,
): Fact[] {
  const fires = (subset: Fact[]): boolean => {
    try {
      return rule.derive(subset, ruleCtx).some((d) => factEqual(d, candidate));
    } catch {
      return false;
    }
  };
  if (!fires(facts)) return facts;
  let keep = facts;
  for (const f of facts) {
    if (!keep.includes(f)) continue;
    const trial = keep.filter((g) => g !== f);
    if (fires(trial)) keep = trial;
  }
  return keep;
}

function deriveOnce(
  cited: LFact[],
  candidate: LFact,
  ctx: { coords: Coords; bindings: VarBindings; points: string[] },
  freeColls: Fact[] = [],
  wantWitness = false,
): Justification | null {
  // The DD rules and the angle table only reason about ordinary facts; `eqratio`
  // premises are routed straight to the length layer. They are also exposed to
  // the rules via `ctx.citedRatios` so a length rule that needs a proportion as
  // a GENUINE premise (e.g. SAS similarity's two-sides ratio) can require it to
  // be cited rather than reading it off the coordinates. Computed from THIS
  // call's `cited`, so the minimality check sees the right subset.
  const ordinary = cited.filter((f): f is Fact => f.kind !== "eqratio");
  const citedRatios = cited.filter((f): f is EqRatio => f.kind === "eqratio");
  const facts = expandColls(ordinary);
  const ruleCtx = { ...ctx, citedRatios };

  // One-step consequences, each remembering the rule that produced it so an
  // algebraic certificate can attribute the intermediate facts it leans on.
  const ddDerived: { fact: Fact; rule: string }[] = [];
  const lDerived: { fact: LFact; rule: string }[] = [];
  for (const rule of ALL_RULES) {
    let produced: LFact[];
    try {
      produced = rule.derive(facts, ruleCtx);
    } catch {
      continue;
    }
    for (const d of produced) {
      if (factEqual(d, candidate)) {
        if (!wantWitness) return { rule: rule.name, kind: "deduction" };
        return {
          rule: rule.name,
          kind: "deduction",
          deduction: {
            ruleId: rule.id,
            rule: rule.name,
            matched: ruleMatchedSubset(rule, facts, ruleCtx, candidate),
            readsFigureIncidence: RULES_READING_FIGURE_INCIDENCE.has(rule.id),
          },
        };
      }
      if (d.kind === "eqratio") lDerived.push({ fact: d, rule: rule.name });
      else ddDerived.push({ fact: d, rule: rule.name });
    }
  }

  // Angle layer (only meaningful for ordinary angle candidates). `freeColls` —
  // established collinearity — is added here as FREE figure structure: the
  // directed-angle chase may swing an arm across any known line (e.g. ∠ADE→∠BDE
  // because A,D,B are collinear) WITHOUT the learner citing that line. It is fed
  // ONLY to this algebraic chase — never to the named DD/length theorems (Pappus,
  // power-of-a-point, …), which still require their lines cited, so those theorems
  // don't fire "for free" and silently make a learner's other premises redundant.
  if (candidate.kind !== "eqratio") {
    const ar = new AngleAR(ctx.coords, ctx.bindings);
    for (const f of facts) ar.add(f, "cited");
    for (const d of ddDerived) ar.add(d.fact, "derived", d.rule);
    for (const f of freeColls) ar.add(f, "figure");
    if (ar.implies(candidate)) {
      const out: Justification = {
        rule: "algebraic angle-chase",
        kind: "angle-algebra",
      };
      if (wantWitness) {
        const cert = ar.certificate(candidate);
        if (cert) out.certificate = cert;
        else out.certificateGap = "the angle table entailed the step but no combination could be recovered";
      }
      return out;
    }
  }

  // Length layer: cited facts + one-step DD / length consequences.
  const lar = new LengthAR(ctx.coords);
  for (const f of cited) lar.add(f, "cited");
  for (const d of ddDerived) lar.add(d.fact, "derived", d.rule);
  for (const d of lDerived) lar.add(d.fact, "derived", d.rule);
  if (lar.implies(candidate)) {
    const out: Justification = {
      rule: "algebraic length-chase",
      kind: "length-algebra",
    };
    if (wantWitness) {
      const cert = lar.certificate(candidate);
      if (cert) out.certificate = cert;
      else out.certificateGap = "the length table entailed the step but no combination could be recovered";
    }
    return out;
  }

  return null;
}

export function verify(input: VerifyInput): VerifyResult {
  const { establishedFacts, candidateFact, citedPremises } = input;

  // The realizations to check the step against. Default to the single canonical
  // figure carried on `input` (so omitting `realizations` is exactly the original
  // single-figure verifier). All realizations satisfy the givens by construction.
  const realizations: Realization[] =
    input.realizations && input.realizations.length > 0
      ? input.realizations
      : [{ coords: input.coords, bindings: input.bindings }];

  const ctxOf = (r: Realization) => ({
    coords: r.coords,
    bindings: r.bindings ?? {},
    points: Object.keys(r.coords),
  });

  // ---- "By symmetry" / analogous argument --------------------------------
  if (input.analogy) {
    // The symmetry machinery is angle/incidence-only (it relabels `Fact`s).
    // Ratio facts are out of scope for "by symmetry", and ratio givens cannot
    // constrain a relabeling, so we work over the ordinary facts only.
    if (candidateFact.kind === "eqratio") {
      return { valid: false, reason: "unjustified" };
    }
    const points = Object.keys(realizations[0].coords);
    const givens = (input.givens ?? establishedFacts).filter(
      (f): f is Fact => f.kind !== "eqratio",
    );
    const ordinaryEstablished = establishedFacts.filter(
      (f): f is Fact => f.kind !== "eqratio",
    );
    // σ must be an automorphism of the hypotheses.
    if (!isGivenSymmetry(input.analogy.subst, givens, points)) {
      return { valid: false, reason: "not_symmetry" };
    }
    // Some established fact must map onto the asserted fact under σ.
    if (!analogSource(candidateFact, input.analogy.subst, ordinaryEstablished)) {
      return { valid: false, reason: "unjustified" };
    }
    // Safety gate: the consequence must hold numerically in EVERY realization.
    for (const r of realizations) {
      if (!factHolds(candidateFact, r.coords, r.bindings ?? {})) {
        return { valid: false, reason: "not_true" };
      }
    }
    const label = "by symmetry (analogous argument)";
    // The relabeling is the whole content of the step, and it is already stored
    // on the step's `analogy` field, so there is nothing further to recover.
    return input.witness
      ? { valid: true, rule: label, justification: { rule: label, kind: "symmetry" } }
      : { valid: true, rule: label };
  }

  // Cited premises must all be established (figure-independent).
  for (const prem of citedPremises) {
    if (!isAmong(prem, establishedFacts)) {
      return { valid: false, reason: "unknown_premise" };
    }
  }

  // Numeric truth gate across every realization (ratio-aware): a step that is
  // false in ANY valid configuration is rejected. This is what kills a fact that
  // only happens to hold in the one canonical figure.
  for (const r of realizations) {
    if (!factHoldsL(candidateFact, r.coords, r.bindings ?? {})) {
      return { valid: false, reason: "not_true" };
    }
  }

  // De-duplicate cited premises by canonical key.
  const seen = new Set<string>();
  const cited = citedPremises.filter((f) => {
    const k = canonicalKey(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // A justified step must cite the facts it uses.
  if (cited.length === 0) return { valid: false, reason: "unjustified" };

  // Collinearity is FREE figure structure for the ANGLE CHASE: every established
  // "X, Y, Z are collinear" is available to the directed-angle closure without
  // being cited, so the learner need only cite the load-bearing reasons (e.g.
  // `cyclic`) and the lines those points lie on come along for free. Only
  // ESTABLISHED colls are free — an unproven collinearity (e.g. one that is
  // itself a goal) is not granted. (Named DD/length theorems still require their
  // lines cited; `deriveOnce` feeds these only to the algebraic angle table.)
  const freeColls = establishedFacts.filter(isColl);

  // The cited facts (+ free collinearity) must derive the candidate in one step
  // (DD rule or AR) in EVERY realization. A derivation that fires only in the
  // canonical figure (a figure-specific coincidence, e.g. an accidental branch in
  // the angle table) is not a general one-step deduction, so it is rejected as
  // `unjustified`.
  // The witness is recovered once, on the canonical realization, and only after
  // the step has already been accepted in all of them. Recovering it is pure
  // reporting: it never decides whether the step passes.
  let justification: Justification | null = null;
  for (let i = 0; i < realizations.length; i++) {
    const want = input.witness === true && i === 0;
    const got = deriveOnce(cited, candidateFact, ctxOf(realizations[i]), freeColls, want);
    if (got === null) return { valid: false, reason: "unjustified" };
    if (justification === null) justification = got;
  }

  // A cited premise is FREE STRUCTURE — never required, never flagged — if it is
  // collinearity itself OR follows from the established lines alone in EVERY
  // realization (e.g. "∠IAC = ∠LAC because A, I, L are collinear" is just the
  // line restated). Citing such facts stays optional and harmless; only genuinely
  // independent reasons remain subject to the necessity check below.
  const isFreeStructure = (p: LFact): boolean =>
    isColl(p) || realizations.every((r) => deriveOnce([], p, ctxOf(r), freeColls) !== null);

  // Minimality / necessity across cases: a cited fact is REQUIRED if dropping it
  // breaks the derivation in AT LEAST ONE realization. Only when the candidate
  // still derives in EVERY realization without it is it truly extraneous — so a
  // premise that matters only in some configurations is not falsely flagged.
  for (let i = 0; i < cited.length; i++) {
    if (isFreeStructure(cited[i])) continue;
    const without = cited.filter((_, k) => k !== i);
    const droppableEverywhere = realizations.every(
      (r) => deriveOnce(without, candidateFact, ctxOf(r), freeColls) !== null,
    );
    if (droppableEverywhere) {
      return { valid: false, reason: "extraneous_premises" };
    }
  }

  const final: Justification = justification!;
  if (!input.witness) return { valid: true, rule: final.rule };

  // Record the established facts the engine supplied without the learner citing
  // them. An angle certificate already names them (its `figure`-origin terms);
  // without one, fall back to shrinking `freeColls` to those the derivation
  // actually needs. Either way the compiled proof ends up self-contained: a
  // reader is never left staring at a step whose printed premises don't reach it.
  // De-duplicated: one `coll` contributes a separate equation per pair of points
  // on its line, so the same fact can back several certificate terms.
  const implicitSeen = new Set<string>();
  const implicit = (
    final.certificate
      ? final.certificate.terms.filter((t) => t.origin === "figure").map((t) => t.fact)
      : neededFreeColls(cited, candidateFact, ctxOf(realizations[0]), freeColls)
  ).filter((f) => {
    const k = canonicalKey(f);
    if (implicitSeen.has(k)) return false;
    implicitSeen.add(k);
    return true;
  });
  if (implicit.length > 0) final.implicitPremises = implicit;

  return { valid: true, rule: final.rule, justification: final };
}

/**
 * The smallest subset of `freeColls` the derivation still needs. Used only for
 * reporting, when no algebraic certificate could name them directly.
 */
function neededFreeColls(
  cited: LFact[],
  candidate: LFact,
  ctx: { coords: Coords; bindings: VarBindings; points: string[] },
  freeColls: Fact[],
): Fact[] {
  if (freeColls.length === 0) return [];
  // Nothing implicit was needed at all.
  if (deriveOnce(cited, candidate, ctx, []) !== null) return [];
  let keep = freeColls;
  for (const f of freeColls) {
    if (!keep.includes(f)) continue;
    const trial = keep.filter((g) => g !== f);
    if (deriveOnce(cited, candidate, ctx, trial) !== null) keep = trial;
  }
  return keep;
}

/**
 * Every NEW fact the rule library can derive in one step from `facts` (treating
 * all of them as cited). Used by the dev/debug panel and, later, hints.
 */
export function deriveAll(
  facts: Fact[],
  coords: Coords,
  bindings: VarBindings = {},
): { fact: Fact; rule: string }[] {
  const ctx = { coords, bindings, points: Object.keys(coords) };
  const expanded = expandColls(facts);
  const known = new Set(facts.map(canonicalKey));
  const seen = new Set<string>();
  const out: { fact: Fact; rule: string }[] = [];
  for (const rule of ALL_RULES) {
    let produced: LFact[];
    try {
      produced = rule.derive(expanded, ctx);
    } catch {
      continue;
    }
    for (const derived of produced) {
      // The dev panel enumerates ordinary (angle/incidence) consequences only;
      // ratio facts are reasoned about in the length layer, not listed here.
      if (derived.kind === "eqratio") continue;
      const k = canonicalKey(derived);
      if (known.has(k) || seen.has(k)) continue;
      if (!factHolds(derived, coords, bindings)) continue;
      seen.add(k);
      out.push({ fact: derived, rule: rule.name });
    }
  }
  return out;
}
