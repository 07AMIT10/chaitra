# Chaitra All-Topics Interactive Labs Strategy

> **Status:** Strategy document (no lab implementation).  
> **Date:** 2026-05-28  
> **Scope:** 51 curriculum topics in `website/src/data/topics.json`  
> **Reference golden topic:** Bloom filters (`/topics/bloom-filters`)  
> **Depends on:** [Website design](./2026-05-28-chaitra-website-design.md), [Implementation plan](../plans/2026-05-28-chaitra-website-implementation-plan.md)

---

## 1. Executive summary

Chaitra’s pedagogical loop is **narrative → explorable lab → runnable code**. Bloom filters prove the stack on Cloudflare Pages: Astro MDX narrative, React island lab (`client:visible`), Pyodide + WASM runners, and one-way README sync. **Not every topic warrants a Bloom-scale lab.** Of 51 topics, **1 is P0 (golden)**, **10 are P1 (full lab)**, **18 are P2 (Tier B mini-viz or deferred full lab)**, and **22 are prose-only** (Mermaid + catalog link, no interactive island).

**Recommended approach: Option C (Hybrid).** Replicate the Bloom island pattern in-repo for all P0/P1 sketch, hash, rate-limit, and gossip topics (≈11 labs). Use **Tier B shared mini-viz components** for P2 algorithm topics. Reserve **Hugging Face Spaces** for optional heavy demos (attention heatmaps, MoE routing, RL orchestration) embedded via iframe—not as the primary delivery path. Infrastructure and agent topics stay prose-first with diagrams.

---

## 2. Website architecture (current state)

### 2.1 Routing and catalog statuses

| Route | Behavior |
|-------|----------|
| `/` | Home |
| `/catalog` | All 51 topics; links to `/topics/<slug>` only when `status ∈ {golden, live}` |
| `/topics/[slug]` | Static path from `getStaticPaths()` — **only golden/live topics today** |
| `#narrative`, `#lab`, `#code` | In-page anchors via `TopicLayout` |

**Catalog statuses** (`website/src/data/topics.json`):

| Status | Meaning | Site route | Count |
|--------|---------|------------|-------|
| `golden` | End-to-end reference (narrative + lab + Py + WASM) | Yes | 1 |
| `live` | Full topic page, may omit WASM | Yes | 0 (target: coded four) |
| `coded` | Repo has py/rs; not yet on site | GitHub link | 3 |
| `readme-only` | Narrative in README only | GitHub link | 47 |

Generator (planned in Task 8): `website/scripts/generate-catalog.mjs` scans repo folders and assigns `coded` vs `readme-only`.

### 2.2 TopicLayout slots

`TopicLayout.astro` defines the page contract:

```
hero (optional) → prerequisites (optional) → narrative → lab (optional) → code → footer
```

- **Narrative:** MDX body (synced README via `readme-body.md`)
- **Lab:** React island in `<section id="lab">` — only rendered if MDX provides `slot="lab"` content (Bloom embeds lab inside MDX narrative section with `<h2 id="lab">`)
- **Code:** `CodePanel` with Pyodide + WASM tabs when `code.mdx` exists
- **Pyodide:** Conditional `<script>` in head when `pyodide={true}`

Dynamic route `[slug].astro` currently loads MDX + optional `code.mdx` only for golden/live; coded topics need status promotion to `live`.

### 2.3 Content sync pipeline

```
BLOOM_FILTERS/README.md  ──sync-readme.mjs──►  content/topics/bloom-filters/readme-body.md
                                                          │
topics.json (metadata) ─────────────────────────► index.mdx imports ReadmeBody + islands
```

- **One-way sync** (v1): README → `readme-body.md`; MDX wrapper adds lab/code imports manually per topic
- **No bi-directional edit loop** (out of scope v1)

### 2.4 Islands, Pyodide, WASM pattern

