# Learning-Design Review: Justification and Evidence-Based Improvements

**Date:** June 28, 2026
**Scope:** The Interactive Olympiad Geometry app — both the **guided Course** (7 lessons, 39 problems; multiple-choice / algebraic / geometric answers on draggable JSXGraph figures) and **Competitive Freeplay** (a machine-checked, step-by-step proof arena backed by a from-scratch DDAR verifier).
**Audience & register:** Written to be defensible to a learning scientist. Claims are tied to specific shipped mechanics (with `file:line` references) on one side and to the empirical literature (with effect sizes, moderators, and caveats) on the other.
**Companion documents:** [`BRAINLIFT.md`](../BRAINLIFT.md) (analysis of Brilliant.org), [`BRAINLIFT-freeplay.md`](../BRAINLIFT-freeplay.md) (the reason-grading pedagogy thesis), and [`docs/research/learning-science-design-patterns.md`](research/learning-science-design-patterns.md) (the underlying problem-solving/proof research synthesis). This document supersedes neither; it audits the *as-built* product against the evidence and prioritizes change.

---

## 0. How to read effect sizes in this report (a methodological warning)

Every magnitude below is a summary estimate from a meta-analysis or a single study, and in nearly all cases **moderators dominate the main effect**. Two cautions are load-bearing for this product and are stated once here:

1. **Domain-transfer caution.** The canonical effect sizes for retrieval practice, spacing, and self-explanation are largely derived from *low-element-interactivity* material (vocabulary, facts, definitions). Olympiad geometry is *high-element-interactivity* problem solving, where many elements must be co-held in working memory. Cognitive Load Theory predicts — and recent studies confirm — that "desirable difficulties" can become *undesirable* (overload) in this regime (Chen, Castro-Alonso, Paas & Sweller, 2018; Huang et al., 2023). The right move is to apply memory techniques on a **component layer** (theorem statements, configuration recognition, "what's the move") where the fact-learning estimates transfer, and to scaffold the **full-problem/proof layer** with worked examples and fading rather than raw drill.

2. **Honesty about contested effects.** Where the literature is weak or disputed (most sharply: growth-mindset interventions), this report says so and does **not** recommend building on it.

The product's existing design documents already cite a strong bibliography; this review adds 2017–2026 meta-analytic and replication evidence and, crucially, connects each claim to the specific code path it justifies or indicts.

## 1. Executive summary

**Thesis.** The product makes one architecturally correct and unusually defensible top-level bet — *in Freeplay, the unit of feedback is the reason, not the answer* — and surrounds it with a guided Course whose individual mechanics are mostly well-aligned with the evidence but whose **session-to-session learning architecture is missing**. The largest, cheapest wins are not in the mechanics that exist; they are in the mechanics that are absent: **spaced retrieval, interleaving, an unskippable post-success consolidation moment, and explicit concreteness fading**. The most defensible thing about the gamification layer is what it *omits* (no streaks, no leaderboards, no repeat-XP grind), which is well-supported by self-determination theory.

**What is strongly justified (keep, and make louder):**

- The **assert-a-fact-and-cite-its-premises** mechanic (`StepBuilder.tsx`, `verify.ts`) is simultaneously a *structured self-explanation* (Bisra et al., 2018, g ≈ 0.55) and an ICAP-*Constructive* activity (Chi & Wylie, 2014) that is *machine-checkable* — a combination essentially no recall-based competitor can offer.
- The **three-way rejection verdict** (`not_true` / `unjustified` / `unknown_premise`, plus `extraneous_premises`; `verify.ts:83-93`) is *process-level* feedback, which Hattie & Timperley (2007) and Shute (2008) rank above the task/answer-level feedback that dominates ed-tech.
- **Generic coordinates + multi-realization checking** (`realize.ts`, `verify.ts:218-225`) operationalize *desirable difficulties* (Bjork & Bjork, 2011) and *variation theory* (Marton, 2015), and — uniquely — let the checker **enforce the deductive-vs-empirical distinction** that is students' single most persistent proof misconception (Stylianides & Weber; the 2024 misconception catalogues).
- **Error-specific explanations with on-figure overlays** (`ProblemPlayer.tsx:43-62`, `types.ts:44-54`) are *elaborated, integrated* feedback that respects the split-attention effect (Sweller).
- **XP awarded once per problem, zero on reveal, none on repeats** (`recordAttempt.ts:60-65`; `LessonPlayer.tsx:208`) and **milestone (not presence) achievements** (`achievements.ts:15-57`) are the *informational*, low-overjustification end of the reward spectrum (Deci, Koestner & Ryan, 1999, d ≈ −0.34 for controlling rewards).

**What is weakly justified or missing (the priority backlog):**

