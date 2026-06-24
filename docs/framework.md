================================================================================
THE LENS
A universal framework for understanding, predicting, and influencing systems
Final version (v2). Rebuilt from the original 18-concept draft after an
11-discipline critique, an independent re-analysis, and targeted research.
================================================================================

--------------------------------------------------------------------------------
0. WHAT THIS IS (AND WHAT IT IS NOT)
--------------------------------------------------------------------------------

This is a reusable procedure for looking at anything — a person, a company, an
economy, a city, an ecosystem, an AI, a relationship, a career, a civilization —
and asking, in a disciplined order:

    What is it?  -  Where is it going?  -  Can I move it?  -  Should I?

It is NOT a theory of everything, and it does not claim that reality "is" made of
systems and information. Those are chosen representations — useful lenses, not
properties of the world. The framework's first commitment is to never forget
this. A worldview that claims to be universal while hiding its own bias is, by
the No-Free-Lunch theorem, lying about being universal: no single set of
assumptions is good across all problems, so any lens that doesn't state where it
breaks is guaranteed to fail silently somewhere.

So this is a tool you pick up — and, crucially, put down. Most of wisdom is
knowing which to do when.

The single biggest correction over the original draft: that draft was an
excellent vocabulary for describing MOTION and STRUCTURE, but it was mislabeled
as a tool for PREDICTION and CONTROL. Describing how something moves
(correlation, trajectory) is a categorically weaker act than knowing what
happens if you push it (causation, intervention). Most of the rebuild is about
keeping those two acts apart and never letting the first masquerade as the
second.


--------------------------------------------------------------------------------
1. THE SPINE (the one-paragraph version)
--------------------------------------------------------------------------------

Model anything as a CONTROLLED FLOW ON A STATE SPACE: a system whose condition is
captured by a STATE (the minimal information that makes the future independent of
the past), which moves under a FLOW (a rule that updates the state), across a
LANDSCAPE whose shape (attractors, basins, boundaries) can itself reorganize
(bifurcations). You touch it only through limited INPUTS and you see it only
through partial MEASUREMENTS. Read this object along two INDEPENDENT axes — what
you can KNOW (observability) and what you can MOVE (controllability) — and route
the whole analysis up front by two questions: how much does the system react to
being modeled (reflexivity), and what kind of cause-effect domain is it in
(Cynefin). Bolt four modules onto this chassis: INFORMATION/ENTROPY (the currency
of knowing), REGULATION (to control well is to model well), GAME THEORY (the
multi-agent generalization of "optimization"), and THERMODYNAMICS/EVOLUTION (all
persistent order is rented — paid for by dissipating a gradient or by selection).
Wrap everything in a value-and-epistemics floor, because the analyst is never
outside the system being analyzed.


--------------------------------------------------------------------------------
2. THE THREE ACTS AND THE FIRELINE BETWEEN THEM
--------------------------------------------------------------------------------

Almost every error in the original framework came from blurring three different
kinds of statement. Keep them physically separate.

  SEEING (observational):    P(Y | X)        "what goes with what / where it heads"
  DOING (interventional):    P(Y | do X)     "what happens if I push X"
  BEING-SEEN (reflexive):    the system reacts to the model itself

Pearl's Causal Hierarchy: you cannot answer a doing-question with seeing-data and
seeing-methods. State variables, flows, correlations, and forecasts all live on
the SEEING rung. Every goal under "intervention" and "what is invariant" lives on
a higher rung and requires imported causal structure or an actual experiment.

THE FIRELINE: no claim of the form "X is a leverage point" / "if we change X then
Y" is admissible until you have an identification argument — you have blocked the
confounders (back-door), found an instrument, or run the experiment. The most
common and most lethal default error in systems thinking is confounding wearing
the costume of a feedback loop: two things move together, you draw an arrow, call
it a lever, push it, and nothing happens (or the reverse happens) because a third
thing drove both.