| Layer | Bloom reference | Hydration | Notes |
|-------|-----------------|-----------|-------|
| Viz lab | `BloomFilterLab.tsx` | `client:visible` | Defers JS until lab scrolls into view |
| Code runner | `CodePanel.tsx` → `PyodideRunner.tsx` | `client:visible` | CDN Pyodide 0.26.4; preloaded on topic with `hasPython` |
| WASM | `WasmBloomRunner.tsx` | default (in CodePanel) | `public/wasm/bloom_filter/` from `npm run build:wasm` |
| Math/sim | `lib/bloom-math.ts`, `lib/bloom-sim.ts` | pure TS, no hydration | Parity with `bloom_filter.py` hashing |

**Cloudflare Pages constraints:** Static `dist/` only; Pyodide from CDN; WASM artifacts committed or built in CI; no server-side compute.

---

## 3. Lab archetypes

Topics grouped by the **interactive pattern** that best teaches the concept. Archetypes share math/sim libs and UI primitives where possible.

### 3.1 Membership sketch (`membership-sketch`)

**Teaches:** Definite-no / maybe-yes; false positives vs no false negatives; sizing \(m, k, n\).

**Browser-feasible:** Yes — bit array canvas, live FP formula.

**Topics:** `bloom-filters`

**Lab concept:** Tune \(m, k, n\); probe keys; compare Bloom vs exact set; preset “overfill” and “hunt FP”.

---

### 3.2 Frequency sketch (`frequency-sketch`)

**Teaches:** CMS matrix; min-of-rows query; collision inflation.

**Browser-feasible:** Yes — 2D heatmap, stream injector.

**Topics:** `count-min-sketch`, `tinylfu` (admission uses frequency estimates)

**Lab concept:** Stream events; query estimated vs true frequency; show overestimate when rows collide.

---

### 3.3 Cardinality sketch (`cardinality-sketch`)

**Teaches:** Leading zeros; registers; harmonic mean; HLL variance reduction.

**Browser-feasible:** Yes — register bar chart; live cardinality estimate.

**Topics:** `hyperloglog`, (future HLL++ extension)

**Lab concept:** Add hashed items; watch register maxima; compare estimate to exact distinct count.

---

### 3.4 Hashing / sharding (`hashing-sharding`)

**Teaches:** Hash ring; vnode balance; minimal reshuffle on node add/remove.

**Browser-feasible:** Yes — SVG ring; drag nodes.

**Topics:** `consistent-hashing`, `scalable-architectures` (Tier B diagram only)

**Lab concept:** Place keys and servers on ring; add/remove node; count keys that move vs stay.

---

### 3.5 Rate limiter (`rate-limiter`)

**Teaches:** Token bucket / GCRA; probabilistic edge throttling.

**Browser-feasible:** Yes — time-series chart; request slider.

**Topics:** `rate-limiting`

**Lab concept:** Send bursty requests; visualize tokens/refill; compare exact counter vs approximate shard limits.

---

### 3.6 Gossip / epidemic graph (`gossip-graph`)

**Teaches:** Push/pull rounds; fanout; convergence time vs completeness.

**Browser-feasible:** Yes — force-directed or grid graph; step simulation.

**Topics:** `gossip-protocols`, `raft-vs-gossip` (compare mode)

**Lab concept:** Step epidemic rounds; plot % nodes informed vs round; toggle push vs pull.

---

### 3.7 Queueing (`queueing`)

**Teaches:** Utilization \(\rho\); wait time; Little’s law; M/M/1 intuition.

**Browser-feasible:** Yes — discrete-event sim with small \(\lambda, \mu\).

**Topics:** `queueing-theory`, `distributed-queues` (prose), `power-of-two-choices` (related)

**Lab concept:** Adjust arrival/service rates; watch queue length and wait time distributions.

---

### 3.8 Consensus / replication (`consensus`)

**Teaches:** Leader election; log replication; partition behavior.

**Browser-feasible:** Partial — timeline/state-machine animation (not full Paxos proof).

**Topics:** `consensus-systems`, `probabilistic-consensus`, `raft-vs-gossip`, `eventual-consistency`

**Lab concept:** Step through Raft partitions or Nakamoto-style probabilistic finality; highlight divergent vs convergent states.

---

### 3.9 Cache eviction (`cache-eviction`)

**Teaches:** LRU vs LFU vs TinyLFU admission; sketch-backed frequency.

**Browser-feasible:** Yes — cache line visualization + access trace replay.

