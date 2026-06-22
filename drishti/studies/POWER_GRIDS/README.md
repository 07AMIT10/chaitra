# Power Grids

## TL;DR

- The grid is synchronized spinning metal — not a tank of electricity waiting to pour.
- Generation must match demand every second or frequency drifts off 60 Hz.
- Watch reserve margins and line thermal ratings, not renewable percentage press releases.

## The Phenomenon

Flip a switch and turbines somewhere spin a hair faster. There is no warehouse of electrons — only synchronized generators, wires, and a frequency heartbeat that must stay at 60 Hz (or 50 Hz) every second.

```mermaid
flowchart LR
  Gen[Generators] --> Tx[Transmission]
  Tx --> Load[Demand]
  Load -->|imbalance| Freq[Frequency drift]
  Freq --> Trip[Automatic load shed]
```

## What Exists?

**Spinning magnets in lockstep — not a battery in the basement.**

AC architecture trades storage for long-distance voltage stepping. Equilibrium is continuous juggling.

## What Changes?

**Supply used to be predictable; clouds and wind made it a weather forecast problem.**

Variable renewables turn deterministic scheduling into real-time probabilistic control.

## What Flows?

**Energy rides the wires as waves — heat is the queue timeout.**

Thermal limits on lines are the bottleneck; faults reroute instantly to neighbors.

## What Learns?

**Relays trip locally; markets price scarcity into behavior.**

Distributed protection and economic signals substitute for central planning.

## What Persists?

**60 Hz (or 50 Hz) is the unforgiving heartbeat of the network.**

Frequency invariants trigger automated defenses before human operators can react.

## What Emerges?

**Tight coupling turns one tree branch into fifty million people dark.**

Cascading blackouts are rare but inevitable in tightly coupled graphs without slack.

## What Will Happen?

**Branches: virtual plants, microgrid exit, or rolling brownouts.**

Rooftop solar and batteries simulate traditional generators in software. Leading indicators: reserve margins, storage MW online.

## Try it

On a hot day check your grid operator's frequency alerts — that's the heartbeat.
