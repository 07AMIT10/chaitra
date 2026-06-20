# What Learns?

## TL;DR

- **Learning is persistent change driven by feedback** — not every change counts.
- **Find the loss function** — what is the system implicitly optimizing?
- **Memory spans timescales** — cache, habit, model weights, culture.

## How to use this lens

1. **Ask what gets updated after each outcome** — weights, habits, policies, beliefs.
2. **Identify the feedback signal** — reward, error, surprise, social approval.
3. **Locate memory** — where is state stored and how long does it last?
4. **Check exploration vs exploitation** — is the system trying new actions or repeating winners?
5. **Watch for stale learning** — old data dominating new reality.
6. **Name who or what learns** — person, team, algorithm, ecosystem.

## Core concepts

**Takeaway: Optimization requires a target.**

Even organisms without explicit math minimize **prediction error** or maximize **inclusive fitness**. Offices optimize revenue, morale, or survival — often simultaneously with tradeoffs unstated.

**Takeaway: Learning rates matter.**

Update too fast and noise dominates; too slow and regimes shift before you adapt. **Statistical learning** formalizes bias-variance tradeoffs that appear everywhere from sleep consolidation to model retraining.

**Takeaway: Credit assignment is hard.**

Which past action caused today's outcome? Teams blame individuals; algorithms use backprop or eligibility traces. Misassigned credit **teaches the wrong lesson**.

### Memory tiers

| Tier | Example | Decay |
|------|---------|-------|
| Working | Current task context | Seconds–minutes |
| Episodic | Yesterday's meeting | Days–years |
| Structural | Org policy, muscle memory | Months–forever |
| Parametric | Model weights | Until retrained |

## Mini-examples

- **Sleep:** consolidates episodic memory into long-term storage; synaptic homeostasis resets learning capacity.
- **Office:** retrospectives update process; CRM records customer history; ML models retrain on logs.
- **Blood:** baroreceptors tune heart rate in seconds; cardiovascular fitness adapts over weeks of training.

## Curriculum bridge

Mechanisms of learning in Chaitra:

- [Statistical Learning](/topics/statistical-learning) — generalization from data
- [RL Orchestration](/topics/reinforcement-learning-orchestration) — agents acting to maximize reward

## Try it now

What did you **update** after your last mistake — a habit, a checklist, nothing? Where is that memory stored (brain, notes, team wiki)?

## Going deeper

**Takeaway: Multi-agent learning creates games.**

When many learners co-adapt, equilibria shift. A pricing bot and a competitor bot **learn each other**, not just the market. Office politics is multi-agent reinforcement learning without clear rewards.

**Takeaway: Learning can be destructive.**

Overfitting, burnout, and regulatory capture are **learning failures**. Good design includes forgetting — dropout, sleep, policy sunsets.

**Takeaway: Orchestration schedules learning.**

When to retrain, when to sleep, when to run an retrospective — **timing** is infrastructure. RL orchestration applies to machines and meetings alike.

If nothing learns, the system is open-loop — fine until the environment moves.
