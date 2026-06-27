# BrainLift: Freeplay — How a Proof Verifier Teaches Differently

**Date:** June 26, 2026  
**Scope:** The Brilliant-clone app's **Freeplay mode** — a Lean/Rocq-style, machine-checked geometry proof arena (React + TS + JSXGraph + a browser-resident DDAR engine). Companion to [`BRAINLIFT.md`](./BRAINLIFT.md) (which analyzes Brilliant.org) and to [`docs/PRD-competitive-freeplay.md`](./docs/PRD-competitive-freeplay.md).  
**Framework:** Depth of Knowledge (DOK) levels 1–4, ending in Spiky Points of View (SPOVs).  
**Lens:** This document is *not* a feature spec. It is a pedagogy thesis — it isolates the **learning techniques** Freeplay applies and the spiky, non-consensus bet about *how it teaches that no recall-based ed-tech product does.*

---

## Purpose

`BRAINLIFT.md` ends with a verdict: Brilliant sells the *feeling* of understanding, clusters at DOK 1–2, builds intuition but cannot train proof, and grades **answers** rather than **reasoning**. Freeplay is the deliberate inverse. This BrainLift names the learning techniques that let a per-step proof checker teach what multiple-choice cannot, ties each to the mechanics we have actually shipped, and stakes out the contrarian claim at the center of the product: **the unit of feedback should be the *reason*, not the *answer*.**

---

## Source Index

### Product (primary — our own engine & spec)


| Source                                                                      | Path                                                                                                                                      |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Freeplay PRD + as-built engine (§13 Implementation Status)                  | [`docs/PRD-competitive-freeplay.md`](./docs/PRD-competitive-freeplay.md)                                                                  |
| Shipped verifier (DD + AR + length/ratio + minimality + by-symmetry)        | [`src/lib/freeplay/verify.ts`](./src/lib/freeplay/verify.ts)                                                                              |
| Rule library (31 shipped rules: 13 core + 13 promoted + 5 ratio)            | [`rules.ts`](./src/lib/freeplay/rules.ts) + [`rules/`](./src/lib/freeplay/rules/) + [`lengths/rules/`](./src/lib/freeplay/lengths/rules/) |
| Algebraic-reasoning tables (angles + lengths)                               | [`src/lib/freeplay/ar.ts`](./src/lib/freeplay/ar.ts) + [`lengths/lengthAR.ts`](./src/lib/freeplay/lengths/lengthAR.ts)                    |
| Rule-discovery research harness (18 promotable rules + 20 contest problems) | [`research/freeplay-rules/README.md`](./research/freeplay-rules/README.md)                                                                |
| Sibling BrainLift on Brilliant.org                                          | [`BRAINLIFT.md`](./BRAINLIFT.md)                                                                                                          |


### Learning science (the techniques we are betting on)


| Source                                                                                     | Claim it anchors                                                |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Chi & Wylie (2014), *ICAP framework*, Educational Psychologist                             | Interactive > Constructive > Active > Passive engagement        |
| Slamecka & Graf (1978), *the generation effect*                                            | Generating beats reading                                        |
| Chi et al. (1989, 1994), *self-explanation effect*                                         | Explaining *why* drives learning                                |
| Kapur (2008, 2016), *productive failure / productive struggle*                             | Struggle before instruction beats assistance-first              |
| Hattie & Timperley (2007), *The Power of Feedback*, RER                                    | Feedback = where to / how going / where next                    |
| Sweller (1988, 2011), *cognitive load theory*; worked-example & expertise-reversal effects | Scaffold load, fade scaffolds                                   |
| Wood, Bruner & Ross (1976); Vygotsky, *ZPD / scaffolding*                                  | Structured support inside the zone of proximal development      |
| Bjork & Bjork (2011), *desirable difficulties*                                             | Conditions that slow acquisition but improve retention/transfer |
| Marton (2015), *variation theory*; contrasting cases                                       | Vary the irrelevant to reveal the invariant                     |
| Bloom (1984), *the 2-sigma problem*; mastery learning                                      | Mastery + tutoring vs group instruction                         |
| Roediger & Karpicke (2006), *testing effect*                                               | Retrieval > restudy; illusion of competence                     |
| Koedinger et al. (2012), *KLI framework*                                                   | Match instruction type to the knowledge component               |


