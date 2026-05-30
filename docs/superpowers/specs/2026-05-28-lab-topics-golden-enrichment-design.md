# Lab Topics Golden Enrichment — Design Spec

> **Status:** Approved (user: north star **A** — all 34 lab topics reach Bloom golden depth)  
> **Date:** 2026-05-30  
> **Scope:** All topics with `hasLab: true` in `website/src/data/topics.json` (34 today)  
> **Reference golden:** `bloom-filters` (`/topics/bloom-filters`)  
> **Related:** [All-topics labs strategy](./2026-05-28-all-topics-labs-strategy.md), [Content UX design](./2026-05-28-content-ux-design.md), research `.research/chaitra-rich-labs-research.json`

---

## 1. Problem statement

Chaitra ships **34 interactive lab topics**, but only **Bloom filters** meets the full **golden** bar: rich narrative, domain-specific lab (not generic bars), ground-truth comparison, scenario presets, code parity, and accessibility. The remaining **33** topics use **MiniSim** or partial Tier A labs that teach the topic name without the depth of explorable explanations (progressive disclosure, predict-then-reveal, estimate vs exact).

**North star (locked):** Every topic with `hasLab: true` eventually reaches **Bloom golden** quality for narrative, lab, and code (where the repo supports it).

---

## 2. Definition of done — “Bloom golden” rubric

A topic is **`status: "golden"`** only when all applicable rows pass review.

| Pillar | Requirement | Verification |
|--------|-------------|--------------|
| **Narrative** | Prerequisite Mermaid DAG; “how to read” callout in `index.mdx`; worked example; KaTeX math; “when to use / when not”; **lab bridge** paragraph naming lab controls | Manual + `npm run build` |
| **Lab** | Tier A island: domain visualization; compact controls (`lab__controls-panel`); `MetricsAside` with warn/aha tones; **ground-truth compare**; **≥2 scenario presets**; **≥1 predict-then-reveal** prompt | Checklist + spot play |
| **Simulation** | `website/src/lib/<topic>-math.ts` + `<topic>-sim.ts` (or shared lib per archetype) mirroring repo formulas/hashing | Parity test or documented recipe match |
| **Code** | If `hasPython`: `code.mdx` + Pyodide default from topic folder; if `hasRust` and WASM feasible: `wasm/<topic>/` + runner tab | `CodePanel` loads on topic page |
| **A11y** | `client:visible` on lab; ARIA on tabs/sliders; canvas `role="img"`; `aria-live` status; `prefers-reduced-motion` respected | axe or manual |
| **Deploy** | Page builds in CI; no horizontal layout blowout; Mermaid prerequisites render | `npm run build` |

**Explicit exclusions:**

- **MiniSim-only** UI (single slider + generic bar chart) is **not** golden — acceptable only as a migration scaffold.
- **Hugging Face iframe** may supplement ML-heavy demos; it **does not** replace the in-repo lab on Cloudflare Pages.

---

## 3. Architecture

### 3.1 Content pipeline (unchanged)

```
<REPO>/<TOPIC>/README.md
    → npm run sync:readme → content/topics/<slug>/readme-body.md
    → content/topics/<slug>/index.mdx (callout + ReadmeBody + <Topic>Lab client:visible)
    → optional code.mdx + assets/code/*.py.txt
```

### 3.2 Lab code layout (per topic)

```
website/src/lib/<topic>-math.ts
website/src/lib/<topic>-sim.ts
website/src/components/<Topic>Lab.tsx
website/src/components/<Topic>Lab.css   # only if lab-specific layout
website/src/content/topics/<slug>/index.mdx
website/src/content/topics/<slug>/code.mdx   # when hasPython
website/wasm/<topic>/                        # when hasRust + WASM planned
public/wasm/<topic>/
```

### 3.3 Shared platform (invest once)

Extract and extend from `website/src/components/lab/`:

| Primitive | Purpose |
|-----------|---------|
| `LabShell`, `LabTabs`, `RangeControl`, `MetricsAside` | Existing |
| `ComparePanel` | Two-column algorithm vs ground truth |
| `ScenarioPresets` | Buttons: demo / mistake / hunt / clear |
| `PredictReveal` | “What do you expect?” → run → show outcome |
| `CmsHeatmap`, `BitGridCanvas`, … | Archetype viz building blocks |
| `MermaidInit` | Prerequisites graphs |

**MiniSim:** Deprecate as terminal state; remove or repoint imports after each topic migrates to full lab.

### 3.4 Pedagogy patterns (from research)

1. **Progressive disclosure** — basic controls first; advanced in tabs.
2. **Predict-then-reveal** — one guided question before showing metrics.
3. **Ground truth** — always show exact / optimal / naive baseline where possible.
4. **Scenario presets** — teach mistakes (overfill, partition, collision).
5. **Narrative ↔ lab bridge** — README names the sliders the lab exposes.

---

## 4. Archetype → golden lab requirements

Map each topic to an archetype from [labs strategy §3](./2026-05-28-all-topics-labs-strategy.md). Golden lab **must** implement that archetype’s lab concept with compare + presets.