**Topics:** `tinylfu`, `approximate-memory-cache-systems`

**Lab concept:** Replay access trace; compare eviction victims with/without TinyLFU admission.

---

### 3.10 Streaming window (`streaming-window`)

**Teaches:** Tumbling/sliding windows; watermarks; one-pass constraints.

**Browser-feasible:** Partial — event timeline + window boundaries (Tier B).

**Topics:** `streaming-algorithms`, `streaming-analytics`, `event-prediction-systems`, `intelligent-realtime-platforms`

**Lab concept:** Inject events; show window aggregations updating; optional sketch backend (CMS/HLL) for aggregates.

---

### 3.11 Monte Carlo (`monte-carlo`)

**Teaches:** Sampling variance; exploration vs exploitation; convergence.

**Browser-feasible:** Yes — 2D plot of samples; running estimate.

**Topics:** `monte-carlo-systems`, `monte-carlo-tree-search`, `randomized-algorithms`

**Lab concept:** Estimate \(\pi\) or integral; MCTS tree expansion on small board/game.

---

### 3.12 Graph rank (`graph-rank`)

**Teaches:** Random surfer; power iteration; damping.

**Browser-feasible:** Yes — small graph (≤20 nodes); matrix multiply steps.

**Topics:** `pagerank`

**Lab concept:** Edit link weights; iterate PageRank; highlight rank flow.

---

### 3.13 ML attention / routing (`ml-attention`, `ml-routing`)

**Teaches:** Q/K/V attention weights; MoE top-k routing.

**Browser-feasible:** Partial — small toy matrices in browser; **full LLM scale needs HF or static precomputed**.

**Topics:** `transformer-attention`, `large-language-models`, `mixture-of-experts`, `token-routing`

**Lab concept:** 4×4 attention heatmap from hand-entered Q/K/V; MoE router picks experts per token (toy dims).

---

### 3.14 MapReduce batch (`mapreduce-batch`)

**Teaches:** Map/shuffle/reduce; straggler retry; data locality.

**Browser-feasible:** Yes — job timeline animation (Tier B).

**Topics:** `mapreduce`

**Lab concept:** Simulate map tasks on key shards; show shuffle bars; reducer merge; kill a worker mid-job.

---

### 3.15 Bayesian / classification (`bayesian`, `spam-classifier`)

**Teaches:** Prior × likelihood → posterior; Naive Bayes word likelihoods.

**Browser-feasible:** Yes — slider priors; word likelihood bars.

**Topics:** `bayesian-inference-systems`, `bayesian-distributed-systems`, `spam-detection`, `statistical-learning`, `probabilistic-databases`

**Lab concept:** Update posterior with evidence chips; classify sample emails by word probabilities.

---

### 3.16 Information theory (`information-theory`)

**Teaches:** Entropy; surprise; compression lower bound.

**Browser-feasible:** Yes — histogram → entropy calculator.

**Topics:** `information-theory`, `probability-theory` (Tier B dice)

**Lab concept:** Build symbol distribution; show bits/symbol and cross-entropy vs uniform.

---

### 3.17 Scheduling / load balance (`scheduling`)

**Teaches:** Randomized placement; power-of-two; RL placement (prose).

**Browser-feasible:** Yes — ball-into-bins sim.

**Topics:** `power-of-two-choices`, `probabilistic-scheduling`, `reinforcement-learning-orchestration` (prose/HF)

**Lab concept:** Compare random vs power-of-two bin loads over many trials.

---

### 3.18 Infrastructure prose (`infrastructure-prose`)

**Teaches:** Architecture patterns, ops loops, ML infra — **not algorithm micro-sims**.

**Browser-feasible:** Mermaid + callout boxes only.

**Topics:** `adaptive-cloud-orchestration`, `ai-probabilistic-infrastructure`, `autonomous-infrastructure`, `distributed-systems`, `go-backend-systems`, `large-scale-ml-infrastructure`, `llm-infrastructure`, `proactive-ai-systems`, `scalable-architectures`, `large-scale-multi-agent-systems`, `next-gen-ai-agents`, and similar.

**Lab concept:** None — deepen README with architecture diagrams and “when to use” tables.

