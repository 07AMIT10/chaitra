# Golden topic checklist

Per-topic sign-off against the **Bloom golden** rubric from the [lab topics golden enrichment design spec](../../docs/superpowers/specs/2026-05-28-lab-topics-golden-enrichment-design.md).

## Definition of done — “Bloom golden” rubric

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

## Per-topic sign-off

| Slug | Narrative | Lab | Code | A11y | Build | Promoted golden | Date |
|------|-----------|-----|------|------|-------|-----------------|------|
| count-min-sketch | ✓ | ✓ | ✓ (Pyodide; Rust on GitHub) | ✓ | ✓ | yes | 2026-05-30 |
| hyperloglog | ✓ | ✓ | ✓ (Pyodide; Rust on GitHub) | ✓ | ✓ | yes | 2026-05-30 |
| consistent-hashing | ✓ | ✓ | ✓ (Pyodide; Rust on GitHub) | ✓ | ✓ | yes | 2026-05-30 |
| tinylfu | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
| rate-limiting | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
| gossip-protocols | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
| spam-detection | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
| power-of-two-choices | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
| queueing-theory | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
| crdts-plus-probability | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
| pagerank | ✓ | ✓ | n/a (README only) | ✓ | ✓ | yes | 2026-05-30 |