| Archetype | Golden lab must include |
|-----------|-------------------------|
| `membership-sketch` | Bit/grid viz; live FP; exact-set compare; overfill preset |
| `frequency-sketch` | Sampled heatmap; stream scrubber; true vs estimate |
| `cardinality-sketch` | Register chart; distinct count compare |
| `hashing-sharding` | Ring viz; remapped vs stable key counts |
| `rate-limiter` | Accept/drop timeline; bucket state |
| `cache-eviction` | Trace replay; hit ratio with/without admission |
| `gossip-graph` | Peer graph step; convergence curve |
| `consensus` | Node roles + log/timeline; partition inject |
| `queueing` | λ, μ, ρ, queue length, wait time |
| `streaming-window` | Window + watermark or multi-sketch chain |
| `monte-carlo` | Running estimate vs samples; variance display |
| `graph-rank` | Editable graph; power iteration steps |
| `bayesian` / `spam-classifier` | Prior/likelihood sliders; classify samples |
| `information-theory` | Histogram → entropy |
| `ml-attention` | Small Q/K/V → attention heatmap |
| `ml-routing` | Toy router → expert load |
| `mapreduce-batch` | Map/shuffle/reduce timeline; straggler |
| `scheduling` | Balls-into-bins; distribution compare |
| `other` | Custom per strategy doc §3.19 |

---

## 5. Delivery waves (34 topics)

**Already golden:** `bloom-filters` (1).

**Remaining:** 33 topics, delivered in four waves by archetype and existing Tier A head start.

### Wave 1 — Sketches & core algorithms (10 topics)

| Slug | Archetype | Notes |
|------|-----------|-------|
| `count-min-sketch` | frequency-sketch | Upgrade CMS lab to full golden |
| `hyperloglog` | cardinality-sketch | |
| `consistent-hashing` | hashing-sharding | |
| `tinylfu` | cache-eviction | |
| `rate-limiting` | rate-limiter | |
| `gossip-protocols` | gossip-graph | |
| `spam-detection` | spam-classifier | |
| `power-of-two-choices` | scheduling | |
| `queueing-theory` | queueing | |
| `crdts-plus-probability` | other | |

### Wave 2 — Distributed systems & graphs (10 topics)

| Slug | Archetype |
|------|-----------|
| `pagerank` | graph-rank |
| `mapreduce` | mapreduce-batch |
| `raft-vs-gossip` | consensus |
| `consensus-systems` | consensus |
| `probabilistic-consensus` | consensus |
| `eventual-consistency` | consensus |
| `random-early-detection` | other |
| `distributed-queues` | queueing |
| `approximate-memory-cache-systems` | cache-eviction |
| `probabilistic-scheduling` | scheduling |

### Wave 3 — Probability & streaming (10 topics)

| Slug | Archetype |
|------|-----------|
| `bayesian-inference-systems` | bayesian |
| `bayesian-distributed-systems` | bayesian |
| `probabilistic-databases` | bayesian |
| `streaming-algorithms` | streaming-window |
| `streaming-analytics` | streaming-window |
| `monte-carlo-systems` | monte-carlo |
| `monte-carlo-tree-search` | monte-carlo |
| `randomized-algorithms` | monte-carlo |
| `information-theory` | information-theory |
| `probability-theory` | other |

### Wave 4 — ML routing (3 topics)

| Slug | Archetype |
|------|-----------|
| `mixture-of-experts` | ml-routing |
| `token-routing` | ml-routing |
| `transformer-attention` | ml-attention |

---

## 6. Catalog & status policy

| Status | Meaning after this program |
|--------|----------------------------|
| `golden` | Passes full rubric §2 |
| `live` | **Legacy** — migrate lab topics to `golden`; do not add new `live` lab topics |
| `preview` / `coded` / `readme-only` | Unchanged for non-lab topics |

`generate-catalog.mjs` should warn when `hasLab && status !== golden` after wave deadline (optional CI gate).

---

## 7. Success metrics

- **34/34** lab topics at `status: "golden"`.
- Zero production lab topics using MiniSim as final UI.
- Each golden topic documents ≥1 “aha” scenario in README lab bridge.
- Build stays green: `npm run catalog && npm run build`.

---

## 8. Out of scope

- Promoting **non-lab** topics (17+ readme-only infra topics) to golden.
- Bi-directional README ↔ MDX sync.
- Server-side lab compute (stay static + CDN Pyodide).
- Mandatory HF Spaces hosting.

---

## 9. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| 33× Bloom effort | Shared primitives §3.3; archetype templates; wave gates |
| ML labs too heavy for browser | Toy dimensions only; optional HF embed |
| Narrative drift from README | `sync:readme` + lab bridge in MDX wrapper |
| WASM build CI time | WASM only where Rust exists; defer optional crates |

---

## 10. References

- Bloom reference: `website/src/components/BloomFilterLab.tsx`, `website/src/lib/bloom-sim.ts`
- Labs strategy archetypes: `docs/superpowers/specs/2026-05-28-all-topics-labs-strategy.md` §3–5
- Deep research: `chaitra-rich-labs-research.json` (executive summary: explorable explanations, predict-then-reveal, Pyodide parity, WCAG 2.2)