---

### 3.19 Other / hybrid (`other`)

**Topics that blend archetypes or need custom treatment:**

| Topic | Notes |
|-------|-------|
| `approximate-computing` | Prose + tradeoff matrix |
| `crdts-plus-probability` | CRDT state lattice viz (P1 candidate) |
| `random-early-detection` | Queue fill + drop probability chart |
| `eventual-consistency` | Version vector timeline (Tier B) |

---

## 4. Bloom reference pattern — reusable template

### 4.1 File layout (per golden/live topic)

```
website/src/lib/<topic>-math.ts      # Formulas mirrored from Python
website/src/lib/<topic>-sim.ts       # Simulation core (parity hashing/API)
website/src/components/<Topic>Lab.tsx
website/src/components/<Topic>Lab.css
website/src/content/topics/<slug>/index.mdx   # imports lab + narrative
website/src/content/topics/<slug>/code.mdx    # CodePanel (optional)
website/src/assets/code/<file>.py.txt         # Pyodide default (raw import)
website/wasm/<topic>/                         # Optional Rust WASM crate
public/wasm/<topic>/                          # Built artifacts
```

### 4.2 Reusable vs per-topic custom

| Reusable (extract after 2–3 labs) | Per-topic custom |
|-----------------------------------|------------------|
| `ParameterPanel` — labeled sliders, tabs, `aria-*` | Domain visualization (bit array vs ring vs heatmap) |
| `MetricsAside` — live `<dl>` metrics with warn/aha states | Math functions in `*-math.ts` |
| `CompareMode` — two-column “algorithm vs ground truth” | Demo presets (“overfill”, “find FP”) |
| `usePrefersReducedMotion` hook | Sim state machine in `*-sim.ts` |
| Lab CSS tokens from `tokens.css` | Pyodide default snippet content |
| `client:visible` hydration convention | WASM exports matching repo `.rs` API |
| `role="status"` live regions | Pedagogical intro copy |

### 4.3 Pedagogy checklist (from Bloom)

1. **Defaults that teach** — Bloom opens in manual mode with a slightly cramped filter so FP is visible.
2. **Compare mode** — Bloom filter vs exact set side-by-side; “definitely not” callout when a probe bit is zero.
3. **Preset scenarios** — Demo set, Overfill (mistake), Find FP, Clear.
4. **Formula transparency** — Metrics panel shows fill %, estimated FP, optimal \(k\); hints reference Python source.
5. **Accessibility** — Tab panels with arrow keys; canvas `role="img"` + `aria-label`; `aria-live` status line; reduced-motion respected.
6. **Parity** — JS sim uses same hash recipe as `bloom_filter.py` (MD5-based indices).

### 4.4 Lab tiers

| Tier | Description | Examples | Effort |
|------|-------------|----------|--------|
| **A — Bloom-scale** | Full island: controls + viz + metrics + compare + presets | Bloom, CMS, HLL, consistent hashing | **L** (1–2 weeks each) |
| **B — Mini-viz** | Shared `MiniSim` wrapper; 1–2 sliders + single chart | RED, PageRank toy, entropy, power-of-two | **S** (2–4 days) |
| **C — Prose-only** | Mermaid in README; catalog GitHub link | LLM infra, multi-agent, cloud orchestration | **none** |

---

## 5. Feasibility matrix (all 51 topics)

Priority key: **P0** = golden now; **P1** = full Tier A lab on roadmap; **P2** = Tier B or deferred Tier A; **none** = prose/catalog only.