---

## DOK 1 — Facts

*Recall only. No evaluation.*

### A. What Freeplay actually does (product mechanics, as-built §13)

1. A Freeplay puzzle presents three panels: **established facts** (left), a **fixed geometric figure** (center), and a **goal plus curator-authored equivalent reformulations** (right), with a **step builder** at the bottom. *(PRD §4.1)*
2. A learner advances by **asserting a new fact together with the established facts it relies on** — "x is y *because we have z*." Naming the theorem is **not required**. *(PRD §3, §13.1)*
3. The verifier accepts a step **iff** (a) the asserted fact is numerically true in the figure **and** (b) some rule derives it **in one step** from **exactly** the cited facts. *(`verify.ts`, PRD §13.1)*
4. Rejections return one of three machine-distinguished reasons: **`not_true`** (false in the figure), **`unjustified`** (true but not derivable from the cited facts in one step), and **`unknown_premise`** (cited a fact that isn't established). *(PRD §6.3, §13.1)*
5. A **minimality / necessity check** rejects (`extraneous_premises`) if any cited fact can be dropped and the step still derives — so "cite everything" cannot cheat the checker. *(PRD §13.1)*
6. The engine bounds reasoning to **one inference step**, so a learner cannot assert the goal directly on step 1; they must build a forward chain from givens. *(PRD §6.2–6.3)*
7. On a win, the app renders an **assembled, human-readable proof** — the ordered chain, each line showing the engine-supplied rule name and the cited premises. *(PRD §4.3, §13.1)*
8. The same fact can be reached by **multiple valid paths**; the checker grades a *path of reasoning*, not one pre-authored answer. *(PRD §1, §2 user stories)*
9. An **algebraic-reasoning (AR)** layer (a Gaussian-elimination table over exact rationals, ported from AlphaGeometry's `ar.py`) accepts any fact that is a **linear consequence** of the cited angle facts — making the checker complete for directed-angle reasoning relative to the cited facts. *(PRD §13.1, `ar.ts`)*
10. A **"by symmetry / analogous argument"** move lets a learner re-use a finished sub-proof under a point relabeling, accepted iff the relabeling is an automorphism of the puzzle's givens. *(PRD §13.1, `symmetry.ts`)*
11. Figures use **generic scalene coordinates** and the engine validates the conclusion across the realization; parallelism/collinearity must be **cited**, never read "for free" off the diagram. *(PRD §13.1, item 5)*
12. Hints and the full auto-solver are **deliberately deferred** (P3); v1 gives no next-step assistance. *(PRD §1 Non-Goals, §10)*
13. The research harness has battle-tested rules and **real contest/classical problems** (ISL & JBMO shortlist, IMO 2018 P1, IMO 2019 P2, Pascal, power-of-a-point, the angle-bisector theorem, the Simson–Wallace line), **all 20 verifying end-to-end**; the boundaries the engine can't reach (signed-ratio Menelaus/Ceva, pole–polar, radical axis) are documented as precise negative results, not failing problems. *(`research/freeplay-rules/README.md`)*

### B. Learning-science facts (the techniques being applied)

1. **ICAP:** learning outcomes rise monotonically Passive → Active → Constructive → Interactive; *constructive* activities (generating reasoning beyond the given material) beat *active* ones (selecting/manipulating given material). *(Chi & Wylie, 2014)*
2. **Generation effect:** information a learner generates is retained better than the same information read. *(Slamecka & Graf, 1978)*
3. **Self-explanation effect:** prompting learners to explain *why* a step follows produces large gains over studying the step alone. *(Chi et al., 1989, 1994)*
4. **Productive failure / struggle:** having learners attempt and struggle *before* receiving the canonical method outperforms direct instruction first, especially for transfer. *(Kapur, 2008, 2016)*
5. **Effective feedback** answers *Where am I going? / How am I going? / Where to next?* and is strongest when it closes the gap between current and target understanding; feedback at the **process** and **self-regulation** levels beats feedback at the **task/answer** level. *(Hattie & Timperley, 2007)*
6. **Cognitive load theory:** working memory is limited; instruction should minimize extraneous load and manage intrinsic load via scaffolds and worked examples; scaffolds should **fade** as expertise grows (expertise-reversal effect). *(Sweller, 1988, 2011)*
7. **Scaffolding / ZPD:** structured support lets a learner accomplish tasks just beyond independent reach; support is gradually withdrawn. *(Wood, Bruner & Ross, 1976; Vygotsky)*
8. **Desirable difficulties:** conditions that slow apparent acquisition (varied examples, generation, spacing) improve long-term retention and transfer. *(Bjork & Bjork, 2011)*
9. **Variation theory / contrasting cases:** to learn what is *invariant* in a concept, vary what is *irrelevant*; juxtaposing cases reveals the critical feature. *(Marton, 2015)*
10. **Mastery + tutoring (2-sigma):** one-to-one mastery tutoring moves the average student ~2 standard deviations above group instruction; immediate corrective feedback to mastery is a core mechanism. *(Bloom, 1984)*
11. **Illusion of competence:** learners overpredict their understanding after passive review; production/testing reveals the true gap. *(Roediger & Karpicke, 2006)*

---

## DOK 2 — Synthesis

*Concise summary. No recommendations yet. The learning techniques Freeplay applies, mapped to the mechanics that implement them.*


| Learning technique                             | How Freeplay implements it                                                                                                                        | Contrast with Brilliant-style MC (per `BRAINLIFT.md`)                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Constructive/Interactive engagement (ICAP)** | Learner *produces* a fact **and a reason** every step; the figure + fact list are inputs to construction, not answer choices.                     | MC and slider puzzles are *Active* at best — selecting/manipulating given material. |
| **Generation effect**                          | No answer to recognize; every claim is generated and justified.                                                                                   | Recognition of a pre-authored answer; the answer is generated *for* the learner.    |
| **Self-explanation, enforced**                 | The "*because we have z*" citation is a mandatory, machine-checked self-explanation.                                                              | Explanations are post-hoc and skippable (the SPOV-5 problem in `BRAINLIFT.md`).     |
| **Productive struggle**                        | Hints and solver withheld in v1; the learner must chain forward unaided.                                                                          | Koji and hint systems reduce struggle to protect engagement.                        |
| **Process-level formative feedback**           | Three-way verdict distinguishes *false* vs *true-but-unsupported* vs *more-than-one-step* — feedback about the **reasoning**, not the conclusion. | Binary correct/incorrect feedback on the **answer**.                                |
| **Scaffolding inside the ZPD**                 | Step builder + curated rule palette + clickable object slots lower syntax load; the learner does reasoning, not Lean syntax.                      | UI scaffolds the *answer-selection*, not the *argument*.                            |
| **Worked-example effect**                      | The win-state assembled proof is a learner-authored worked example to study.                                                                      | Worked solutions are author-supplied, not the learner's own path.                   |
| **Desirable difficulties**                     | Generic coordinates defeat diagram pattern-matching; minimality forces precise citation; multiple valid paths force search.                       | Variants are same-grammar permutations (near transfer).                             |
| **Variation theory**                           | The conclusion is checked against a generic realization; parallel/collinear facts must be *earned*, not read off one drawing.                     | One figure, one configuration, surface features fixed.                              |
| **Bidirectional reasoning**                    | Forward chaining from givens + right-panel **equivalent goal reformulations** ("it suffices to show…") model backward reasoning.                  | Backward/means-ends reasoning largely absent.                                       |
| **Mastery feedback**                           | Definitive yes/no per step; iterate freely with zero penalty; a step either joins the fact list or doesn't.                                       | Correct/incorrect with limited attempts; completion ≠ mastery.                      |


**The throughline:** Brilliant grades **conclusions**; Freeplay grades **entailment chains**. Every technique above is downstream of one architectural choice — *the verifier checks the reason, not the answer.*

---

## DOK 3 — Insights

*Evidence-linked reasoning. Each insight connects a Freeplay mechanic to a learning-science result.*

### Insight 1 — Mandatory citation converts the most powerful, most-skipped technique (self-explanation) into a hard gate

**Evidence:** The self-explanation effect is one of the largest, most replicated results in the learning sciences (Chi et al.). In `BRAINLIFT.md`, SPOV-5 identifies the fatal flaw of MC platforms: the explanation is the heaviest learning moment, and gamification rewards skipping it. Freeplay's `verify()` *cannot accept a step without a citation* (`unjustified` / `unknown_premise` rejections; minimality check).  
**Implication:** Self-explanation stops being an optional good habit and becomes the price of admission for every single step — the technique is structurally unskippable.

### Insight 2 — The three-way verdict is process-level feedback, which Hattie ranks above answer-level feedback

**Evidence:** Hattie & Timperley find feedback about the *process* and *self-regulation* dwarfs feedback about the *task/answer*. Freeplay's distinction between `not_true`, `unjustified`, and "more than one step away" tells the learner *which kind of thing went wrong* — is my claim false, or true-but-unsupported, or am I skipping reasoning?  
**Implication:** A rejected step teaches more than a binary "wrong," because it localizes the gap (where to next) at the level of reasoning, not the level of the answer.

### Insight 3 — The step builder is a scaffold engineered to fade, dodging the expertise-reversal trap

**Evidence:** CLT says novices need worked-example/scaffold support but experts are *slowed* by it (expertise reversal). Freeplay's palette + slot-clicking removes the extraneous load of formal syntax (no Lean to write) while preserving the intrinsic load (the reasoning). Optional rule-naming and the planned NL on-ramp (P4) are higher-autonomy modes for stronger learners.  
**Implication:** The scaffold targets *notation*, never *thinking* — so it can fade (looser premise selection, NL entry, by-symmetry) without removing the cognitive work that produces learning.

### Insight 4 — Withholding hints is a productive-failure bet, not a missing feature

**Evidence:** Kapur shows struggling *before* being given the method improves transfer relative to assistance-first. `BRAINLIFT.md` SPOV-3 notes Brilliant's moat is increasingly Koji's *assistance*. Freeplay deliberately defers hints/solver to P3 (PRD Non-Goals).  
**Implication:** The "no help" of v1 is the pedagogy. The risk is motivational (frustration), which is exactly why scoring/elegance and an *eventual* hint come later — but struggle comes first by design.

### Insight 5 — Multiple valid paths + generic coordinates are textbook desirable difficulties

**Evidence:** Bjork: variation and generation slow acquisition but improve transfer; Marton: vary the irrelevant to expose the invariant. Freeplay grades a *path*, not an answer (many routes accepted), and uses generic scalene coordinates so the learner cannot read `para`/`coll` off the picture — those must be cited and survive the realization.  
**Implication:** The product manufactures the difficulties that produce durable transfer, instead of smoothing them away for flow — the opposite of the difficulty-compression `BRAINLIFT.md` attributes to Brilliant.

### Insight 6 — The right-panel "equivalent goals" teach the backward/means-ends reasoning experts use and curricula skip

**Evidence:** Expert problem-solvers work backward from the goal (means-ends analysis; Sweller). Freeplay's curator-authored "it suffices to show…" reformulations make the goal a *movable target*, training the learner to reduce it.  
**Implication:** Bidirectional thinking — forward from givens, backward from goal — is scaffolded explicitly, which most proof instruction never makes visible.

### Insight 7 — Each step is a mastery checkpoint with instant, unambiguous, penalty-free feedback (Bloom's mechanism)

**Evidence:** Bloom's 2-sigma rests on mastery + immediate corrective feedback. Freeplay verifies each step locally and instantly; a wrong step costs nothing and an accepted step is *certainly* sound (an actual rule application, not a numeric coincidence).  
**Implication:** The arena approximates one-to-one tutoring's tightest loop — at the granularity of a single inference — without a human tutor.

### Insight 8 — Production defeats the illusion of competence that MC platforms manufacture

**Evidence:** Roediger & Karpicke: learners overrate understanding after passive review; `BRAINLIFT.md` SPOV-1/Insight-12 says Brilliant sells the *feeling* of understanding. Freeplay's gate is *production of a valid chain* — you cannot feel you understand a proof you could not build.  
**Implication:** "I solved it" in Freeplay is evidence of competence, not a metacognitive illusion, because the artifact is a checked proof.

### Insight 9 — The assembled proof is a worked example the learner authored, maximizing its study value

**Evidence:** Worked examples reduce load and improve learning; self-generated artifacts benefit from the generation effect. Freeplay's win-state proof (rule names + premises per line) is *the learner's own path* reconstructed from the engine traceback.  
**Implication:** The reward doubles as the highest-value review object — a worked example with the learner's name on it.

### Insight 10 — The known V1 "honesty gap" is a deliberate KLI trade-off, not negligence

**Evidence:** The agent's own critique: V1 guarantees (a) you can't state false things, (b) you must chain forward, (c) the rule must have the right shape — but it does **not** verify logical entailment (a shape-matching but irrelevant premise can pass). Koedinger's KLI: match the checker to the **knowledge component** you're training.  
**Implication:** The binding learning constraint for novices is *commit to a named reason and chain forward* — not airtight entailment. V1 optimizes that component now; the symbolic V2 (DDAR) closes entailment later, on data structures designed for it from day one.

### DOK mapping — Freeplay task types vs the Brilliant baseline


| Activity                                                                        | DOK | Why                                                                   |
| ------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------- |
| Recognize the goal predicate / read the figure                                  | 1   | Identify objects and the target statement                             |
| Build one well-formed, justified step                                           | 2–3 | Apply a rule with correct premises; routine→strategic as configs vary |
| Choose a path among many to the goal                                            | 3   | Plan, select intermediate facts, justify a route                      |
| Construct a full multi-step proof; use by-symmetry / equivalent-goal reductions | 4   | Sustained synthesis; novel chaining; an *open* solution space         |
| Minimize step count / find the elegant proof (scoring, P3)                      | 4   | Optimize a self-authored argument for taste                           |


The center of mass sits at **DOK 3–4** — precisely the band `BRAINLIFT.md` shows Brilliant cannot reach.

---

## DOK 4 — Spiky Points of View

*Non-consensus, defensible, strongly held / loosely held. How Freeplay teaches differently — and why the rest of ed-tech is optimizing the wrong variable.*

### SPOV 1 — Ed-tech grades answers; learning proof requires grading **reasons**. Answer-checking is pedagogical theater for any DOK-3+ skill.

**Because:** Every mass-market platform — Brilliant included (`BRAINLIFT.md` Insight-12, SPOV-1) — verifies the *conclusion*. But a proof is not its conclusion; it is the entailment chain. A product that accepts "the points are concyclic" without "*because* of these cited facts under one rule" has taught nothing about proving. Freeplay's entire architecture exists to make the **citation**, not the claim, the checked object (Facts A2–A5). Self-explanation research says the reason is where the learning is (Chi et al.); we made the reason the only thing that advances the game.  
**Counterpoint:** Answer-grading scales to every subject; reason-grading needs a domain verifier (we built one for geometry, not for history).  
**So what:** The moat is not the puzzles or an AI tutor — it is a checker that can say *with certainty* whether a **reason** is valid. That is uncloneable by prompt engineering.

### SPOV 2 — Withholding hints and the auto-solver is the feature. The industry removes struggle to protect engagement metrics, and trains dependence in the process.

**Because:** Kapur's productive failure shows struggle-first beats assistance-first for transfer. The ed-tech reflex — Koji, instant hints, step-unlock nudges — optimizes session length and streaks (`BRAINLIFT.md` SPOV-2/SPOV-3), not transfer. Freeplay ships v1 with **no hint and no solver** on purpose. A learner who finally chains givens→goal unaided owns that schema in a way a hint-walked learner never will.  
**Counterpoint:** Unmitigated struggle is demotivating and can cause dropout; this is a real risk for a single-player untimed v1.  
**So what:** Struggle is the dosage, not the bug. Hints arrive in P3 *after* the struggle loop is established — and even then powered by the same verifier, surfacing a *reason*, not an answer.

### SPOV 3 — A "dumb" verifier that says yes/no with a reason category teaches more independence than a "smart" AI tutor that explains.

**Because:** An explaining tutor (the LLM-tutor consensus, and Brilliant's Koji bet) hands the learner the very thing — the explanation — that the self-explanation and generation effects say the learner must produce themselves. Every explanation given is a generation opportunity taken away. Freeplay's verifier refuses to explain *why your step works before you've built it*; it only adjudicates the reason you supplied. Independence is the trained outcome.  
**Counterpoint:** Tutors lower frustration and help stuck novices who would otherwise quit; pure adjudication can wall out beginners.  
**So what:** Build the *checker* first and the *explainer* last — inverse to the industry. The NL on-ramp (P4) and hints exist to *lower the cost of producing a reason*, never to produce the reason for the learner.

### SPOV 4 — The numeric "honesty gap" (V1 verifies truth + shape + chaining, not logical entailment) is pedagogically *acceptable* — possibly *optimal* — for novices.

**Because:** Consensus among formalists would call a checker that lets an irrelevant-but-shape-matching premise pass "unsound, therefore broken." But the binding learning constraint for a high-schooler is not airtight entailment — it is *forming the habit of committing to a named reason and building forward* (KLI: train the right knowledge component; Koedinger et al.). V1 nails that component and blocks the failure modes that actually corrupt learning (asserting false things; winning by guessing the goal; advancing on uncited truths). Demanding full entailment on day one would price out the learner we are trying to onboard.  
**Counterpoint:** A learner could internalize a subtly invalid inference the checker waved through; rigor purists will (correctly) flag this.  
**So what:** Ship the novice-correct constraint now; the rules collected in V1 become the inference rules of the symbolic V2 (DDAR), which closes the entailment gap on data structures built for it from day one. The gap is a *staged* trade-off, not a permanent compromise.

### SPOV 5 — Multiple-choice is recognition; proof is production — and you cannot scaffold a smooth ramp from one to the other. You start producing on day one, badly.

**Because:** Recognition and production are different knowledge components; fluency at selecting the right answer does not compose into the ability to generate an argument (transfer-specificity; ICAP's Active≠Constructive boundary). Brilliant's ceiling (`BRAINLIFT.md` SPOV-6: "cannot train olympiad thinkers without abandoning what makes it Brilliant") is exactly this wall. Freeplay's answer is to make the learner *produce a justified step immediately* — scaffolding the **notation** (palette, slots) while refusing to scaffold the **thinking**.  
**Counterpoint:** Throwing novices into production is intimidating and has a steeper on-ramp than tapping answers; completion rates will trail MC.  
**So what:** Accept a smaller, more serious top-of-funnel. Freeplay is not trying to be everyone's 15-minute habit; it is trying to be the only place that takes a learner *across* the recognition→production wall.

### SPOV 6 — The "fixed figure" everyone reads as a UX regression is a pedagogical asset, and randomized resampling teaches generality better than a draggable diagram.

**Because:** Brilliant's draggable manipulatives risk context-bound, non-transferring learning (`BRAINLIFT.md` SPOV-4; manipulatives research). Freeplay validates the conclusion against a *generic* realization and forces `para`/`coll` to be **cited**, never read off the picture — so the learner reasons about the *general* configuration, not the *drawn* one. A draggable figure invites "it looks true here"; resampling-backed verification punishes exactly that intuition.  
**Counterpoint:** Static figures are less visually engaging and lose the exploratory "feel the math" affordance Brilliant trades on; dynamic rendering returns in P2 for a reason.  
**So what:** Generality is the learning target, and the engine — not the drag handle — is what enforces it. Re-introduce interactivity in P2 *on top of* a checker that already refuses to be fooled by a single diagram.

### SPOV 7 — Gamifying for proof **elegance** (fewest steps) teaches mathematical *taste* — a DOK-4 outcome no recall-based platform can even measure.

**Because:** Streaks and XP reward presence and volume (`BRAINLIFT.md` SPOV-2/7); they cannot reward the *quality* of an argument because they never see one. Because Freeplay holds a checked proof object, it can score on **step count and path** (P3): shorter, cleaner proofs win. That trains learners to *seek elegance* — the disposition that separates a contestant from a calculator — and it is measurable only because we grade reasoning.  
**Counterpoint:** Optimizing for short proofs can discourage exploration and penalize the messy, valid-but-long reasoning that beginners need to do first.  
**So what:** Stage it: correctness-only scoring while learning to produce; elegance scoring once production is fluent. Taste is the eventual DOK-4 prize that an answer-grader structurally cannot offer.

### SPOV 8 — The honest competitor isn't Brilliant; it's a blank sheet of paper — and Freeplay should beat paper on exactly one axis: instant, certain, reason-level feedback.

**Because:** For real proof training, `BRAINLIFT.md` (SPOV-6/8) concedes the field to textbooks, AoPS, and coaches — i.e., paper. Paper's weakness is the feedback loop: a student writes a proof and waits days, or never finds out, whether a step is *unsupported* vs *false*. Freeplay's one unbeatable advantage is collapsing that loop to milliseconds at single-step granularity (Bloom's mastery mechanism), with the three-way reason verdict paper can never give.  
**Counterpoint:** Paper imposes no rule palette and no engine-coverage ceiling — a student can invent any argument, including ones our 31 rules + AR/LengthAR can't yet check (e.g., the open signed-ratio Menelaus/Ceva and pole–polar gaps documented in the research harness).  
**So what:** Don't position against Brilliant's intuition product; position as *the proof-feedback loop that paper cannot provide.* Engine coverage (the research harness's job) is the roadmap that widens what that loop can adjudicate.

---

## Appendix: Design heuristics for a reason-grading learning product

Distilled from this BrainLift — the inversions of `BRAINLIFT.md`'s appendix:

1. **Grade the reason, not the answer.** If the unit of feedback is the conclusion, you are not teaching any DOK-3+ skill. Build (or reuse) a verifier for the *entailment*.
2. **Make self-explanation a hard gate, not a habit.** The most powerful technique is the one learners skip; remove the skip.
3. **Withhold help until after the struggle loop exists.** Hints/solvers are dependence engines if they come first; deploy them late and make them surface *reasons*, not answers.
4. **Scaffold notation, never thinking.** Lower the cost of *expressing* a step (palette, clicks, NL) while preserving the cost of *producing* it. Then let the scaffold fade.
5. **Manufacture desirable difficulties on purpose.** Generic coordinates, multiple valid paths, and minimality checks slow the learner and build transfer — keep them.
6. **Turn the reward into a worked example.** The win-state proof is the learner's own; surface it as the primary study artifact.
7. **Stage rigor to match the knowledge component.** A novice-correct checker now (truth + shape + chaining) beats a perfect-but-inaccessible one; upgrade to full entailment when the data structures and the learner are ready.

---

*BrainLift v1.0 (Freeplay) — companion to [`BRAINLIFT.md`](./BRAINLIFT.md). Thesis: the unit of feedback should be the reason, not the answer.*
