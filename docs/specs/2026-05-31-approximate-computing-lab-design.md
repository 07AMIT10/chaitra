# Design: Approximate Computing — full interactive lab

**Status:** Approved (2026-05-31)  
**Page:** [/topics/approximate-computing](https://chaitra.pages.dev/topics/approximate-computing/)  
**Replaces:** `GenericPreviewLab` + `preview-lab-config` entry for `approximate-computing`

## Goal

Replace the placeholder preview lab with a **Tier A** lab that makes the README math intuitive. Learner chose **all pillars**: quantization, energy–error (hardware), and loop perforation — delivered as **one lab with three tabs**, not three separate pages.

## Non-goals (v1)

- Story text zoom controls (deferred site-wide)
- Full LLM weight matrix or GPU benchmark (too heavy for browser)
- QAT / GPTQ implementation — conceptual only
- Changing topic slug or narrative structure beyond small cross-links

## Research anchors (pedagogy)

| Pillar | Core idea | Visual pattern (from edu sites) |
|--------|-----------|----------------------------------|
| **Quantization** | $S$, $x_q$, $\mathrm{Var}(\epsilon)=S^2/12$; memory ∝ $b$ | Number line + staircase histogram ([EngineersOfAI](https://engineersofai.com/playground/quantisation), [Zhiqiang Wang](https://zhiqwang.com/posts/neural-network-quantization-interactive/)) |
| **Energy–error** | $P \propto fCV^2$; lower $V$ → timing errors $P_{err}(V)$ | Dual-axis or linked sliders ([MDPI DSE survey](https://www.mdpi.com/2079-9292/13/22/4442)) |
| **Loop perforation** | Skip fraction of iterations → runtime ↓, output error ↑ | Running sum / average convergence ([loop perforation](https://doi.org/10.1145/2025113.2025133)) |

## Architecture

```
ApproximateComputingLab.tsx
├── lib/approximate-computing-math.ts   # pure formulas
├── lib/approximate-computing-sim.ts    # quant, voltage curve, loop sim
├── ApproximateComputingLab.css
└── uses LabShell, LabTabs, LabTabPanel, RangeControl, MetricsAside, PredictReveal, ScenarioPresets
```

**Wire-up**

- `website/src/content/topics/approximate-computing/index.mdx` → import `ApproximateComputingLab` instead of `GenericPreviewLab`
- `generate-topic-mdx.mjs` / catalog: set `approximate-computing` to Tier A; `resolveStatus` → `golden` when lab island detected
- Remove `approximate-computing` from `preview-lab-config.ts` (or leave unused)

## Tab 1 — Precision & quantization (hero)

**Teaches:** README § Precision scaling + § Quantization error modeling + LLM VRAM story.

**Controls**

- Bit width $b$: slider 2–16 (snaps at 4, 8, 16 presets)
- Value $x$: slider on $[\alpha, \beta]$ (default $[0, 4]$, preset “π-like” demo value 3.14159)
- Range preset: Uniform $[0,1]$ | Symmetric $[-1,1]$ | “Weight-like” (narrow Gaussian draws for histogram only)

**Visuals**

1. **SVG number line** — grid at quant levels; marker at $x$ and $x_q$; bracket for $\epsilon$
2. **Metrics aside** — $S$, $x_q$, $|\epsilon|$, $\mathrm{Var}(\epsilon)=S^2/12$, **memory factor** $32/b$ (labeled heuristic vs FP32)
3. **Histogram** (canvas or SVG) — ~200 samples; outline of empirical distribution + stepped quantized levels
4. **PredictReveal** — “Halving $b$ (same range) multiplies $\mathrm{Var}(\epsilon)$ by ~4?” → Yes (uniform bucket model)

**Formulas (math module)**

```ts
scaleFactor(alpha, beta, b) => (beta - alpha) / (2**b - 1)
quantize(x, alpha, beta, b) => round(x / S) * S clamped to [alpha, beta]
quantizationVariance(S) => (S * S) / 12
```

## Tab 2 — Energy vs error (hardware)

**Teaches:** README § Energy–error tradeoff ($P \propto fCV^2$, $P_{err}(V)$).

**Controls**

- Supply voltage $V$: 0.6–1.0 (normalized “nominal = 1.0”)
- Optional: target error budget slider (1–15%) for “safe zone” highlight

**Visuals**

1. **Chart** — $P_{norm} \approx V^2$ curve; second series $P_{err}(V)$ using a simple sigmoid or piecewise model (documented as **pedagogical**, not SPICE-accurate):

   $P_{err}(V) = \frac{1}{1 + \exp(k(V - V_{th}))}$ with $V_{th} \approx 0.85$, $k$ tuned for readable chart

2. **Metrics** — relative power %, estimated error rate %, “in safe region?” boolean
3. **PredictReveal** — “Lowering $V$ always reduces power?” → Yes; “Can error rate hit zero and power stay minimal?” → No (tradeoff)

**Copy:** One-line callout that real chips use guardbands; approximate computing **intentionally** operates past the guardband with bounded $P_{err}$.

## Tab 3 — Loop perforation (software)

**Teaches:** README § Loop perforation (skip iterations → faster, approximate average).

**Controls**

- Skip rate $p$: 0–50% (step 5%)
- Loop length $N$: 1k / 10k / 100k preset
- Signal: **noisy average** (random walk + noise) or **smooth sine** (deterministic ground truth)

**Visuals**

1. **Running estimate chart** — true mean vs estimate with perforation (update every k displayed samples for perf)
2. **Metrics** — iterations executed $(1-p)N$, speedup $\approx 1/(1-p)$, |error| vs exact mean
3. **Play / pause** (respect `prefers-reduced-motion` — static snapshot if reduced)
4. **PredictReveal** — “10% skip ≈ 10% faster?” → ~Yes; “Skip 50% with zero error?” → No

**Simulation**

```ts
// Perforated loop: for i in 0..N-1, with prob p skip; accumulate sum/count
// Compare to full loop mean for same RNG seed where applicable
```

## Shared lab chrome

- **Intro** (LabShell): “Three ways systems trade exactness for speed — pick a tab.”
- **Scenario presets** (top-level or per-tab):
  - “LLM INT4” → Tab 1: $b=4$, range for normalized weights
  - “Aggressive undervolt” → Tab 2: $V=0.75$
  - “Fast approximate reduce” → Tab 3: $p=0.2$, $N=10k$
- **Mobile:** reuse `topic-page.css` + `lab.css` breakpoints; charts `max-width: 100%`, overflow-x auto
- **A11y:** tabs keyboard-nav (existing `LabTabs`); charts `aria-label`; play button `aria-pressed`

## Story integration (small README edits)

- After “Diagram 1”, add: “Open the **Lab → Precision** tab to see buckets for each bit width.”
- After energy equation, link **Lab → Energy**.
- After loop perforation paragraph, link **Lab → Loops**.
- Optional: shorten ASCII bit block; lab replaces hands-on part.

## Catalog & status

| Field | Value |
|-------|--------|
| `labTier` | `A` |
| `status` | `golden` (after lab + polish) |
| `hasLab` | `true` (detected via `ApproximateComputingLab` in index.mdx) |

## Testing

- `approximate-computing-math.test.mjs` — quantize, variance, scale monotonicity in $b$
- Manual: mobile 390px all three tabs; reduced motion; Bloom page regression unchanged
- `npm run build` + catalog

## Implementation order

1. Math + sim modules + unit tests  
2. Tab 1 (quant) — highest value  
3. Tab 2 (energy)  
4. Tab 3 (loop)  
5. Wire MDX, remove GenericPreviewLab, catalog golden, README cross-links  
6. `sync:readme` if README edited at repo root  

## Risks

| Risk | Mitigation |
|------|------------|
| Large lab file | Split tab panels into subcomponents if >400 lines |
| $P_{err}(V)$ criticized as oversimplified | Label “illustrative curve” in UI |
| Loop animation jank on mobile | Cap draw rate; static mode on reduced motion |

## Follow-ups (later)

- Error heatmap for matrix of values (quant extension)
- Link to `LLM_INFRASTRUCTURE` topic from Tab 1 preset
