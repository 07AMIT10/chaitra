# Lab archetypes — building the next Tier A island

This guide describes how to add interactive labs after the shared primitives introduced in **Task 27** (`website/src/components/lab/`). Bloom filters remain the reference implementation (`BloomFilterLab.tsx`).

## When to use Tier A vs B

| Tier | Use when | Examples |
|------|----------|----------|
| **A** | Controls + domain viz + live metrics + compare/presets | Bloom, Count-Min, HLL, consistent hashing |
| **B** | 1–2 sliders + one chart via future `MiniSim` | PageRank toy, RED, entropy |
| **none** | Prose + Mermaid only | Infrastructure topics |

See `docs/superpowers/specs/2026-05-28-all-topics-labs-strategy.md` for the full 51-topic matrix.

## File layout (per live topic)

```
website/src/lib/<topic>-math.ts       # Formulas mirrored from Python
website/src/lib/<topic>-sim.ts        # Simulation core (parity with repo)
website/src/components/<Topic>Lab.tsx # Composes lab primitives
website/src/content/topics/<slug>/index.mdx
website/src/content/topics/<slug>/readme-body.md   # sync:readme from repo README
website/src/content/topics/<slug>/code.mdx           # optional CodePanel
```

## Shared primitives (import from `components/lab`)

| Component | Role |
|-----------|------|
| `LabShell` | Surface, border, optional intro paragraph |
| `LabTabs` / `LabTabPanel` | Accessible parameter mode tabs (arrow keys, Home/End) |
| `RangeControl` | Labeled slider + mono value + hint |
| `ParameterPanel` | Groups controls in the main column |
| `MetricsAside` | Live `<dl>` metrics; `tone: "warn" \| "aha"` |
| `BitGridCanvas` / `BitGridLegend` | 1D bit strips (Bloom; CMS row slices later) |
| `usePrefersReducedMotion` | Hook in `hooks/usePrefersReducedMotion.ts` |

Styles: import `./lab/lab.css` via `LabShell` or topic-specific CSS that `@import`s it.

## MDX wiring

```mdx
import CountMinSketchLab from "../../../components/CountMinSketchLab.tsx";

<h2 id="lab">Lab</h2>
<CountMinSketchLab client:visible />
```

Use `client:visible` so the island hydrates when scrolled into view (see `website/docs/task4-interactive-research-brief.md`).

## Pedagogy checklist (from Bloom)

1. **Defaults that teach** — slightly stressed parameters so error modes are visible.
2. **Compare mode** — algorithm estimate vs ground truth (`lab__compare` grid).
3. **Preset scenarios** — Demo, break-it, hunt edge case, Clear.
4. **Formula transparency** — metrics reference repo Python (`*_math.ts` hints).
5. **Accessibility** — tab keyboard nav; canvas `role="img"` + `aria-label`; `aria-live` status; reduced motion.
6. **Parity** — JS sim uses the same hash/recipe as the topic’s `.py` file.

## Promoting catalog status

1. Add `website/src/content/topics/<slug>/index.mdx` (+ run `npm run sync:readme`).
2. Set `"status": "live"` and a human title in `website/src/data/topics.json`.
3. Run `npm run catalog && npm run build`.
4. Ship the React lab before calling the topic “done”; stub `#lab` copy is OK until the lab lands.

## Next implementation tasks (strategy)

| Task | Deliverable |
|------|-------------|
| **28** | `lib/sketches/` — shared hash utils, stream injector |
| **29** | Count-Min Sketch Tier A lab |
| **30** | Consistent hashing ring lab |
| **31** | HyperLogLog register lab |