1. **No spaced retrieval / review queue** — telemetry is captured (`problemStats`, `recordAttempt.ts:49-57`) but never resurfaced; this forgoes the best-replicated durability effect there is (Cepeda et al., 2006).
2. **No interleaving** — problems are blocked by topic, yet *discrimination* ("which technique fits this configuration?") is the core olympiad skill and the exact thing interleaving trains (Rohrer et al., 2020, d ≈ 0.83).
3. **The post-correct explanation is skippable** (`ProblemPlayer.tsx:106-112, 249-255`) — the highest-value learning moment is one click from being bypassed (the SPOV-5 problem named in the project's own `BRAINLIFT.md`).
4. **No concreteness fading** — learners can stay on the draggable figure indefinitely; "drag to check" can actively *reinforce* the empirical-proof misconception (Fyfe et al., 2014; the dynamic-geometry transfer-risk literature).
5. **Multiple-choice is recognition, not generation** for ~27 of 39 problems — and recognition does not compose into production (ICAP Active≠Constructive).
6. **No worked-example → completion → faded scaffold and no comprehension-vs-construction split** at the Course→Freeplay boundary — the "blank page" cliff into proof is unscaffolded (CLT; the 2025 two-skill proof finding).
7. **No metacognitive calibration** — nothing counters the illusion of competence (Koriat & Bjork, 2005).

The rest of this document defends each claim in §3 (justification), itemizes the gaps in §4, and gives a prioritized, code-anchored plan in §5.

---

## 2. Evidence base and method

Four parallel evidence streams were assembled for this review:

- **Memory & practice science** — retrieval practice, spacing, interleaving, feedback timing/type, and metacognitive calibration (Roediger & Karpicke; Adesope et al., 2017; Cepeda et al., 2006, 2008; Rohrer et al., 2014, 2020; Hattie & Timperley, 2007; Shute, 2008; Koriat & Bjork, 2005).
- **Instructional design for problem solving & proof** — cognitive load / worked examples / fading, productive failure, self-explanation, ICAP, scaffolding & hints, concreteness fading / dynamic geometry / variation, and proof-specific pedagogy. Full synthesis with citations in [`docs/research/learning-science-design-patterns.md`](research/learning-science-design-patterns.md).
- **Motivation & gamification** — self-determination theory, flow, gamification meta-analyses, streaks, leaderboards, mastery learning, and the (contested) growth-mindset literature.
- **A code-referenced inventory** of every shipped learning mechanic across both modes (the `file:line` anchors used throughout §3–§5).

A standing limitation: there is no internal A/B or learning-outcome telemetry for this app yet, so every "this works" claim is *external-evidence transfer*, not in-product measurement. Building that measurement capability is itself recommendation R8 (§5).

---

## 3. Justification of current design choices

Each subsection states **(i)** what ships and where, **(ii)** the learning-science justification with magnitudes, **(iii)** the strength of the warrant, and **(iv)** the boundary conditions under which the justification fails.

### 3.1 Reason-grading: assert-a-fact-and-cite-its-premises (Freeplay)

**(i) As built.** A Freeplay step is *"X is true **because we have** Y, Z."* The learner asserts a new fact and selects the established facts it depends on; naming the theorem is optional (`StepBuilder.tsx:254-533`). `verify.ts` accepts the step iff (a) it has ≥1 cited premise (`verify.ts:237`), every premise is established (`211-216`), (b) it is numerically true across all realizations (`218-225`), (c) some rule derives it in one step from exactly those premises (`253-258`), and (d) the citation is *minimal* — no premise can be dropped (`268-281`).

**(ii) Justification.** Requiring the learner to *generate* the conclusion and *name the prior facts it follows from* is, definitionally, a **self-explanation** prompt — and self-explanation is one of the larger, more robust effects in the literature: g ≈ 0.55 overall (Bisra, Liu, Nesbit, Salimi & Winne, 2018), with the math-specific estimate smaller but **larger when the explanation is scaffolded/structured rather than a free-text box** (Rittle-Johnson, Loehr & Durkin, 2017). The citation palette is exactly that structure. In ICAP terms (Chi & Wylie, 2014), selecting an MC answer is *Active*; generating a fact-plus-justification is *Constructive*, and the largest predicted jump in the framework is Active→Constructive. The *generation effect* (Slamecka & Graf, 1978) and the defeat of the illusion of competence (Roediger & Karpicke, 2006) both follow: a learner cannot "feel" they understand a proof they could not produce.

**(iii) Strength: strong.** This is the product's best-warranted design decision. It is also the one most resistant to commoditization, because the justification (not the answer) is the checked object.

**(iv) Boundary conditions.** Self-explanation can backfire when it is redundant or steals attention from the to-be-learned content — the 2023 worked-example meta-analysis (Barbieri et al.) found SE prompts *attached to worked examples* were a negative moderator (β ≈ −0.24). Implication for Freeplay: the assert-and-cite gate is well-placed during *construction*, but if/when worked partial proofs are added (R5), do **not** also force a separate explanation prompt on every pre-filled line.

### 3.2 The three-way (four-way) rejection verdict (Freeplay)

**(i) As built.** Rejections are typed: `not_true` (false in the figure), `unjustified` (true but not derivable in one step from the cited facts), `unknown_premise` (cited a non-established fact), `extraneous_premises` (citation not minimal), and `not_symmetry` (`verify.ts:83-93`; UI mapping `FreeplayArena.tsx:33-60`).

**(ii) Justification.** Hattie & Timperley (2007) distinguish feedback about the *task/answer*, the *process*, and *self-regulation*, and find process- and self-regulation-level feedback substantially more powerful than answer-level verification; mean feedback effects across meta-analyses sit around d ≈ 0.4–0.8 but are dominated by *information content*, with verification-only feedback the weakest kind (Wisniewski, Zierer & Hattie, 2019). A typed verdict tells the learner *which kind of thing went wrong* — "is my claim false, true-but-unsupported, or skipping steps?" — which is process-level by construction. Shute (2008) adds that immediate, elaborated feedback is most beneficial precisely for *difficult, procedural* tasks and *lower-proficiency* learners, which describes a novice building a proof.

**(iii) Strength: strong**, with the caveat that "elaborated" means the verdict must be *explained*, not just labelled. The current UI surfaces the category; pairing each category with a one-line *why* (and, for `unjustified`, *what kind* of gap) is the difference between good and excellent here.

**(iv) Boundary conditions.** Shute also notes immediate feedback on *every* action can foster dependence and hurt transfer; checking should not become keystroke-level hand-holding. Freeplay checks at the granularity of a deliberately asserted step, which is the right unit.

### 3.3 Generic coordinates, multi-realization checking, and the empirical-proof firewall (Freeplay)

**(i) As built.** Figures use generic (scalene) coordinates and each candidate fact is validated across several independent realizations (`realize.ts:26-27`, `DEFAULT_REALIZATIONS = 5`; `verify.ts:218-225`). Parallelism/collinearity must be *cited*, never read off the diagram (`verify.ts:239-246`).

**(ii) Justification.** Three converging results. (a) *Desirable difficulties* (Bjork & Bjork, 2011): conditions that slow acquisition — varied instances, generation, refusal of surface cues — improve retention and transfer. (b) *Variation theory* (Marton, 2015): a critical feature is discerned only when the irrelevant varies against it; checking the claim against many realizations forces reasoning about the *general* configuration, not the drawn one. (c) Most importantly, the **empirical-proof misconception** — treating confirming examples as a proof — is the deepest and most persistent error in the proof-learning literature (Stylianides & Weber; 2024 misconception catalogues). A verifier that *rejects measurement-based justification and demands a cited theorem* enforces the deductive-vs-empirical distinction that a static textbook can only assert. This is a genuine pedagogical capability, not just an engineering nicety.

**(iii) Strength: strong**, and distinctive.

**(iv) Boundary conditions.** The dynamic-geometry literature warns this firewall must be maintained *wherever dragging exists*. Movable Freeplay figures now ship for puzzles with `constructFrom` (`MovableFigure.tsx`), and dragging there is exploratory only — the verifier still uses sampled realizations, not the live board (`movableFigure.ts:16-18`). That separation is correct and must be preserved: the moment "I dragged it and it held" can satisfy the checker, the firewall is breached.

### 3.4 Withholding hints and the auto-solver (Freeplay)

**(i) As built.** No learner-facing hints or solver ship; `deriveAll()` exists but is dev-only (`verify.ts:286-318`; `DevPanel.tsx`, gated by `import.meta.env.DEV`). Hints/scoring are documented P3 non-goals (`docs/PRD-competitive-freeplay.md:35-36`).

**(ii) Justification.** Productive failure / problem-solving-then-instruction beats instruction-first by g ≈ 0.36 (up to ≈ 0.58 at high design fidelity) and especially for *conceptual knowledge and transfer* (Sinha & Kapur, 2021). The ITS hint literature is sharply corroborating on the downside: across 999 students, *premature* and *superficial* hint use were **consistently negatively associated with learning, worst for low-prior-knowledge learners** (An, …, Stamper, 2026, LAK). A one-click "show me" trains help-abuse and defeats the generation that produces learning.

**(iii) Strength: moderate-to-strong, conditional.** The bet is sound *if and only if* two design conditions hold, and **currently one of them does not**:

**(iv) Boundary conditions — and a real risk.**
- Productive failure requires a **consolidation phase** that builds on the learner's attempt; "struggle without consolidation = unproductive failure" (Sinha & Kapur, 2021; the 2024 contrasting-cases work). Freeplay v1 offers struggle and a binary win, but no expert synthesis of *why the path worked* or *what a stuck learner should have seen*. This is a gap, not a justification (see R5/R6).
- Unmitigated struggle harms motivation, particularly for low-prior-knowledge learners (the "assistance dilemma"; Koedinger & Aleven). The evidence-based resolution is not "add hints" but **layered, reason-level, gated hints that arrive only when struggle turns unproductive** (proactive "HelpNeed" models improved posttest scores specifically for low-proficiency learners; AAAI 2023). So the *defensible* version of this choice is "no *answer-level* hints, ever; reason-level hints, late, and only on detected unproductive struggle" — which is recommendation R6, not the current absolute void.

### 3.5 Error-specific explanations with on-figure overlays (Course)

**(i) As built.** Each wrong answer (and each *specific* wrong MC option) can trigger its own explanation, optionally drawing construction lines/highlights onto the learner's current board (`types.ts:44-54`; `ProblemPlayer.tsx:43-62`; overlay via `useJSXGraph` `applyOverlay`).

**(ii) Justification.** This is *elaborated, diagnostic* feedback (Hattie & Timperley, 2007; Shute, 2008) rather than mere verification, and rendering the explanation **on the figure** respects the *split-attention effect* and *spatial-contiguity principle* (Sweller; Mayer): integrating the justification with the diagram it refers to lowers extraneous load versus a separate legend or text block. Option-specific feedback also enables **misconception-targeted** explanation, which the SE literature flags as especially valuable ("explain why the wrong thing is wrong").

**(iii) Strength: strong** for the mechanism; **under-utilized** in practice — its value scales with how many problems actually author per-option, misconception-specific explanations rather than a single `default_wrong`.

**(iv) Boundary conditions.** None significant; the main risk is authoring laziness (one generic explanation forgoes the diagnostic payoff).

### 3.6 Draggable interactive figures (Course)

**(i) As built.** Problems render draggable JSXGraph constructions with live readouts that update as the figure moves (`useJSXGraph.ts`; `boards.ts` `point`/`readout`); the graded answer is *not* auto-checked on drag — exploration is observational until the learner submits (`ProblemPlayer.tsx`).

**(ii) Justification.** Dynamic geometry environments show a medium-to-large benefit on math achievement — a 2023 meta-analysis (14 studies, 1,334 participants) reports g ≈ 0.65 — *moderated by topic and duration, and strongest as a short-duration scaffold* rather than a permanent environment. The draggable figure is the *concrete* anchor at the start of a concreteness-fading sequence (Fyfe et al., 2014), letting a learner *see* an invariant (e.g., the inscribed angle stays half the central angle) before formalizing it.

**(iii) Strength: moderate**, and contingent on what comes *after* the dragging.

**(iv) Boundary conditions — important.** The same literature is explicit that (a) the benefit is realized when the concrete representation is **faded to the abstract**, not when learners are stranded on the manipulable toy; and (b) "drag to check" can *reinforce* empirical reasoning and bind knowledge to surface features, harming transfer. The Course currently has **no fading mechanism** — a learner can remain at the concrete stage indefinitely. So the interactive figure is justified as an *opening move* but is not, by itself, a complete instructional sequence (see R4).

### 3.7 The gamification layer: XP-once, milestone achievements, and the *absence* of streaks/leaderboards (Course)

**(i) As built.** XP is awarded on the **first** correct solve of a problem only; reveals earn 0 XP; re-solving a completed problem earns nothing (`recordAttempt.ts:60-65`; `LessonPlayer.tsx:208`). A lesson-completion bonus exists (`recordAttempt.ts:67-77`). Seven **milestone** achievements track cumulative progress and lesson completion (`achievements.ts:15-57`). There are **no streaks, no leagues, no leaderboards, and no Freeplay XP**.

**(ii) Justification.** Self-determination theory and its overjustification corollary are the relevant frame: tangible, *expected, contingent* rewards undermine intrinsic motivation (Deci, Koestner & Ryan, 1999; meta-analytic d ≈ −0.34, strongest for already-interesting tasks), whereas rewards experienced as *informational* — acknowledging competence without controlling behavior — do not. Awarding XP **once**, for a genuine first solve, and **never for reveals or repeats**, keeps the signal informational (a marker of accomplishment) rather than a controlling, grindable currency. Milestone achievements tied to *mastery events* ("complete the inscribed-angle lesson") rather than presence are similarly competence-informational.

Gamification *can* help: education meta-analyses report overall g ≈ 0.53–0.82 on learning outcomes (Huang et al., 2024, *Educ. Inf. Technol.*, SMD = 0.533; the 2024 *BJET* meta-analysis, g = 0.782; the 2023 *Frontiers* meta-analysis, g = 0.822). But the **moderators are the story**, and they favor restraint: effects are larger with **shorter durations**, **four or fewer game elements**, and **cooperation or mixed designs over pure competition**; one large meta-analysis specifically found **progress bars did *not* help** while most other elements did; and gamification reliably suffers a **novelty effect** (engagement gains fade after ~4–6 weeks before a partial "familiarization" recovery; Huang & Hew, 2021). A separate meta-analysis (Huang, Hew et al., 2023, *ETR&D*) found gamification raised intrinsic motivation, autonomy, and relatedness but had **minimal impact on competence** — i.e., it moves engagement more than learning.

**(iii) Strength: the omissions are well-justified; the present positive mechanics are defensible but modest.** Declining to ship streaks and leaderboards is the *evidence-aligned* choice for a product whose brand promise is deep understanding and mistake tolerance:
- **Streaks** demonstrably increase platform *use* and can improve achievement (the Cristia/Cueto/Malamud/Aulagnon 2024 IDB RCT, 60,000 students in Peru, found highlighting streaks raised platform use on the intensive margin and improved endline math achievement vs. control) — but they reward *presence*, are prone to metric-gaming and loss-aversion dark patterns, and the RCT's achievement result rested on a small endline sample (~1,500) with non-significant differences between treatment arms. Streaks are a *retention* feature with a *contingent* learning benefit, not a learning mechanic.
- **Leaderboards** can satisfy competence/relatedness (Sailer et al., 2017) but harm low-ranked learners (embarrassment; reduced satisfaction; Bai et al., 2020) and can suppress the willingness to attempt hard problems and tolerate mistakes — directly at odds with the product's reason-grading, struggle-first ethos.

**(iv) Boundary conditions.** The current design under-uses the *competence/mastery* channel that SDT says is the safe one. The right expansion is not streaks/leaderboards but **mastery-based progress signals** and **autonomy support** (choice of path), discussed in R7. Also note: Freeplay currently has *no* progress signal at all, which under-rewards its hardest, highest-value work.

### 3.8 The minimal productive-struggle gate: reveal only after an attempt (Course)

**(i) As built.** "Reveal answer" appears only after ≥1 attempt (`ProblemPlayer.tsx:241`); MC is multi-try with no penalty (`types.ts:3`); revealing marks the problem solved but yields 0 XP (`ProblemPlayer.tsx:71-77`; `LessonPlayer.tsx:208`).

**(ii) Justification.** Forcing at least one genuine attempt before the answer is available is a small, sound application of productive failure / the generation effect (Kapur; Slamecka & Graf, 1978): even a failed first attempt primes the subsequent instruction. Zero-penalty multi-try supports *mastery-learning* iteration (Bloom, 1984) and reduces evaluation anxiety, encouraging risk-taking.

**(iii) Strength: directionally correct but minimal.** One attempt is a low bar, and because the post-correct explanation is skippable (3.9 / §4), the "generation → consolidation" loop is only half-closed.

**(iv) Boundary conditions.** Productive struggle needs *time-boxing and a success state for effort* to avoid frustration; the current gate has neither an upper bound nor a "you gave it a real shot" affordance.

### 3.9 Sequencing: linear order, sequential lesson lock, completion = all-problems (Course)

**(i) As built.** Lessons are a fixed ordered array; lesson *N* is locked until lesson *N−1* is completed (`CourseMap.tsx:45-48`). Within a lesson the learner moves forward/back freely and resumes at a bookmark or first-unsolved problem (`LessonPlayer.tsx:29-50`). "Completion" = every current problem solved (`recordAttempt.ts:67-78`); adding problems reopens a completed lesson (`reconcile.ts:23-24`).

**(ii) Justification.** A prerequisite ordering reflects the genuine conceptual dependency chain of the curriculum (you need inscribed-angle before cyclic quadrilaterals) and is consistent with *mastery learning's* "don't advance until the prerequisite is met" principle (Bloom, 1984). Free intra-lesson navigation supports autonomy (SDT).

**(iii) Strength: adequate**, but the gating is *coarse* — it is **completion-gated, not mastery-gated**. Solving each problem once (possibly after a reveal on a sibling problem) unlocks the next lesson regardless of whether the skill is durable.

**(iv) Boundary conditions.** True mastery learning conditions advancement on a *demonstrated* criterion (often a fresh assessment), not on having-seen-each-item-once. Combined with the absence of spaced re-test (§4), "completed" currently certifies *exposure*, not *retention* — exactly the illusion-of-competence trap (Koriat & Bjork, 2005). Tightening this is R3/R7.

---

## 4. Gaps: where the design diverges from the evidence

These are ordered by expected learning impact. Each names the missing mechanism, the evidence it forgoes, and the current code reality.

### Gap 1 — No spaced retrieval / review queue (highest impact)
The spacing effect is among the most robust results in all of learning science (Cepeda, Pashler, Vul, Wixted & Rohrer, 2006: 317 experiments; optimal gap scales with retention interval, Cepeda et al., 2008). The app **captures** the data needed (`problemStats`: attempts, time, `lastMistakeId`; `recordAttempt.ts:49-57`) but **never resurfaces** anything; "Review lesson" is a manual revisit (`Dashboard.tsx`), and spaced repetition is an *unchecked* roadmap item (`docs/ROADMAP.md:137-142`). A solved problem is solved forever. This is the single largest gap between the product and the evidence, and the data plumbing is already half-built.

### Gap 2 — No interleaving; practice is blocked by topic
Interleaving problem *types* so the learner must *choose* the strategy beats blocked practice on delayed tests by large margins in math (Rohrer, Dedrick & Burgess, 2014, d ≈ 1.05; Rohrer et al., 2020 RCT, d ≈ 0.83, positive across all 15 teachers). The benefit is largely a **discrimination** effect — and "which technique fits this configuration?" *is* the central skill of olympiad geometry. The Course presents each lesson as a topic block with no mixed review and no "name the approach before solving" gate. The product is therefore optimized against the very skill it most needs to teach.

### Gap 3 — The post-success consolidation moment is skippable
On a correct answer, `solutionText` appears inline alongside an immediately-available "Continue"/"Finish lesson" button (`ProblemPlayer.tsx:106-112, 249-255`); there is no separate, gated consolidation step and no dwell/acknowledgement requirement. Concreteness fading and self-explanation research locate much of the transfer payoff in the *transition from the worked instance to the principle* — and the project's own `BRAINLIFT.md` (SPOV-5) already names this as Brilliant's fatal flaw ("the best habit is reading the explanation when you're right — and almost nobody does"). The clone currently reproduces the flaw.

### Gap 4 — No concreteness fading; learners can live on the draggable figure
The transfer benefit of dynamic geometry is realized when the concrete representation is *faded* to iconic and then symbolic (Fyfe et al., 2014); stranding learners at the concrete stage is the documented failure mode, and "drag to check" can entrench empirical reasoning. The Course has draggable figures (good opening) but no mechanism that *removes* the manipulable scaffold and requires reasoning on a static/abstract representation as a concept matures.

### Gap 5 — Multiple-choice recognition is the dominant Course modality
~27 of 39 problems are multiple-choice (recognition); ~11 algebraic and ~3 geometric (generation). Recognition and production are distinct knowledge components, and fluency at *selecting* a correct answer does not compose into the ability to *generate* an argument (ICAP Active vs. Constructive; transfer-specificity). The Course thus trains a different competence than Freeplay assesses, with no bridge between them.

### Gap 6 — Unscaffolded cliff from Course into Freeplay; no comprehension track; no faded worked proofs
Proof *comprehension/validation* and proof *construction* are empirically separable skills (the 2025 two-factor study; r ≈ .85 but distinct), and CLT says novices acquire complex schemas better from *worked and completion problems* than from solving cold. Freeplay drops the learner onto a blank proof with neither (a) prior proof-*reading* tasks ("order these scrambled steps," "find the unjustified line") nor (b) partially-completed proofs to finish. The "no hints" stance (3.4) compounds this: struggle is offered without the worked models or consolidation that make struggle productive.

### Gap 7 — No metacognitive calibration anywhere
Nothing in either mode asks the learner to predict performance and then confronts prediction with outcome. The illusion of competence — driven by in-the-moment fluency — is precisely what testing is supposed to puncture (Koriat & Bjork, 2005; Roediger & Karpicke, 2006). Worse, completion-gated progress and (if added naively) any "mastery %" based on *first-try, in-session* success would actively *manufacture* the illusion.

### Gap 8 — No adaptivity / mastery-driven fading
Difficulty tags exist for Freeplay puzzles but are display-only (`FreeplayList.tsx:40-43`); the Course is a flat sequence with no per-skill mastery estimate. CLT's expertise-reversal effect means a *static* level of scaffolding is wrong for every learner who is not exactly average: strong learners are slowed by support they don't need, weak learners overloaded by its absence. Fading should be driven by a per-skill mastery estimate, which does not exist.

---

## 5. Prioritized, evidence-based improvements

Prioritization weighs **expected learning impact × evidence strength** against **build cost** (leveraging existing code). Each recommendation names the mechanism, the evidence, the concrete change with code anchors, and the principal pitfall to avoid.

| # | Recommendation | Impact | Evidence strength | Est. effort |
|---|----------------|--------|-------------------|-------------|
| R1 | Spaced variant re-test queue (two tracks) | High | Very strong | Medium |
| R2 | Interleaved "mixed review" with a *name-the-approach* gate | High | Strong | Medium |
| R3 | Make post-success consolidation unskippable + a retrieval gate | High | Strong | Low |
| R4 | Concreteness fading per concept (concrete→static→symbolic) | Med-High | Strong | Medium |
| R5 | Worked-example → completion → faded scaffold + proof-comprehension track | High | Strong | Med-High |
| R6 | Layered, reason-level, gated hints triggered by *unproductive* struggle | Med-High | Strong | Medium |
| R7 | Mastery-based progress signal (replace exposure-gating); Freeplay competence signal | Medium | Strong | Medium |
| R8 | Metacognitive calibration loop + learning-outcome telemetry | Medium | Strong | Low-Med |

### R1 — A spaced, variant-based re-test queue (the single highest-leverage change)
**Mechanism & evidence.** Distributed practice (Cepeda et al., 2006) with retention-interval-scaled gaps (Cepeda et al., 2008). Use **two tracks**, because olympiad geometry is high-element-interactivity (§0): *Track A — component cards* (theorem statements, configuration → "what's the move" cues) scheduled by an off-the-shelf **FSRS** scheduler (FSRS needs ~20–30% fewer reviews than SM-2 for equal retention and lets you target a retention rate); *Track B — problem variants* that **regenerate** a previously solved problem with new givens/relabeled vertices (never the identical item, to force genuine retrieval rather than answer-recall) on conservative expanding gaps (~2d → 9d → 3wk).
**Build.** The data substrate exists (`problemStats`, `recordAttempt.ts:49-57`; `ProgressSnapshot`). The draggable-figure engine (`boards.ts`, `useJSXGraph.ts`) already parametrizes constructions, so variant regeneration is largely a matter of resampling the free points and re-deriving the target. Surface a "Due for review" entry on the `Dashboard`. Map the grade signal (solved unaided / solved after reveal / failed) onto FSRS ratings rather than a binary.
**Pitfall.** Do **not** put whole multi-step proofs into a verbatim flashcard queue (that trains rote recall of *that* proof). Cap daily due-items to prevent backlog abandonment.

### R2 — Interleaved "mixed review" with a name-the-approach gate
**Mechanism & evidence.** Interleaving trains *discrimination* — the core olympiad skill — with large delayed-test effects (Rohrer et al., 2014, 2020).
**Build.** Add a `technique`/`configuration` tag to the `Problem` model (`src/lib/content/types.ts:56-67`) — e.g. `inscribed-angle`, `power-of-a-point`, `similar-triangles`, `angle-chase`. Introduce a "Mixed review" mode that draws across lessons and, *before* showing answer options, asks **"what's the approach?"** (an MC over technique tags). This isolates and trains strategy selection. Make interleaved+spaced review the default *after* a topic is first acquired in blocked form.
**Pitfall.** Interleaving *feels* worse and lowers in-session accuracy; learners and instructors routinely misjudge it (the metacognitive-illusion problem, §R8). Mitigate by (a) brief blocked acquisition first — you cannot discriminate techniques you have not each learned — and (b) telling users explicitly "this feels harder on purpose," paired with the delayed-retention dashboard from R8. Tags must be fine-grained enough to create genuine "which one?" decisions.

### R3 — Make the post-success consolidation unskippable, and gate the explanation behind a retrieval attempt
**Mechanism & evidence.** The transition from instance to principle is where transfer is won (Fyfe et al., 2014; self-explanation, Bisra et al., 2018); the project's own SPOV-5 names skippable explanations as the cardinal sin. Gating the explanation behind a *generation* attempt operationalizes the testing effect (transfer moderated by *elaboration*; Pan & Rickard, 2018, +d ≈ 0.23 for explain-why prompts).
**Build (low cost).** In `ProblemPlayer.tsx` (the correct/`solved` branch, `106-124, 249-255`): before revealing `solutionText`/the "Continue" button, require a lightweight **one-line "why does this work / what cue triggered the move?"** prompt (free-text logged, or a constrained menu selection to stay auto-checkable). On correct answers especially, present the consolidation as its own step rather than a banner adjacent to "Continue." This is a small, contained UI change with outsized expected payoff.
**Pitfall.** Keep the prompt *structured/constrained* and *sparing* (high-value moments, not every trivial step) — unstructured "explain your thinking" boxes get gamed, and over-prompting adds extraneous load (Rittle-Johnson et al., 2017; the Barbieri et al. 2023 negative-moderator caution).

### R4 — Implement concreteness fading per concept
**Mechanism & evidence.** Concrete → iconic → symbolic *fading* beats concrete-only or abstract-only for transfer (Fyfe et al., 2014); dynamic geometry helps most as a *time-limited scaffold*, not a permanent crutch (2023 GeoGebra meta-analysis, g ≈ 0.65).
**Build.** For each concept, sequence problems so the *draggable* figure (discover the invariant) is followed by a *static labeled* diagram (reason without dragging) and then a *symbolic* statement/algebraic item. The `Lesson`/`Problem` content model already supports per-problem board configs; this is primarily a *content-authoring discipline* plus a flag to lock dragging on later problems in a concept. In Freeplay, the empirical-proof firewall (3.3) is the proof-mode instance of this principle — keep dragging exploratory only.
**Pitfall.** The failure mode is never actually fading (learners love the toy); ensure each concept's later items genuinely remove the manipulable affordance.

### R5 — Build the Course→Freeplay bridge: worked/completion proofs and a comprehension track
**Mechanism & evidence.** Worked-example effect in math g ≈ 0.48 (Barbieri et al., 2023); completion-problem and faded-worked-example effects (van Merriënboer; Renkl & Atkinson); proof comprehension and construction are separable skills that should be taught separately (2025 two-factor study).
**Build.** (a) Add **proof-comprehension tasks** before construction: "order these scrambled asserted facts into a valid chain," "which prior facts does line 4 depend on?", "find the unjustified step." The DDAR data structures (`proof.ts`, `verify.ts`) already encode exactly the dependency graph these tasks need. (b) Seed the first puzzle of each new theorem family with a **partially completed proof** (givens + first 1–2 asserted-and-cited facts pre-filled) for the learner to finish — the completion-problem effect applied to the highest-load activity. Fade the pre-fill across the family.
**Pitfall.** Do not also force a separate self-explanation prompt on pre-filled lines (redundancy backfire, 3.1/§Barbieri). Fade by *per-skill* mastery, not global level (expertise reversal).

### R6 — Replace the absolute "no hints" with layered, reason-level, struggle-triggered hints
**Mechanism & evidence.** Productive failure needs *consolidation* and a frustration relief valve; the harm comes from *answer-level, premature, superficial* hints, not from help per se (An/Stamper, 2026); proactive "HelpNeed" hints helped low-proficiency learners specifically (AAAI 2023).
**Build.** A four-level ladder, defaulting to the weakest, gated so the bottom level requires prior effort: **L1 orienting** ("which pair of angles here is equal — and why?") → **L2 strategic** ("work backward from the goal: what would let you conclude it?") → **L3 specific** ("consider the vertical angles at P") → **L4 bottom-out** (next fact + citation, only after a genuine attempt). The dev-only `deriveAll()` (`verify.ts:286-318`) is the natural engine for reason-level hints — promote it behind effort gates rather than exposing a one-click solver. Trigger *proactive* L1 nudges on detected unproductive struggle (repeated invalid citations, long idle).
**Pitfall.** Never make the answer the cheapest path; tie hints to the learner's *current* asserted-fact graph (generic hints are weak). Preserve the empirical-proof firewall in hint text.

### R7 — Move from exposure-gating to mastery signals; give Freeplay a competence signal
**Mechanism & evidence.** Mastery learning (Bloom, 1984); SDT says the *competence* channel is the safe motivational lever, unlike controlling rewards/competition (Deci, Koestner & Ryan, 1999).
**Build.** Define "mastery" of a skill by **delayed, unaided** success (ties to R1), not first-in-session solve, and surface a per-skill "solid vs. fragile" map rather than a single completion %. Tighten lesson unlock (`CourseMap.tsx:45-48`) toward a mastery criterion rather than all-items-seen. Give Freeplay a *non-competitive* competence signal (e.g., theorems-proven, configurations-mastered) — and, if elegance scoring (P3) ships, stage it as **correctness-first, elegance-later** so it doesn't punish the messy valid reasoning beginners need.
**Pitfall.** Do **not** reach for streaks/leaderboards (3.7): they optimize presence and harm mistake tolerance. Base any "mastery %" on delayed performance or you manufacture the illusion of competence.

### R8 — Add a metacognitive calibration loop and learning-outcome telemetry
**Mechanism & evidence.** Predict→attempt→compare dismantles the illusion of competence (Koriat & Bjork, 2005); delayed judgments of learning are far better calibrated than immediate ones.
**Build (low cost).** Before a (review) problem, ask "how confident are you that you can solve this unaided? (0–100%)"; after the machine-checked result, show predicted-vs-actual and accumulate a personal calibration curve. Separately — and prerequisite to *measuring* every claim in this document — instrument **delayed-retention outcomes** (variant re-test success over time), not just completion, so the team can A/B these recommendations rather than trust external effect sizes.
**Pitfall.** Close the loop (a confidence rating with no feedback is noise); watch for over-correction into underconfidence; and explicitly reframe desirable difficulty ("struggling on a retest is the signal the system needs"), or users will optimize for in-the-moment ease and rate the harder, better modes poorly.

### Explicitly *not* recommended
- **Streaks and leaderboards** — see 3.7; presence-optimizing and corrosive to the product's mistake-tolerant, reason-grading identity. The Cristia et al. (2024) streak benefit is a *usage* result with a contingent, weakly-powered achievement signal.
- **Growth-mindset messaging as a learning lever** — the intervention literature is, on the best current evidence, weak and contested: Sisk et al. (2018) overall d ≈ 0.08; Macnamara & Burgoyne (2022) d ≈ 0.05, non-significant after publication-bias correction and null among the highest-quality studies. The large NSLM RCT (Yeager et al., 2019) found ~0.10 SD gains *only* for lower-achieving students *and only* in supportive contexts. Do not build core mechanics on it; non-judgmental, competence-supportive copy (already the app's tone) is the defensible version.

---

## 6. Synthesis: the research-backed learning arc this product should embody

The recommendations above are not a grab-bag; they assemble into a single per-concept sequence, each surface mapped to the technique it carries and to the code that would host it:

1. **Invent-first episode** (productive failure, §3.4/R6) with **contrasting cases** (variation theory, R4) — generativity over correctness, time-boxed, with a "you gave it a shot" success state.
2. **Consolidation** built on the learner's own attempt → introduce the canonical method (closes the PF loop; R3/R5).
3. **Worked example on a concrete, draggable figure** (CLT + dynamic geometry, §3.6/R4/R5) — integrated labels, low extraneous load.
4. **Structured self-explanation / proof-comprehension tasks** (§3.1/R3/R5) — menu-based; reorder-the-proof, find-the-flaw.
5. **Completion → backward-faded problems** on increasingly **static/abstract** figures (concreteness fading + scaffold fading by per-skill mastery; R4/R5/R7).
6. **Freeplay construction** — assert-and-cite (Constructive), with **layered reason-level hints** (R6), the **empirical-proof firewall** and **circularity detection** the citation graph already affords (§3.3), all faded by per-skill mastery (R7).
7. **Spaced, interleaved, variant re-test** of everything above (R1/R2), with a **calibration loop** (R8) defining mastery by *delayed, unaided* success.

**The two moves no recall-based competitor can copy** — and which the product should therefore build everything around — are already half-present in the codebase: (1) the **assert-and-cite** mechanic is a *machine-checkable structured self-explanation*; (2) the **verifier can enforce the deductive-vs-empirical distinction and detect circular reasoning** via the citation graph. The roadmap above is, in effect, the project of extending those two strengths backward into the Course and forward into spaced, calibrated mastery.

---

## 7. References

Effect sizes are Hedges's *g* / Cohen's *d* unless noted, and are heavily moderated; use them to prioritize, not to predict.

**Memory & practice**
- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*. (Testing effect; illusion of competence.)
- Rowland, C. A. (2014). The effect of testing versus restudy on retention: a meta-analytic review. *Psychological Bulletin*. https://doi.org/10.1037/a0037559 (g ≈ 0.50)
- Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). Rethinking the use of tests: a meta-analysis of practice testing. *Review of Educational Research*. https://doi.org/10.3102/0034654316689306 (g ≈ 0.61–0.70)
- Pan, S. C., & Rickard, T. C. (2018). Transfer of test-enhanced learning: meta-analytic review. *Psychological Bulletin*. https://pubmed.ncbi.nlm.nih.gov/29733621/ (transfer d ≈ 0.40; elaboration +0.23)
- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: a review and quantitative synthesis. *Psychological Bulletin*. https://doi.org/10.1037/0033-2909.132.3.354
- Cepeda, N. J., et al. (2008). Spacing effects in learning: a temporal ridgeline of optimal retention. *Psychological Science*. https://doi.org/10.1111/j.1467-9280.2008.02209.x
- Rohrer, D., Dedrick, R. F., & Burgess, K. (2014). The benefit of interleaved mathematics practice. *Psychonomic Bulletin & Review*. https://doi.org/10.3758/s13423-014-0588-3 (d ≈ 1.05)
- Rohrer, D., Dedrick, R. F., Hartwig, M. K., & Cheung, C.-N. (2020). A randomized controlled trial of interleaved mathematics practice. *Journal of Educational Psychology*. (d ≈ 0.83)
- Hattie, J., & Timperley, H. (2007). The power of feedback. *Review of Educational Research*. https://doi.org/10.3102/003465430298487
- Shute, V. J. (2008). Focus on formative feedback. *Review of Educational Research*. https://doi.org/10.3102/0034654307313795
- Wisniewski, B., Zierer, K., & Hattie, J. (2019). The power of feedback revisited. *Frontiers in Psychology*. https://doi.org/10.3389/fpsyg.2019.03087
- Koriat, A., & Bjork, R. A. (2005). Illusions of competence in monitoring one's knowledge. *JEP:LMC*. (Foresight bias.)
- FSRS — Free Spaced Repetition Scheduler. https://github.com/open-spaced-repetition/fsrs4anki

**Cognitive load, worked examples, fading**
- Sweller, J. (1988, 2011). Cognitive load theory. (Worked-example, split-attention, expertise-reversal effects.)
- Barbieri, C. A., Miller-Cotto, D., Clerjuste, S. N., & Chawla, K. (2023). A meta-analysis of the worked examples effect on mathematics performance. *Educational Psychology Review*, 35:11. (g ≈ 0.48; SE-prompt negative moderator.)
- Chen, O., Castro-Alonso, J. C., Paas, F., & Sweller, J. (2018). Undesirable difficulty effects in the learning of high-element-interactivity materials. *Educational Psychology Review*. https://pmc.ncbi.nlm.nih.gov/articles/PMC6099118/
- Huang, R., et al. (2023). Retrieval practice and worked examples in math problem solving. *Frontiers in Psychology*. https://www.frontiersin.org/articles/10.3389/fpsyg.2023.1093653/full

**Productive failure, self-explanation, ICAP, scaffolding**
- Kapur, M. (2008, 2016). Productive failure.
- Sinha, T., & Kapur, M. (2021). When problem solving followed by instruction works. *Review of Educational Research*, 91(5). https://doi.org/10.3102/00346543211019105 (g ≈ 0.36–0.58)
- Bisra, K., Liu, Q., Nesbit, J. C., Salimi, F., & Winne, P. H. (2018). Inducing self-explanation: a meta-analysis. *Educational Psychology Review*, 30(3). (g ≈ 0.55)
- Rittle-Johnson, B., Loehr, A. M., & Durkin, K. (2017). Promoting self-explanation to improve mathematics learning: a meta-analysis. *ZDM*, 49(4). https://eric.ed.gov/?id=EJ1149060
- Chi, M. T. H., & Wylie, R. (2014). The ICAP framework. *Educational Psychologist*, 49(4).
- An, S., …, Stamper, J. (2026). Revisiting the hint button: consistent negative associations between unproductive hint use and learning. *LAK26*. https://dl.acm.org/doi/10.1145/3785022.3785040
- Koedinger, K. R., & Aleven, V. (2007). Exploring the assistance dilemma. *Educational Psychology Review*.

**Concreteness fading, dynamic geometry, variation**
- Fyfe, E. R., McNeil, N. M., Son, J. Y., & Goldstone, R. L. (2014). Concreteness fading in mathematics and science instruction. *Educational Psychology Review* / *Learning and Instruction*. https://doi.org/10.1016/j.learninstruc.2014.06.004
- Marton, F. (2015). *Necessary Conditions of Learning* (variation theory).
- (2023). Dynamic visualization by GeoGebra for mathematics learning: a meta-analysis. *JRTE*. https://doi.org/10.1080/15391523.2023.2250886 (g ≈ 0.65)
- Bjork, R. A., & Bjork, E. L. (2011). Making things hard on yourself, but in a good way: desirable difficulties.

**Proof pedagogy**
- Stylianides, A. J., & Weber, K. Research on the teaching and learning of proof. (Compendium chapter.)
- (2025). Proof comprehension, validation, and construction: all the same or different skills? *Int. J. Sci. Math. Educ.* https://doi.org/10.1007/s10763-025-10621-3
- ZDM (2023) systematic review of proof; misconception catalogue (JCVE, 2024) https://doi.org/10.46303/jcve.2024.13

**Motivation, gamification, mastery, mindset**
- Deci, E. L., Koestner, R., & Ryan, R. M. (1999). A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation. *Psychological Bulletin*, 125(6). (d ≈ −0.34 for controlling rewards.)
- Ryan, R. M., & Deci, E. L. (2000). Self-determination theory. *American Psychologist*.
- Sailer, M., Hense, J. U., Mayr, S. K., & Mandl, H. (2017). How gamification motivates: needs satisfaction. *Computers in Human Behavior*.
- Huang, R., Hew, K. F., et al. (2023). Gamification enhances intrinsic motivation, autonomy, relatedness, but minimal impact on competence: a meta-analysis. *ETR&D*. https://doi.org/10.1007/s11423-023-10337-7
- Huang, R., et al. (2024). Can gamification enhance online learning? a meta-analysis. *Education and Information Technologies*, 29(4). (SMD ≈ 0.533.)
- (2024). Impact of gamification on academic performance: meta-analysis 2008–2023. *BJET*. https://doi.org/10.1111/bjet.13471 (g ≈ 0.782)
- (2023). Effectiveness of gamification: a meta-analysis. *Frontiers in Psychology*. https://doi.org/10.3389/fpsyg.2023.1253549 (g ≈ 0.822)
- Huang, B., & Hew, K. F. (2021). Gamification suffers from the novelty effect but benefits from the familiarization effect. *IJET in Higher Education*. https://doi.org/10.1186/s41239-021-00314-6
- Aulagnon, R., Cristia, J., Cueto, S., & Malamud, O. (2024). Streaking to success: the effects of highlighting streaks on student effort and achievement. *IDB Working Paper* WP-1566 / NBER w34173. https://doi.org/10.18235/0012912
- Bloom, B. S. (1984). The 2-sigma problem. *Educational Researcher*.
- Csikszentmihalyi, M. (1990). *Flow*.
- Sisk, V. F., Burgoyne, A. P., Sun, J., Butler, J. L., & Macnamara, B. N. (2018). To what extent and under which circumstances are growth mind-sets important to academic achievement? *Psychological Science*. https://doi.org/10.1177/0956797617739704 (d ≈ 0.08)
- Macnamara, B. N., & Burgoyne, A. P. (2022). Do growth mindset interventions impact students' academic achievement? *Psychological Bulletin*. (d ≈ 0.05; null after bias correction.)
- Yeager, D. S., et al. (2019). A national experiment reveals where a growth mindset improves achievement. *Nature*. https://doi.org/10.1038/s41586-019-1466-y

*This review audits the product as built on 2026-06-28 and is intended to be revised as mechanics ship. Effect sizes are summary estimates; treat moderators as primary.*

