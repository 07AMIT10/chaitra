# Task 4 — Bloom Filter Interactive Lab: Research Brief

**Scope:** `BloomFilterLab` React island on `/topics/bloom-filters` (Astro 5, `@astrojs/react`, React 19). Aligns with design Appendix A and Task 4 in the implementation plan.

**Sources:** [Astro islands](https://docs.astro.build/en/concepts/islands/), [React 19](https://react.dev), [WCAG 2.2](https://www.w3.org/WAI/WCAG22/), [MDN — Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).

---

## Recommended stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Island** | `<BloomFilterLab client:visible />` in MDX `#lab` | Below narrative; defer JS until lab scrolls into view. Protects LCP on static MDX. |
| **Alternates** | `client:load` if lab above fold; `client:idle` for Pyodide/WASM islands | `client:only` only for SSR/DOM mismatch — avoid by default. |
| **State** | Controlled `m`, `n`, `k`; `bloom-math.ts` for FP + optimal k | Derive bit pattern + metrics via `useMemo`; no mirrored state. |
| **Bit viz** | **Canvas 2D**, cap `m ≤ 10_240` | ~10k SVG nodes hurt; canvas batch-draw stays smooth. `role="img"` + summary `aria-label`. |
| **Controls** | Native `<input type="range">` + HTML metrics | WCAG-friendly; skip D3 for three sliders + one heatmap strip. |
| **WASM/Pyodide** | Separate island, `visible` or `idle` | Don’t block lab hydration on heavy runtimes. |
| **Canvas paint** | `useEffect` / rAF on deps; not render-phase `ref` | Integer coords; redraw on m/n/k only (MDN). |

**Hydration:** One visible island ≈ one React chunk + lab bundle. Don’t `client:load` multiple heavy islands on the same topic page.

---

## Do / Don't — engaging labs (original patterns only)

| Do | Don't |
|----|-------|
| Defaults that teach (m=64, n=8, k≈optimal k) + instant FP % / fill | Empty UI or meaningless m=n=k=1 |
| "Break it" presets (tiny m, huge n, wrong k) | Sliders only, no story |
| Compare exact `Set` vs Bloom on same keys | Bloom-only, no ground truth |
| Progressive disclosure for hash math | All formulas + controls upfront |
| Probe steps on insert (honor `prefers-reduced-motion`) | Continuous animation every tick |
| `aria-live="polite"` FP updates | Silent visual-only changes |
| Keyboard-operable native ranges | Drag-only custom sliders |
| Link code/WASM in `#code`, not inside lab v1 | Copy VisuAlgo flows or UI |

---

## Minimal component API sketch

```tsx
type BloomPreset = "teaching" | "break-fill" | "break-k" | "collision-heavy";

type BloomFilterLabProps = {
  initialM?: number;
  initialN?: number;
  initialK?: number;
  mMin?: number;   // 16
  mMax?: number;   // 10240
  sampleKeys?: string[];
  presets?: BloomPreset[];
  mode?: "bloom" | "compare-exact";
  onChange?: (s: {
    m: number; n: number; k: number;
    falsePositiveRate: number; optimalK: number; fillRatio: number;
  }) => void;
};
// onChange on m|n|k|mode; optional onProbeStep for live region text
```

```mdx
import BloomFilterLab from "../../../components/BloomFilterLab.tsx";
<BloomFilterLab client:visible />
```

---

## Three Bloom-specific UX ideas

1. **Bouncer vs vault** — Batch query: exact set vs Bloom. Preset `collision-heavy` adds a non-member Bloom accepts; live region: *false positive; exact set said no.*

2. **Optimal k ghost** — k slider with marker at `optimalK(m,n)`. "Break it" sets k=1 and k=2× optimal; heatmap + FP show why overshooting k hurts after saturation.

3. **Fill cliff** — Fix m, raise n until FP crosses 5%/10%; heatmap densifies; formula panel unlocks only after cliff — experiment before math.

---

## Accessibility (WCAG 2.2)

- **Keyboard (2.1.1, 2.4.7):** Tab/arrow on ranges; visible focus.
- **Ranges:** `<label>`, `min`/`max`/`step`, `aria-valuetext`. Skin with hidden native input ([W3C slider example](https://www.w3.org/WAI/WCAG22/working-examples/providing-single-point-control-slider/)).
- **Live regions:** FP % / FP events → `role="status"` `aria-live="polite"`.
- **Canvas:** Summary label; optional "bit table" for SR detail — not 10k tab stops.
- **Motion (2.3.3):** `prefers-reduced-motion: reduce` → instant updates, no probe animation.
- **Contrast:** On/off bits use token colors + luminance, not hue alone.

---

## Visualization

- **≤500 visible bits:** SVG possible; still prefer canvas if repainting every slider move.
- **≤10k:** Canvas; batch `fillRect` or `ImageData`; offscreen layer if only highlights change.
- **D3:** Skip v1. Plain React + `bloom-math` scales; D3 only if Phase 2 adds FP-vs-m curve chart.

---

## Task 4 guardrails

- Files: `BloomFilterLab.tsx`, `bloom-math.ts`, wire `index.mdx` `#lab` only.
- v1 scaffold: m slider 16–256 per plan; `mMax` prop reserved for zoom/pan later.
- Lab stands alone for manual test; Pyodide/WASM are Tasks 5–6.