| Slug | Title | Archetype | Priority | Lab concept (1 sentence) | Effort | Style |
|------|-------|-----------|----------|---------------------------|--------|-------|
| bloom-filters | Bloom Filters | membership-sketch | **P0** | Tune m/k/n on a live bit array and hunt false positives against an exact set. | L | Bloom |
| count-min-sketch | Count-Min Sketch | frequency-sketch | **P1** | Stream events into a CMS matrix and compare min-row estimate to true counts. | L | Bloom |
| consistent-hashing | Consistent Hashing | hashing-sharding | **P1** | Add/remove nodes on a hash ring and count how many keys remap vs stay put. | L | Bloom |
| hyperloglog | HyperLogLog | cardinality-sketch | **P1** | Fill HLL registers from a stream and compare harmonic-mean estimate to exact distinct count. | L | Bloom |
| rate-limiting | Rate Limiting | rate-limiter | **P1** | Burst requests against token-bucket/GCRA and visualize accept vs drop over time. | M | Bloom |
| tinylfu | TinyLFU | cache-eviction | **P1** | Replay a cache access trace with/without TinyLFU admission using CMS frequency estimates. | M | Bloom |
| gossip-protocols | Gossip Protocols | gossip-graph | **P1** | Step push/pull epidemic rounds on a peer graph until convergence or fanout limit. | M | Bloom |
| crdts-plus-probability | CRDTs + Probability | other | **P1** | Merge concurrent counter/OR-set states and show probabilistic compaction effects. | M | Bloom |
| power-of-two-choices | Power of Two Choices | scheduling | **P1** | Simulate balls-into-bins with random vs power-of-two assignment over many trials. | S | Lighter |
| spam-detection | Spam Detection | spam-classifier | **P1** | Classify sample emails with Naive Bayes word likelihoods and adjustable priors. | M | Bloom |
| queueing-theory | Queueing Theory | queueing | **P1** | Adjust λ and μ in an M/M/1-style sim and watch ρ, queue length, and wait times. | M | Bloom |
| pagerank | PageRank | graph-rank | P2 | Iterate power method on a small editable graph and watch rank stabilize. | S | Lighter |
| monte-carlo-systems | Monte Carlo Systems | monte-carlo | P2 | Running Monte Carlo estimate of π or an integral with variance vs sample count. | S | Lighter |
| monte-carlo-tree-search | Monte Carlo Tree Search | monte-carlo | P2 | Expand/simulate/backprop on a tiny game tree with exploration constant slider. | M | Lighter |
| randomized-algorithms | Randomized Algorithms | monte-carlo | P2 | Side-by-side Las Vegas vs Monte Carlo runtime/correctness on a toy problem. | S | Lighter |
| information-theory | Information Theory | information-theory | P2 | Build a symbol histogram and compute entropy/surprise vs a uniform baseline. | S | Lighter |
| probability-theory | Probability Theory | other | P2 | Dice/coin sims demonstrating LLN and basic axioms interactively. | S | Lighter |
| mapreduce | MapReduce | mapreduce-batch | P2 | Animate map/shuffle/reduce stages with a simulated worker failure and retry. | S | Lighter |
| raft-vs-gossip | Raft vs Gossip | consensus | P2 | Toggle Raft leader replication vs gossip epidemic on the same cluster topology. | M | Lighter |
| consensus-systems | Consensus Systems | consensus | P2 | Step through simplified Raft log replication with partition inject. | M | Lighter |
| probabilistic-consensus | Probabilistic Consensus | consensus | P2 | Show Nakamoto-style probabilistic finality vs commit threshold over rounds. | M | Lighter |
| eventual-consistency | Eventual Consistency | consensus | P2 | Version-vector timeline showing stale reads then convergence. | S | Lighter |
| random-early-detection | Random Early Detection | other | P2 | Queue fill vs probabilistic drop rate before tail-drop kicks in. | S | Lighter |
| streaming-algorithms | Streaming Algorithms | streaming-window | P2 | Meta-demo chaining CMS + HLL + Bloom on one synthetic event stream. | M | Lighter |
| streaming-analytics | Streaming Analytics | streaming-window | P2 | Windowed aggregations with watermarks on a scrolling event timeline. | M | Lighter |
| bayesian-inference-systems | Bayesian Inference Systems | bayesian | P2 | Slider prior/likelihood to show posterior updating with evidence chips. | S | Lighter |
| bayesian-distributed-systems | Bayesian Distributed Systems | bayesian | P2 | Small belief network over noisy cluster telemetry (Tier B graph). | M | Lighter |
| approximate-memory-cache-systems | Approximate Memory Cache Systems | cache-eviction | P2 | Diagram + slider linking Bloom/CMS to cache hit ratio (mostly prose). | S | Lighter |
| mixture-of-experts | Mixture of Experts | ml-routing | P2 | Toy MoE router sends tokens to 4 experts; show load imbalance. | M | HF optional |
| token-routing | Token Routing | ml-routing | P2 | Top-K expert selection heatmap on small embedding vectors. | M | HF optional |
| transformer-attention | Transformer Attention | ml-attention | P2 | 4×4 scaled dot-product attention from editable Q/K/V matrices. | M | HF optional |
| distributed-queues | Distributed Queues | queueing | P2 | Partition ordering tradeoff animation (Tier B). | S | Lighter |
| probabilistic-scheduling | Probabilistic Scheduling | scheduling | P2 | Randomized task placement histogram vs optimal (small N). | S | Lighter |
| probabilistic-databases | Probabilistic Databases | bayesian | P2 | Query uncertain tuples with confidence scores (Tier B table). | S | Lighter |
| statistical-learning | Statistical Learning | bayesian | none | Prose + loss/ bias-variance Mermaid; link to spam lab. | — | Prose |
| large-language-models | Large Language Models | ml-attention | none | Prose autoregression explainer; optional HF Space embed later. | — | HF optional |
| event-prediction-systems | Event Prediction Systems | streaming-window | none | Architecture prose; no standalone lab until code exists. | — | Prose |
| intelligent-realtime-platforms | Intelligent Realtime Platforms | streaming-window | none | Pipeline architecture diagrams only. | — | Prose |
| adaptive-cloud-orchestration | Adaptive Cloud Orchestration | infrastructure-prose | none | Closed-loop ops narrative; Mermaid only. | — | Prose |
| ai-probabilistic-infrastructure | AI Probabilistic Infrastructure | infrastructure-prose | none | Predictive scaling prose; no browser sim. | — | Prose |
| approximate-computing | Approximate Computing | other | none | Tradeoff tables; link to sketch topics. | — | Prose |
| autonomous-infrastructure | Autonomous Infrastructure | infrastructure-prose | none | Observe-decide-act loop prose. | — | Prose |
| distributed-systems | Distributed Systems | infrastructure-prose | none | Fallacies + CAP Mermaid; prerequisite hub. | — | Prose |
| go-backend-systems | Go Backend Systems | infrastructure-prose | none | Concurrency model prose; no lab. | — | Prose |
| large-scale-ml-infrastructure | Large Scale ML Infrastructure | infrastructure-prose | none | Parallelism taxonomy prose. | — | Prose |
| large-scale-multi-agent-systems | Large Scale Multi Agent Systems | other | none | Emergence prose; HF optional far future. | — | Prose |
| llm-infrastructure | LLM Infrastructure | infrastructure-prose | none | KV cache / batching prose; HF optional. | — | Prose |
| next-gen-ai-agents | Next Gen AI Agents | other | none | ReAct loop prose; out of scope v1. | — | Prose |
| proactive-ai-systems | Proactive AI Systems | infrastructure-prose | none | Forecast horizon prose. | — | Prose |
| reinforcement-learning-orchestration | RL Orchestration | scheduling | none | MDP prose; HF Space only if ever built. | — | HF optional |
| scalable-architectures | Scalable Architectures | infrastructure-prose | none | Scale-out patterns Mermaid hub. | — | Prose |

