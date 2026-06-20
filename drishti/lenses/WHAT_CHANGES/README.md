# What Changes?

## TL;DR

- **Separate stationary structure from drifting signals** — model each differently.
- **Every system has multiple clocks** — fast noise, slow trends, rare regime shifts.
- **Non-stationarity is the default** — assuming constancy is the risky special case.

## How to use this lens

1. **Inventory what you treated as fixed** in your mental model.
2. **Classify rates of change** — milliseconds, days, years, "never in practice."
3. **Mark non-stationary drivers** — seasonality, growth, policy, fashion, hardware generations.
4. **Ask what would break your model** if a parameter drifted 10%.
5. **Identify stable coordinates** — things that change slowly enough to plan against.
6. **Note feedback** — does the system change *because* you measured it?

## Core concepts

**Takeaway: Stationarity is a local approximation.**

Queueing formulas assume arrival rates hold still for a while. That is often useful for the next hour, never for the next decade. **Streaming analytics** exists because the world refuses to sit still — windows slide because history stops predicting.

**Takeaway: Multiple timescales stack.**

Sleep cycles change minute to minute; sleep need shifts across a lifetime. Offices rewrite policies quarterly while Slack messages churn by the second. Good analysis ** picks a timescale** before picking a tool.

**Takeaway: Regime changes are discrete jumps.**

A startup before and after product-market fit is not the same system with tweaked parameters — incentives, bottlenecks, and failure modes reorganize. Treat regime shifts as **new existence questions**, not noise.

### Change taxonomy

| Type | Signal | Risk if ignored |
|------|--------|-----------------|
| Noise | Random fluctuation | Overfitting |
| Trend | Directional drift | Stale forecasts |
| Seasonality | Repeating calendar | Wrong baseline |
| Regime shift | Rule change | Catastrophic model error |

## Mini-examples

- **Sleep:** circadian phase rotates daily; sleep pressure accumulates hourly; aging shifts baseline across years.
- **Office:** headcount grows; strategy pivots; tooling generations replace every few years.
- **Blood:** heart rate varies beat-to-beat; fitness changes capacity over months.

## Curriculum bridge

When change becomes formal:

- [Eventual Consistency](/topics/eventual-consistency) — systems that accept temporary mismatch while converging
- [Streaming Analytics](/topics/streaming-analytics) — computation over evolving streams

## Try it now

Pick one metric you watch (steps, error rate, mood). Is it **noisy**, **trending**, or **seasonal**? What would a chart at a different timescale reveal?

## Going deeper

**Takeaway: Observability changes behavior.**

People sleep differently when tracked. Teams game metrics once bonuses attach. The act of measurement is part of the dynamics — not an external camera.

**Takeaway: Slow variables trap fast optimizers.**

Optimizing this week's throughput can erode next year's reliability. **Change lens** pairs with **what persists** — find variables that move slowly and anchor plans there.

**Takeaway: Adaptation is change you want.**

Learning systems *should* change. Distinguish **destructive drift** (model rot) from **productive adaptation** (updated weights). The difference is whether performance on held-out goals improves.

If you skip this lens, you will confidently apply a formula whose assumptions expired yesterday.
