# Internet Routing

## TL;DR

- There is no center — routing is routers trusting neighbor gossip.
- A misconfigured BGP announcement can black-hole YouTube for an hour.
- Watch hijack frequency and peering diversity, not press releases about resilience.

## The Phenomenon

Your video call crosses continents as chopped packets, each finding its own path through a graph nobody drew on purpose. The internet is not a cloud — it is routers, subsea fiber, and fragile trust agreements between Autonomous Systems.

```mermaid
flowchart LR
  You --> ISP1
  ISP1 --> IXP[Exchange point]
  IXP --> ISP2
  ISP2 --> Server
```

## What Exists?

**The cloud is someone else's computer, wired together under the ocean.**

Routers and IXPs are warehouses of forwarding tables. Autonomous Systems voluntarily peer. Topology exists only as distributed state in border router RAM.

## What Changes?

**Anchor damage and viral streams rewrite the graph daily.**

Cable cuts, storms, and viral downloads are normal perturbations. BGP propagates reroutes in seconds.

## What Flows?

**Packets flow independently; full queues drop without mercy.**

TCP detects drops and backs off — decentralized congestion control without a central scheduler.

## What Learns?

**Routers learn paths by gossiping with neighbors — and trusting blindly.**

BGP announces reachability; shorter paths win. Truth is not cryptographically verified.

## What Persists?

**TCP/IP and BGP persist because every device already speaks them.**

Foundational protocols from the 1970s–80s scaled because simplicity beat redesign.

## What Emerges?

**Global reach emerges from local peering bargains — and rare catastrophes.**

Economic peering builds connectivity; misconfiguration can crash global routing.

## What Will Happen?

**Branches: public mesh, private pipes, or splintered regions.**

Hyperscalers build private fiber; states build firewalls. Leading indicators: hijack frequency, private backbone share.

## Try it

Run `traceroute` to a site you use daily — count hops and countries.