**Priority counts:** P0 = **1**, P1 = **10**, P2 = **18**, none = **22** (total **51**).

---

## 6. Hugging Face Spaces consideration

**Research artifact:** `chaitra/.research/huggingface-spaces-labs.json` — **pending** (not created yet). Analysis below is **provisional** until that research file lands.

### 6.1 HF Spaces vs self-hosted (Chaitra on Cloudflare Pages)

| Dimension | In-repo Astro islands | HF Spaces (Gradio/Static) |
|-----------|----------------------|---------------------------|
| UX consistency | Single design system, shared tokens, unified nav | iframe embed; different chrome; load latency |
| Maintainer burden | TS/React per lab; CI builds WASM | Separate repo/Space per demo; Python-first |
| Cloudflare fit | Static assets; no backend | External origin; CSP iframe rules |
| Py/Rust dual track | Pyodide + wasm-pack in monorepo | Python native; Rust via WASM in Space |
| Heavy ML (GPU) | Not feasible on Pages | HF GPU Spaces viable |
| Offline / a11y | Full control | Depends on Gradio defaults |
| Discoverability | Same domain, SEO | Split across huggingface.co |

### 6.2 When HF helps Chaitra

- **Transformer attention** at non-toy sequence lengths
- **MoE / token routing** with real embedding dims
- **RL orchestration** training loops
- **Optional** “Run full notebook” escape hatch (design spec excludes Binder; HF is lighter alternative)

