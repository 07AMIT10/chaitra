**Electricity in; decisions and shipped code out.**

```mermaid
flowchart LR
  Power["Power & internet"] --> People["People & agents"]
  People --> Tools["Tools & docs"]
  Tools --> Out["Shipped work"]
  People --> Attention["Attention queue"]
```

Bottlenecks: meeting load, review queues, unclear ownership. [Queueing Theory](/topics/queueing-theory) applies directly — every standup is a scheduler.
