**Energy rides the wires as waves — heat is the queue timeout.**

```mermaid
flowchart LR
  Plant[Turbine] --> Line[Transmission line]
  Line --> Load[Homes and factories]
  Line -->|overload| Trip[Breaker trips]
  Trip --> Reroute[Load shifts to neighbors]
```

Operators cannot pick a single path — Kirchhoff distributes flow by resistance. Overloaded lines sag; a tree touch trips the breaker.

Energy instantly reroutes to already-stressed neighbors. [Rate limiting](/topics/rate-limiting) by heat, not software.