### 6.3 When HF hurts

- Core **sketch/hash** topics — must match repo Python/Rust parity; iframe breaks the narrative→lab→code flow
- **51 Spaces** — operational nightmare vs 11 shared-pattern TS labs
- **Cloudflare Pages** value prop is fast static edge; HF adds third-party dependency

---

## 7. Options analysis

### Option A — Replicate Bloom pattern (Astro islands) for all P0/P1

**Pros:** Unified UX, parity with repo code, works offline-ish, aligns with Phase 1–3 plan, Lighthouse/a11y control.  
**Cons:** ~10 Tier A labs × 1–2 weeks = significant TS investment; WASM build matrix grows.

### Option B — HF Spaces per topic (iframe/embed)

**Pros:** Fast Python demos; GPU for ML topics; less frontend code.  
**Cons:** 51 Spaces unrealistic; inconsistent UI; iframe a11y poor; splits analytics; contradicts static Pages architecture.

### Option C — Hybrid (recommended)

**In-repo Tier A/B for:** All sketch, hash, rate-limit, gossip, queueing, spam, CRDT topics (P0/P1 + selected P2).  
**HF embed (optional, 3–5 Spaces max):** `transformer-attention`, `mixture-of-experts`, `token-routing`, maybe `reinforcement-learning-orchestration`.  
**Prose-only:** 22 infrastructure/agent topics.

**Reasoning for Chaitra specifically:**

1. **51 topics, one maintainer** — Shared `ParameterPanel`, `MetricsAside`, and archetype sim libs amortize cost; 51 custom Spaces does not.
2. **Cloudflare Pages** — Static-first; Pyodide + WASM already proven; no server budget for labs.
3. **Dual Py/Rust track** — Parity tests and wasm-pack live in monorepo; HF cannot be source of truth for Rust stubs.
4. **UX consistency** — Design spec mandates narrative → lab → code on one page; iframes break that flow for core curriculum.
5. **Honest scope** — 22 topics are architecture prose; forcing labs would dilute quality.

---

## 8. Phased rollout plan

Assumes subagent-driven implementation **after user approves this strategy**. Durations are calendar weeks with focused agent sessions.

| Phase | Weeks | Topics promoted to `live` | Deliverables |
|-------|-------|---------------------------|--------------|
| **1** (done) | 0 | `bloom-filters` (golden) | Bloom lab, Pyodide, WASM, TopicLayout |
| **2** | 4–6 | `count-min-sketch`, `consistent-hashing`, `hyperloglog` | Shared `ParameterPanel`, `BitArrayCanvas`/heatmap/ring/HLL libs; deepen READMEs |
| **3** | 6–8 | `rate-limiting`, `tinylfu` | New repo py/rs stubs + Tier A labs; depends CMS |
| **4** | 8–10 | `gossip-protocols`, `crdts-plus-probability` | Graph sim lib; compare with `raft-vs-gossip` Tier B |
| **5** | 10–14 | `power-of-two-choices`, `spam-detection`, `queueing-theory` | Tier A/B labs using shared mini-sim |
| **6** | 14–20 | 8–10 P2 topics (pagerank, monte-carlo-*, information-theory, mapreduce, consensus trio) | Tier B `MiniSim` component; batch promote to `live` |
| **7** | ongoing | Optional HF embeds (3–5) | `LabEmbed` Astro component + CSP; Spaces linked from ML topics |
| **—** | — | 22 `none` topics | README deepen only; catalog GitHub links; no `#lab` section |

**Catalog evolution:** `coded` → `live` when MDX + lab ship; keep `golden` for Bloom only (or demote to `live` once others match feature parity).

---

