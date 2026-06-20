# What Flows?

## TL;DR

- **Systems are pipes and reservoirs** — find what moves, what waits, and what leaks.
- **Bottlenecks dominate throughput** — optimize the constraint, not the average step.
- **Flows can be matter, energy, information, or attention** — often all at once.

## How to use this lens

1. **Draw sources and sinks** — where does input enter and output leave?
2. **Trace the main carrier** — packets, blood, money, messages, decisions.
3. **Mark queues and buffers** — anywhere things wait is a design lever.
4. **Find the slowest step** — that is your bottleneck (Theory of Constraints).
5. **Check for leaks and rework** — flow that circulates without exiting wastes capacity.
6. **Quantify if possible** — rate in, rate out, average wait.

## Core concepts

**Takeaway: Conservation laws constrain design.**

What enters must exit, transform, or accumulate. Unaccounted flow becomes **debt** — technical, metabolic, or organizational. Steady state means inflow equals outflow; growth means reservoirs fill.

**Takeaway: Queues appear whenever arrival exceeds service.**

Randomness makes queues form even when average capacity looks sufficient. **Queueing theory** turns this intuition into design: how many workers, how much buffer, what tail latency to expect.

**Takeaway: Information flow is often the real product.**

In an office, electricity flows trivially compared to **attention and decisions**. In a datacenter, bits move — but **coordination messages** determine whether those bits mean anything.

### Flow checklist

| Question | Why it matters |
|----------|----------------|
| What is the unit of flow? | Enables measurement |
| Where do items wait? | Latency lives in queues |
| What is the service rate? | Capacity planning |
| Is flow bursty or smooth? | Burstiness inflates queues |
| Can flow be dropped? | Lossy vs lossless design |

## Mini-examples

- **Sleep:** metabolic waste clears from brain interstitial space; glucose and hormones cycle; neural activity patterns flow between wake and REM.
- **Office:** email and Slack carry requests; calendars buffer attention; cash flow exits to payroll and vendors.
- **Blood:** oxygen rides erythrocytes; capillaries are the last-mile network; the heart is the scheduler.

## Curriculum bridge

Formalize flow with:

- [Queueing Theory](/topics/queueing-theory) — waits, utilization, tail latency
- [Streaming Algorithms](/topics/streaming-algorithms) — one-pass computation on flows too large to store

## Try it now

Trace one request you made today (coffee order, bug fix, text reply). List every **wait** and **handoff**. Where was the bottleneck?

## Going deeper

**Takeaway: Parallel paths need synchronization.**

Blood splits into parallel capillary beds; microservices fan out to shards. Joining partial results reintroduces a **sync point** — often the new bottleneck.

**Takeaway: Backpressure is conversation.**

When downstream is full, upstream must slow or drop. Protocols that ignore backpressure **buffer until they explode**. Healthy systems signal congestion early.

**Takeaway: Attention is zero-sum flow.**

In cognitive systems, focus allocated here is unavailable there. Multitasking is rapid switching with switching cost — not true parallelism.

Seeing flow turns vague "slowness" into a located queue you can redesign.