--------------------------------------------------------------------------------
3. THE ARCHITECTURE — 6 dependency-ordered layers + 2 wrappers
--------------------------------------------------------------------------------

You cannot choose dynamics before representation, cannot infer before you have
dynamics, cannot act before you can both infer and establish causation. Two
layers (Stance and Routing) wrap the rest because they condition whether the
machinery is even valid here.

........................................................................
LAYER 0 — STANCE  (conditions on YOU, the analyst — pass these gates first)
........................................................................
  * Map / Territory + your inductive bias. Every concept below is a chosen
    representation. State the structural prior that makes your lens work here,
    and therefore where it fails. (Cut the metaphysical bet "information is more
    fundamental than matter" — keep it only as a sometimes-useful stance.)
  * Falsifiability + out-of-sample test. Before using any framing, say what it
    FORBIDS and how it would be scored on data/futures it has not seen.
    Explaining the past is memorization, not understanding.
  * Model pluralism. Carry several incompatible maps at once; they agree on what
    you've seen and diverge exactly where you intend to intervene. A single
    causal diagram is a methodological error, not a finding.
  * Value-ladenness. Choosing the boundary, choosing what counts as "state" vs
    "noise", and choosing WHOSE objective is optimized are moral acts wearing the
    costume of observation. Plural goods don't reduce to one number; some
    trade-offs are tragic, not solvable.
  * Meaning =/= information. Shannon bits measure surprise, not significance. A
    high-entropy signal can be meaningless; one bit ("the CEO resigned") can be
    the whole story. In human systems, meaning is assigned by an interpreter and
    is causally primary.

........................................................................
LAYER 1 — ROUTING  (the type-check that decides which tools apply)
........................................................................
Two questions, asked BEFORE any modeling. Together they pick the toolkit.

  (a) REFLEXIVITY — does the system read, anticipate, and react to your model of
      it? This is a SPECTRUM, not a switch (Beinhocker's refinement of Soros):
      the same system is more or less reflexive under different conditions.
        - Low end (physics, ecology, engineered systems): run the clean
          dynamical/statistical machinery at full confidence.
        - High end (people, firms, markets, optimizing AIs, civilizations): the
          machinery still applies but with three forced corrections —
            1. your forecast is itself an intervention (Soros, Lucas critique);
            2. your "state variables" are interpreted meanings, not readouts
               (a wink is not a twitch; "shared sacrifice" /= identical pay cut);
            3. your metric gets gamed the moment it becomes a target (Goodhart).
      Goodhart / Lucas / Soros are not edge cases here — they are the DEFAULT,
      and they invalidate observationally-fitted dynamics precisely where you
      intend to act. The prized "same math from cell to civilization"
      scale-invariance breaks at exactly the point in that chain where the system
      starts modeling you back. The boundary, not the invariance, is the
      load-bearing fact.

  (b) DOMAIN (Cynefin) — what is the nature of cause and effect here, and
      therefore what is the RIGHT WAY TO ACT? (This fills the framework's biggest
      hole: which method to apply, and when to stop modeling.)
        - CLEAR: cause-effect obvious & stable.   Sense -> categorize -> respond.
          Use best practice. (Risk: complacency; the cliff into Chaos.)
        - COMPLICATED: knowable with analysis.     Sense -> analyze -> respond.
          Use experts / engineering. Good practice, multiple right answers.
        - COMPLEX: cause-effect only clear in hindsight (most human/social/market
          systems). Probe -> sense -> respond. Run small SAFE-TO-FAIL experiments;
          amplify what works. Do NOT analyze your way to the answer first; the
          act of probing is how you learn the landscape.
        - CHAOTIC: no discernible cause-effect (crisis). Act -> sense -> respond.
          Stabilize FIRST, theorize later.
        - DISORDER/CONFUSION (the center): you don't yet know which domain you're
          in — the most dangerous place. Break the situation into parts and route
          each to a domain.
      The deep point: the catastrophic mistake is using the wrong domain's method
      (e.g. applying best-practice playbooks or elaborate up-front analysis to a
      Complex system, where only probing reveals the answer).

  Agency / moral standing is a TYPE set here, not a variable: a system that can
  read your model can refuse, re-optimize, or sabotage — its resistance is
  signal, not noise — and it has standing that turns "influence" into either
  collaboration-with-consent or manipulation.

........................................................................
LAYER 2 — REPRESENTATION  (what the system even is — choosing coordinates is the
                           whole game, and it is logically prior to measuring)
........................................................................
  * STATE as a minimal sufficient (Markov) statistic, living in a STATE SPACE.
    (Merges the old "state variables" + "state spaces" — variables are just the
    coordinates of the space.) The real test the original missed: have you chosen
    ENOUGH that the future is conditionally independent of the past given the
    state — i.e. do the dynamics CLOSE? Representation is a learnable, primary
    degree of freedom. Most stuck problems are bad-coordinate problems.
  * COUPLING GRAPH: a directed graph with causal arrow semantics and edge
    capacities. (Merges "networks/structure" + "constraints" — a missing edge IS
    a constraint; the topology IS the feasible set.) An arrow means structural
    dependence, not correlation and not mere "flow." Topology is destiny:
    scale-free hub structure makes systems robust to random failure but fragile
    to targeted attack.
  * SCALE / LEVEL OF DESCRIPTION, earned not assumed. The cell -> organism ->
    firm -> civilization analogy is a FALSIFIABLE operation, licensed only under
    scale separation, near-criticality, or modular near-decomposability — false
    otherwise. Simpson's paradox warns that an effect can reverse sign on
    aggregation, so cross-scale transfer must be justified, not waved.

........................................................................
LAYER 3 — DYNAMICS & LANDSCAPE  (how it moves; where it can reorganize)
........................................................................
  * FLOW / UPDATE RULE (the vector field). (Merges "dynamics" + "flows" +
    "computation" — a dynamical system is a computation iterated; they differ
    only in discrete vs continuous state.) The lone generative primitive of
    motion.
  * LANDSCAPE: attractors, BASINS, and SEPARATRICES. (Merges "attractors" with
    single-agent "optimization" — in a dissipative system the attractor is what
    an effective potential minimizes.) A bare attractor is useless without its
    basin: the live question is never "what is the attractor" but "WHICH BASIN am
    I in, how far is the boundary, and which way is it moving?" Basins erode
    invisibly — the system looks stable right up until it isn't.
  * BIFURCATION / REGIME CHANGE + CRITICAL SLOWING DOWN (the headline addition).
    The landscape itself can discontinuously reorganize as a slow parameter
    crosses a threshold: tipping points, crashes, revolutions, collapse, sudden
    relationship failure. This SUBSUMES "stationarity vs non-stationarity"
    (non-stationarity is just a parameter being dragged toward a bifurcation).
    The one general, near-model-free EARLY-WARNING signal that exists: as a
    system nears a tipping point its variance and autocorrelation rise and it
    recovers from small shocks more slowly. This is the predictive payload the
    vague "forecasting" box never had.
  * SELECTION / EVOLUTION (a second generator, easy to miss). Where there is
    VARIATION + SELECTION + HEREDITY, apparent design and "optimization" emerge
    with no optimizer: markets select firms, training selects weights, culture
    selects memes, the immune system selects antibodies. Crucially, selection
    RESHAPES the landscape over time rather than just descending a fixed one.
    Treat "why does this look optimized?" as a question about what is selecting
    and what is being varied.
  * LOOP STRUCTURE: sign, gain, and DELAY. (Replaces lumped "feedback loops" and
    absorbs "time scales.") Delay-relative-to-gain decides whether a corrective
    loop stabilizes or oscillates into collapse — pushing "harder/faster" on a
    delayed loop DESTABILIZES it.
  * STABILITY WITH MARGIN + HYSTERESIS / IRREVERSIBILITY. Distinguish "currently
    at rest" from "stable with a perturbation budget" (Lyapunov). Hysteresis:
    reversing the cause does NOT reverse the state (trust, reputation,
    extinction). Kills the silent assumption that systems are reversible.

........................................................................
LAYER 4 — INFERENCE, INFORMATION & LIMITS  (what you can know about it)
........................................................................
  * ENTROPY AS THE SINGLE CURRENCY; PROBABILITY AS AN INFORMATION STATE
    (Jaynes / Shannon = Gibbs). (Merges "information theory" + "probability" +
    the inference half of "forecasting.") Probability measures your knowledge,
    not a property of the world; entropy is its scalar summary; max-entropy fixes
    priors from known constraints; information and thermodynamics are one ledger
    (Landauer).
  * BAYESIAN UPDATING + BASE RATES + CALIBRATION (the operational forecasting
    discipline the original lacked entirely). Evidence revises belief by exactly
    its diagnostic weight (likelihood ratio). OUTSIDE VIEW BEFORE INSIDE VIEW:
    reference class first, causal story second. Every forecast is a scored,
    calibrated probability — otherwise it is storytelling. (Tetlock: this is what
    actually predicts well — base rates, frequent small updates, aggregation. The
    same evidence is a warning against grand unified lenses like this one.)
  * MUTUAL INFORMATION + CHANNEL CAPACITY + DATA-PROCESSING INEQUALITY (the
    rigorous replacement for "which variables matter"). The best variable is the
    one with the highest mutual information about the target, reachable within
    capacity. The DPI is a conservation law: no clever downstream pipeline
    recovers signal the upstream channel never carried.
  * HARD LIMITS (a limit layer, not a toolbox — tells you when to STOP modeling):
      - Computational irreducibility: some futures are incompressible; the only
        way to know them is to run them.
      - Undecidability: some properties cannot be decided in advance.
      - Knightian uncertainty vs risk: some situations have NO valid probability.
        Make "I have no valid probability here" a high-status output.
  * ERROR DECOMPOSITION — which statistics are even meaningful:
      - bias (wrong model class -> need more) vs variance (overfit -> need less /
        regularize);
      - FAT TAILS (Extremistan): in fat-tailed domains means and variances are
        mirages; tail exposure is the whole game;
      - ERGODICITY / RUIN (Peters, Taleb): you live ONE trajectory, not the
        ensemble average; an absorbing state (ruin) voids all future
        optimization. The ergodicity check OVERRIDES expected-value optimization
        whenever ruin is possible. Arguably the single most important correction
        for any personal, financial, or civilizational decision.
  * "Emergence" is DISSOLVED here, not used as a primitive: it is the
    compressibility gap between micro and macro descriptions, named by its
    mechanism (phase transition / self-organization / near-decomposable
    hierarchy). "It's emergent" is an excuse, not an explanation.

........................................................................
LAYER 5 — ACTION, CAUSATION & STRATEGY  (changing where it goes — and the ethics)
........................................................................
  * THE DO-OPERATOR + IDENTIFIABILITY GATE (the framework's immune system).
    P(Y | do X) /= P(Y | X). No leverage claim is admissible until the effect is
    shown identifiable. See the Fireline in section 2.
  * STEERABILITY IS INDEPENDENT OF KNOWABILITY (control theory). Predictability
    (observability) and controllability are orthogonal axes. A crash can be
    perfectly forecastable yet uncontrollable by you; resentment highly
    controllable yet unobservable until it bifurcates. The REACHABLE SET — what
    states you can actually drive the system to within your input and time budget
    — is usually a thin sliver. Most goals lie outside it; the honest move is then
    accept-or-exit, not a better controller.
  * MULTI-AGENT EQUILIBRIUM + MECHANISM DESIGN (replaces single-objective
    "optimization" at the base). Systems with more than one optimizing agent rest
    at strategic fixed points (Nash) that are generally NOT the optimum of any
    single objective and are often collectively terrible (commons, prisoner's
    dilemma). "Optimization" is the degenerate one-agent special case. You do not
    durably steer agents by setting variables — they route around you (Goodhart,
    Lucas). You change the PAYOFF and INFORMATION structure so the outcome you
    want becomes self-enforcing. Leverage = the binding constraint with the
    highest shadow price AND an identifiable do-effect.
  * REQUISITE VARIETY + GOOD REGULATOR + VIABILITY (cybernetics). You can only
    regulate variety you can match (Ashby). To regulate well IS to model well —
    "every good regulator must contain a model of the system" (Conant-Ashby),
    which fuses the prediction and intervention pillars. The real target is not a
    value-free attractor but VIABILITY: keeping the ESSENTIAL VARIABLES (the ones
    whose excursion means death) inside survivable bounds. A system can sit on a
    perfectly stable attractor that is lethal.
  * CONVEXITY / OPTIONALITY / ANTIFRAGILITY (the constructive complement to the
    ruin/Knightian limits — what to DO when you can't predict). When the future
    is irreducibly uncertain or fat-tailed, stop trying to forecast the
    trajectory and instead SHAPE YOUR EXPOSURE: cap the downside, keep the upside
    open, hold cheap options, prefer reversible bets and safe-to-fail probes.
    Robust = survives shocks; fragile = broken by them; antifragile = gains from
    them. Position for convexity rather than predicting the path.
  * TRUST / LEGITIMACY (a real variable in human systems, not reducible to
    incentives or information). The SAME intervention from a trusted vs a
    distrusted source produces opposite results. Legitimacy is what lets a
    regulator act without resistance; spend or break it and the whole control
    problem changes character.
  * OBJECTIVE SPECIFICATION AS A MORAL ACT (the normative cap, tying back to
    Layer 0). Every intervention optimizes SOMEONE's objective at someone's cost.
    Optimize a proxy hard enough and you destroy the true goal (Goodhart). For
    reflexive/agentic targets, acting-on without consent is manipulation;
    acting-with requires justification. "cui bono — who pays, who benefits, who
    bears the cost" — including your own funding and position — is a load-bearing
    variable, not a footnote.

........................................................................
WRAPPER — PARTICIPANT vs ENGINEER  (which stance you are in right now)
........................................................................
A hard switch that overrides everything: are you analyzing this system from the
outside (engineer) or living inside it (participant)? Some systems — intimate
relationships, your own meaning and commitments, anything whose value depends on
being lived non-instrumentally — are DEFAULT-DISALLOWED for the engineer stance.
(See section 9, The Off-Switch.)


--------------------------------------------------------------------------------
4. THE PRIMITIVES AS QUESTIONS + TESTS + TRIPWIRES
--------------------------------------------------------------------------------
Each primitive earns its place only if it comes with a question to ask, a test
that could fail, and a symptom that tells you it's being misused.

L0 Stance
  Q: What would this framing forbid, and where does it break?
  Test: Can I name an out-of-sample case it would get wrong?
  Tripwire: Every outcome "confirms" the model -> unfalsifiable -> decoration.

L1 Routing
  Q: How reflexive is it, and which Cynefin domain is it in?
  Test: If I publish my model to the system, does its behavior change?
  Tripwire: Applying best-practice/up-front-analysis to a Complex system.

L2 Representation
  Q: Are these the right coordinates, and do the dynamics close (Markov)?
  Test: Does adding history improve prediction? (If yes, state is incomplete.)
  Tripwire: Added 3+ post-hoc variables this month -> overfitting/bad coordinates.

L3 Dynamics & Landscape
  Q: Which basin, how close to a bifurcation, which way is the boundary moving?
  Test: Are variance/autocorrelation rising (critical slowing down)?
  Tripwire: Treating a regime change as if it were motion within a regime.

L4 Inference & Limits
  Q: What do I actually know vs fabricate? Is this risk-bearing or ruin-bearing?
  Test: Reference class with >=~20 observed-and-scored cases? If not -> Knightian.
  Tripwire: Cardinal numbers attached to things that were never measured.

L5 Action & Strategy
  Q: Is the effect identifiable, who else is optimizing, would the target consent?
  Test: Can I name the back-door I blocked / the instrument / the experiment?
  Tripwire: "Leverage point" asserted with no identification argument.


--------------------------------------------------------------------------------
5. THE MASTER INSTRUMENTS (what you actually run)
--------------------------------------------------------------------------------

5a. THE 2x2 — the single most useful tool in the framework.
Cross the two independent axes (can you KNOW it? can you MOVE it?):

                    | CONTROLLABLE (can steer)     | UNCONTROLLABLE
  ------------------+------------------------------+----------------------------
  OBSERVABLE        | INTERVENE: find the          | FORECAST & POSITION: you can
  (can know)        | identifiable lever, mind the | see it coming but not stop it
                    | delay, watch the proxy       | -> hedge, get out of the way
  ------------------+------------------------------+----------------------------
  UNOBSERVABLE      | INSTRUMENT FIRST: build      | ACCEPT & EXIT: stop modeling
  (can't know)      | sensors/estimators before    | /steering; build optionality
                    | acting blind                 | and walk
  Most failed interventions die because the actor was in the wrong quadrant and
  didn't know it.

5b. THE RUN-LIST — the procedure, in dependency order. Run it on any system.
  1. Whose map, paid by whom — and should I even pick up the lens here?
     (Stance + participant/engineer switch.)
  2. How reflexive is it, and which Cynefin domain? (Routing -> picks the toolkit.)
  3. What are the right variables, and do the dynamics close? (Representation —
     usually the real bottleneck.)
  4. Where is it on the landscape — which basin, how close to a bifurcation?
     (Watch for critical slowing down. What is selecting/varying it over time?)
  5. What do I actually know vs fabricate, and is this risk- or ruin-bearing?
     (Provenance tags + ergodicity check.)
  6. Can I know it? Can I steer it? (The 2x2 -> intervene / forecast / instrument
     / exit.)
  7. If I intervene: is the effect identifiable, who else is optimizing, would
     the target consent? (do-gate + mechanism design + ethics + trust.)
  8. What did I omit, and is my model beating a dumb baseline? (Residual review —
     run EVERY cycle.)

5c. WHEN NOT TO MODEL (the cost/triage rule the framework needs to be usable).
Modeling is expensive and slow; most of life is fast and embodied. Match effort
to domain and stakes:
  - CHAOTIC / crisis: don't model — act to stabilize, then sense (OODA loop:
    Observe-Orient-Decide-Act, fast, with Orient doing the real work). Trained
    intuition (Klein's naturalistic decision-making) legitimately beats the model
    here.
  - CLEAR / low stakes: apply best practice; don't over-think.
  - COMPLEX or high stakes or IRREVERSIBLE: this is where the full run-list earns
    its cost. Spend the most effort exactly where a wrong move can't be undone.
  Heuristic: effort on analysis should scale with reversibility cost, not with
  how interesting the problem is.


--------------------------------------------------------------------------------
6. WHAT CHANGED FROM THE ORIGINAL 18 CONCEPTS
--------------------------------------------------------------------------------

MERGED (were double-counting one object):
  - State variables + State spaces            -> State (Markov) + its space
  - Networks/Structure + Constraints          -> one causal coupling graph w/ capacity
  - Computation + Dynamics + Flows            -> one update rule on a state space

CUT (placeholders that license lazy thinking):
  - Emergence            -> dissolved into the micro/macro compressibility gap +
                            a named mechanism
  - Stationarity vs Non-stationarity -> a symptom; a parameter approaching a
                            bifurcation (and in human systems, your own model is
                            the main cause of it)

DEMOTED (were over-ranked):
  - Optimization   -> from base pillar to special case (1-agent; meaningless
                      until objective specified; usually a gamed proxy)
  - Leverage points-> from a "find the lever" vibe to a computable, causally
                      gated quantity (high loop gain / near a bifurcation / high
                      mutual information within capacity / high shadow price with
                      an identifiable do-effect)
  - Time scales    -> a sub-property of loop structure (delay-relative-to-gain)
  - Identity through change -> split into (a) viability, (b) error-correcting
                      redundancy, (c) counterfactual invariance + narrative
                      identity for human systems. ("Stable in the trajectory I
                      watched" is NOT "stable under interventions I could have
                      made.")

PROMOTED TO FOUNDATIONAL (were missing or buried):
  - The reflexive spectrum + Cynefin routing (decides which tools apply)
  - The do-operator / seeing-vs-doing split (beneath state and flows)
  - Entropy as the single currency
  - Bifurcation / regime change + critical slowing down
  - State-as-minimal-sufficient-statistic + representation as a chosen, learnable
    degree of freedom
  - Strategic (multi-agent) equilibrium, displacing single-objective optimization
  - The epistemic/value floor (map-territory, No-Free-Lunch, value-ladenness,
    meaning =/= information)
  - Ergodicity/ruin and convexity/optionality (the survival pair)


--------------------------------------------------------------------------------
7. WHERE IT BECOMES DANGEROUS, AND THE ANTIDOTES
--------------------------------------------------------------------------------
A worldview this powerful is dangerous in proportion to how much you trust it.
The pattern: the framework works best exactly where it is most harmful to use.

  - REIFICATION (mistaking the map for the thing). Elegance makes it worse — a
    rich, consistent model feels more real than the messy reality in front of
    you. Antidote: a recurring residual review ("what happened this cycle that
    has no slot in our state vector?") + a standing rule that the model must beat
    a dumb baseline (last-value / base-rate) or it's decoration.
  - THE STREETLIGHT EFFECT. Every tool here rewards the quantifiable; the lens
    will drag your attention toward problems with state vectors. Antidote: run a
    genuinely non-systems mode in parallel (narrative, phenomenological,
    ethnographic) with equal standing; produce one deliverable written in NONE of
    this vocabulary that an insider would recognize as true.
  - PSEUDO-QUANTIFICATION ("morale: a state variable with downward flow"). The
    rigor is real between symbols and entirely unconstrained where the symbols
    came from. Antidote: a provenance tag on every quantity —
    MEASURED / ESTIMATED / FABRICATED — that propagates to every conclusion.
    Default to ordinal ("roughly, more than, fragile") unless a cardinal number
    is genuinely earned.
  - CALIBRATION THEATER. Calibration only disciplines repeatable, scoreable
    events; your biggest decisions (this marriage, this pivot) are singular.
    Antidote: judge singular high-stakes calls by "how survivable is being
    wrong?" (downside, reversibility, exit cost), NOT by "what's my probability?"
  - IT'S A TOOL OF WHOEVER OWNS THE MECHANISM. "Influence any system via leverage
    points and incentive design," pointed at employees/users/voters/a partner
    without their knowledge, is a manipulation manual with a rigor aesthetic.
    Antidote: the "publish the model to its subjects" test — would the targets
    recognize and consent to this description of themselves? Distinguish
    acting-WITH (they can contest the boundary and objective) from acting-ON.
  - THE SYSTEM GAMES THE MODELER, NOT JUST THE METRIC. Once you are an agent in
    the system, rivals reverse-engineer that you reason this way. Antidote:
    red-team yourself ("assume my counterpart knows I use this framework"), value
    unpredictability over the legible "optimal" move (legibility is
    exploitability), and assume alpha-decay: the more popular the method, the
    faster the environment evolves defenses against it.
  - IT CONVERTS THE GENUINELY NOVEL INTO THE MERELY-NOT-YET-MODELED. The hard-
    limit concepts cover unknown values and unknown models, but NOT ontological
    novelty: a state that was never a coordinate (a technology, an idea, a form
    of life that didn't exist as a variable). Antidote: a permanent "wildcard"
    slot and an explicit check — "what could enter that is not a value of any
    variable I have?" For creative/historical domains, treat novelty as the
    expected case: the right stance is "stay solvent and curious so you can
    metabolize what you didn't foresee," not "predict the trajectory."
  - THE GAZE CORRODES WHAT IT'S CORRECT ABOUT. Viewing your marriage as a
    dynamical system, your child as a system steered to a viable attractor, your
    life as a trajectory to optimize — can be perfectly true and still make your
    life worse, because it trains you to stand outside what should be lived from
    inside. Epistemic validity and existential damage are independent axes; this
    framework tracks only the first. (See the Off-Switch.)


--------------------------------------------------------------------------------
8. KNOWN HOLES (kept visible on purpose)
--------------------------------------------------------------------------------
Even rebuilt, this framework has gaps. An honest OS names its own.
  - No full theory of WISDOM (phronesis): the judgment of which frame to apply,
    when to stop, how to hold competing goods. Cynefin + the off-switch are
    partial scaffolding; the meta-choice still lands on an unmodeled practitioner.
  - The embodied / affective / pre-representational. Mood, atmosphere, felt
    sense, skilled coping — much of human coordination never passes through
    explicit states and will be systematically missed.
  - The track record cuts against it. The robust empirical finding is that simple
    models and broad reference classes routinely beat elaborate causal
    architectures. That is an argument against this framework's own complexity —
    carried here deliberately, as a brake.


--------------------------------------------------------------------------------
9. THE OFF-SWITCH (the most important section)
--------------------------------------------------------------------------------
The lens is a tool you pick up and PUT DOWN.

The stopping question, asked before applying it to anything you love:
        "Does viewing this through the lens DEGRADE it?"

Default-disallowed zones for the engineer stance: intimate relationships, your
own meaning and commitments, grief, play, worship, art, and anything whose value
depends on being lived non-instrumentally. Love that is optimized is not love; a
friendship managed for leverage is a transaction.

A worldview you cannot exit is not a tool — it is a prison with good production
values. The ambition to "model any system, including relationships and career"
is therefore amended to: model what benefits from modeling; live the rest.


--------------------------------------------------------------------------------
10. READING ANCHORS (tightly matched to the gaps)
--------------------------------------------------------------------------------
  Causation .................. Pearl, "The Book of Why"
  Leverage (the real version)  Meadows, "Leverage Points: Places to Intervene"
  Regulation/variety ......... Ashby, "An Introduction to Cybernetics"
  Ruin / fat tails / convexity Taleb, "Antifragile"; Ole Peters on ergodicity
  Forecasting that works ..... Tetlock, "Superforecasting"
  Probability = inference .... Jaynes, "Probability Theory: The Logic of Science"
  The legibility critique .... James C. Scott, "Seeing Like a State"
  Which-domain sense-making .. Snowden & Boone, "A Leader's Framework for
                               Decision Making" (Cynefin, HBR 2007)
  Reflexivity, made precise .. Beinhocker, "Reflexivity, complexity, and the
                               nature of social science" (2013); Soros
  Value pluralism / intuition  Berlin (pluralism); Klein & Dreyfus (expert
                               intuition, when the model should yield)

================================================================================
END. This is a procedure, not a creed. Run it, score it, and edit this file when
reality beats the model — which, if you are using it honestly, it regularly will.
================================================================================