## 9. Implementation plan additions (Tasks 27+)

Add to `2026-05-28-chaitra-website-implementation-plan.md` after Task 26:

| Task | Goal | Depends on |
|------|------|------------|
| **27** | Extract shared lab primitives: `ParameterPanel`, `MetricsAside`, `usePrefersReducedMotion`, lab CSS module | Task 10 |
| **28** | Archetype sim library scaffold: `lib/sketches/` (hash utils, stream injector) | Task 27 |
| **29** | Count-Min Sketch Tier A lab + math/sim parity with `count_min_sketch.py` | Tasks 12–13, 28 |
| **30** | Consistent hashing ring lab + vnode controls | Tasks 12–14, 28 |
| **31** | HyperLogLog register lab + cardinality metrics | Tasks 12–15, 28 |
| **32** | Promote coded four to `live`; extend `[slug].astro` for all `live` topics | Tasks 29–31 |
| **33** | `RATE_LIMITING/` py/rs stubs + token-bucket lab | Task 32 |
| **34** | `TINYLFU/` py/rs stubs + cache admission lab (uses CMS lib) | Task 29, 33 |
| **35** | Gossip graph sim + `GOSSIP_PROTOCOLS/` deepen + lab | Task 32 |
| **36** | CRDT merge viz + `CRDTS_PLUS_PROBABILITY/` deepen | Task 35 |
| **37** | Tier B `MiniSim` wrapper + first batch (power-of-two, entropy, RED) | Task 27 |
| **38** | Spam detection Naive Bayes lab + `SPAM_DETECTION/` py stub | Task 37 |
| **39** | Queueing theory discrete-event lab | Task 37 |
| **40** | PageRank + Monte Carlo Tier B labs | Task 37 |
| **41** | Consensus compare lab (`raft-vs-gossip` + timeline) | Task 35 |
| **42** | `LabEmbed.astro` for optional HF Spaces (CSP, lazy iframe) | Task 32 |
| **43** | Create `.research/huggingface-spaces-labs.json` — Space inventory + embed policy | Task 42 |
| **44** | Catalog status automation: `golden` / `live` / `coded` rules in `generate-catalog.mjs` | Task 8 |
| **45** | Lab QA checklist script: a11y smoke (axe) per topic route | Task 10 |
| **46** | P2 batch rollout tracker in `topics.json` (`labTier`: A/B/none) | Task 44 |

---

## 10. Decision log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Primary lab platform | Astro React islands | Proven on Bloom; static Pages compatible |
| HF Spaces role | Optional embed for 3–5 ML-heavy topics | GPU/toy LLM demos; not core sketches |
| Topics without labs | 22 infrastructure/agent topics | Honest scope; Mermaid sufficient |
| Lab tier for P2 | Tier B mini-viz first | Ship teaching value without 2-week Bloom clones |
| WASM scope | P0/P1 topics with `hasRust: true` | Match repo parity; skip WASM for prose-only |
| Sync strategy | Keep one-way README → MDX | Bi-directional out of scope v1 |

---

## 11. Approval gate

**Subagent-driven-development for lab implementation starts only after user approves this strategy.**

Open questions for approval:

1. Confirm **P1 list (10 topics)** — add/remove any before Phase 2–5 execution?
2. Accept **22 prose-only** topics for v1, or promote any to P2 prematurely?
3. Authorize **3–5 HF Spaces** for ML topics in Phase 7, or stay 100% in-repo?

---

## Appendix — Bloom file map (reference)

| File | Role |
|------|------|
| `website/src/components/BloomFilterLab.tsx` | React island UI |
| `website/src/lib/bloom-math.ts` | FP rate, optimal k, sizing |
| `website/src/lib/bloom-sim.ts` | MD5 hash indices, bit array build |
| `website/src/content/topics/bloom-filters/index.mdx` | MDX wrapper + `client:visible` |
| `website/src/content/topics/bloom-filters/code.mdx` | CodePanel integration |
| `website/src/components/PyodideRunner.tsx` | In-browser Python |
| `website/src/components/WasmBloomRunner.tsx` | WASM demo loader |
| `website/scripts/sync-readme.mjs` | README → readme-body.md |
