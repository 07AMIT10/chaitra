**Packets flow independently; full queues drop without mercy.**

```mermaid
flowchart LR
  Sender --> R1[Router queue]
  R1 --> R2[Router queue]
  R2 --> Receiver
```

Two email packets may cross different continents. [Gossip protocols](/topics/gossip-protocols): when a queue fills, routers drop packets — TCP backs off, a decentralized rate limiter.
