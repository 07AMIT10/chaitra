# What Persists?

## TL;DR

- **Invariants survive component replacement** — find what stays true across swaps.
- **Constraints outlast strategies** — physics, law, and logic bound all plans.
- **Agreements persist when enforcement and benefit align** — otherwise they erode.

## How to use this lens

1. **List components that could be replaced** — people, servers, cells, tools.
2. **Ask what must remain true** for the system to still be "the same thing."
3. **Separate hard constraints from soft conventions** — which break the system if violated?
4. **Find identity keys** — IDs, schemas, DNA, constitution, brand promise.
5. **Check persistence mechanisms** — replication, backups, rituals, audits.
6. **Note what you want to persist vs what accidentally does** — they differ.

## Core concepts

**Takeaway: Persistence enables coordination at scale.**

If every fact had to be renegotiated daily, nothing complex could run. **Durable state** — whether in CRDTs, databases, or constitutions — lets strangers cooperate with low friction.

**Takeaway: Two kinds of persistence.**

Physical persistence: atoms in a wall. Logical persistence: account balance after server migration. Distributed systems teach that **logical persistence is engineered**, not guaranteed by hardware.

**Takeaway: Invariants simplify reasoning.**

When you know "total money conserved" or "schema version monotonic," you can reject huge classes of bugs. Invariants are **compression** of experience into rules.

### Persistence vs change

| Persists | Changes freely |
|----------|----------------|
| API contract major version | Implementation internals |
| Company mission (ideally) | Tactics |
| Blood type | Heart rate |
| CRDT merge semantics | Replica location |

## Mini-examples

- **Sleep:** circadian rhythm persists across nights; sleep need resets but baseline need persists across life stages.
- **Office:** legal entity persists through employee turnover; shared vocabulary persists in culture.
- **Blood:** blood type invariant; vessel topology persists while individual cells replace constantly.

## Curriculum bridge

Formal persistence tools:

- [CRDTs + Probability](/topics/crdts-plus-probability) — merge without coordination
- [Consensus Systems](/topics/consensus-systems) — agree on a single ordered history

## Try it now

Name one thing about your team or body that ** stayed the same** through five replacements of parts (people, cells, laptops). That is your invariant candidate.

## Going deeper

**Takeaway: Persistence trades flexibility.**

Strong invariants speed reasoning but resist change. Constitution-level rules need amendment processes — **meta-persistence** for the rules themselves.

**Takeaway: Entropy erodes soft persistence.**

Without maintenance, agreements fade. Documentation rots; habits decay without sleep. Persistence requires **energy input** — the second law wearing a business suit.

**Takeaway: Identity under replacement is a design choice.**

The Ship of Theseus is not a paradox — it is an engineering question. What ID do you assign the ship after each plank swap? Systems answer with **primary keys**.

Knowing what persists tells you what you can safely refactor — and what you must never break silently.