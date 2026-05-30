# Lab Topics Golden Enrichment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring all 34 `hasLab: true` topics to Bloom golden quality (narrative + domain lab + code parity).

**Architecture:** Shared lab primitives in `website/src/components/lab/`; per-topic `*-math.ts`, `*-sim.ts`, `<Topic>Lab.tsx`; README sync → MDX; promote `topics.json` status to `golden` per wave. See [design spec](../specs/2026-05-28-lab-topics-golden-enrichment-design.md).

**Tech Stack:** Astro 5, React 19 islands, TypeScript sim libs, Pyodide, optional WASM, Mermaid via `MermaidInit`, KaTeX.

---

## File map (platform)

| File | Responsibility |
|------|----------------|
| `website/docs/golden-topic-checklist.md` | Human/agent rubric copy from spec §2 |
| `website/src/components/lab/ComparePanel.tsx` | Two-column compare layout |
| `website/src/components/lab/ScenarioPresets.tsx` | Preset button row |
| `website/src/components/lab/PredictReveal.tsx` | Prompt + reveal slot |
| `website/src/components/lab/index.ts` | Re-exports |
| `website/src/components/lab/lab.css` | Styles for new primitives |

---

## Task 0: Golden checklist doc

**Files:**
- Create: `website/docs/golden-topic-checklist.md`

- [ ] **Step 1:** Copy rubric table from `docs/superpowers/specs/2026-05-28-lab-topics-golden-enrichment-design.md` §2 into `website/docs/golden-topic-checklist.md` with a per-topic sign-off section (slug, date, reviewer).

- [ ] **Step 2:** Commit

```bash
git add website/docs/golden-topic-checklist.md docs/superpowers/specs/2026-05-28-lab-topics-golden-enrichment-design.md
git commit -m "docs: add golden lab topic enrichment spec and checklist"
```

---

## Task 1: ComparePanel component

**Files:**
- Create: `website/src/components/lab/ComparePanel.tsx`
- Modify: `website/src/components/lab/index.ts`
- Modify: `website/src/components/lab/lab.css`

- [ ] **Step 1:** Create `ComparePanel.tsx`:

```tsx
import type { ReactNode } from "react";

type Props = {
  left: ReactNode;
  right: ReactNode;
  leftLabel?: string;
  rightLabel?: string;
};

export function ComparePanel({ left, right, leftLabel = "Algorithm", rightLabel = "Ground truth" }: Props) {
  return (
    <div className="lab__compare lab__compare--panel" role="group" aria-label={`${leftLabel} versus ${rightLabel}`}>
      <div>
        <strong>{leftLabel}</strong>
        {left}
      </div>
      <div>
        <strong>{rightLabel}</strong>
        {right}
      </div>
    </div>
  );
}
```

- [ ] **Step 2:** Export from `lab/index.ts` and add `.lab__compare--panel` gap rules in `lab.css` if needed.

- [ ] **Step 3:** Run `cd website && npm run build` — expect PASS.

- [ ] **Step 4:** Commit `feat(website): add ComparePanel lab primitive`

---

## Task 2: ScenarioPresets component

**Files:**
- Create: `website/src/components/lab/ScenarioPresets.tsx`
- Modify: `website/src/components/lab/index.ts`, `lab.css`

- [ ] **Step 1:** Implement preset row:

```tsx
export type ScenarioPreset = { id: string; label: string; onSelect: () => void };

type Props = { presets: ScenarioPreset[]; "aria-label"?: string };

export function ScenarioPresets({ presets, "aria-label": ariaLabel = "Scenario presets" }: Props) {
  return (
    <div className="lab__presets" role="group" aria-label={ariaLabel}>
      {presets.map((p) => (
        <button key={p.id} type="button" className="lab__btn lab__btn--ghost" onClick={p.onSelect}>
          {p.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2:** Style `.lab__presets` in `lab.css` (flex wrap, gap).

- [ ] **Step 3:** Build + commit `feat(website): add ScenarioPresets lab primitive`

---

## Task 3: PredictReveal component

**Files:**
- Create: `website/src/components/lab/PredictReveal.tsx`
- Modify: `website/src/components/lab/index.ts`

- [ ] **Step 1:** Implement controlled reveal:

```tsx
import { useState, type ReactNode } from "react";

type Props = {
  prompt: ReactNode;
  children: ReactNode;
  revealLabel?: string;
};

export function PredictReveal({ prompt, children, revealLabel = "Show result" }: Props) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="lab__predict">
      <p className="lab__predict-prompt">{prompt}</p>
      {!revealed ? (
        <button type="button" className="lab__btn" onClick={() => setRevealed(true)}>
          {revealLabel}
        </button>
      ) : (
        <div className="lab__predict-result">{children}</div>
      )}
    </div>
  );
}
```

- [ ] **Step 2:** Build + commit `feat(website): add PredictReveal lab primitive`

---

## Task 4: Refactor Bloom to use shared primitives (reference)

**Files:**
- Modify: `website/src/components/BloomFilterLab.tsx`

- [ ] **Step 1:** Replace inline `lab__compare` block with `<ComparePanel>` where it matches probe UI.

- [ ] **Step 2:** Wire demo/overfill/clear buttons through `<ScenarioPresets>` if it reduces duplication.

- [ ] **Step 3:** Manual test `/topics/bloom-filters` — lab unchanged in behavior.

- [ ] **Step 4:** Commit `refactor(website): Bloom lab uses shared compare/preset primitives`

---

## Repeatable task template — golden one topic

Use this template for **each** non-golden slug. Replace `<slug>`, `<Topic>`, `<TOPIC_FOLDER>`, archetype notes from [labs strategy §5](../specs/2026-05-28-all-topics-labs-strategy.md).

### Task Wn: Golden — `<slug>`

**Files:**
- Create/modify: `website/src/lib/<slug-math>.ts`, `<slug>-sim.ts` (kebab → camel file names per existing convention, e.g. `cms-math.ts`)
- Create/modify: `website/src/components/<Topic>Lab.tsx`
- Modify: `website/src/content/topics/<slug>/index.mdx`
- Modify: `<TOPIC_FOLDER>/README.md` then `npm run sync:readme`
- Create (if `hasPython`): `website/src/content/topics/<slug>/code.mdx`, `website/src/assets/code/<file>.py.txt`
- Modify: `website/src/data/topics.json` — `"status": "golden"`

**Narrative**
- [ ] Add Prerequisites mermaid, when-to-use table, lab bridge paragraph to README.
- [ ] Run `cd website && npm run sync:readme`.
- [ ] Add/update `index.mdx` callout (match Bloom pattern).

**Simulation**
- [ ] Implement `*-sim.ts` with same hashing/API as repo Python where applicable.
- [ ] Implement `*-math.ts` for formulas shown in metrics.

**Lab**
- [ ] Replace MiniSim or thin Tier A with full lab: viz + `MetricsAside` + `ComparePanel` + `ScenarioPresets` + one `PredictReveal`.
- [ ] `client:visible` on lab in `index.mdx`.
- [ ] Sign off `website/docs/golden-topic-checklist.md` for slug.

**Code**
- [ ] If `hasPython`: add `code.mdx` + Pyodide default from repo.

**Verify**
- [ ] `cd website && npm run build` — PASS.
- [ ] Commit: `feat(website): golden topic <slug>`

---

## Wave 1 tasks (10 topics)

Execute template above in order:

- [x] **Task 5:** `count-min-sketch` — extend existing `CountMinSketchLab` + `cms-sim.ts` to full golden (compare, presets, predict-reveal).
- [x] **Task 6:** `hyperloglog`
- [x] **Task 7:** `consistent-hashing`
- [x] **Task 8:** `tinylfu`
- [x] **Task 9:** `rate-limiting`
- [x] **Task 10:** `gossip-protocols`
- [x] **Task 11:** `spam-detection`
- [x] **Task 12:** `power-of-two-choices`
- [x] **Task 13:** `queueing-theory`
- [x] **Task 14:** `crdts-plus-probability`

**Wave 1 gate:** ✓ All 10 slugs `status: "golden"`; `npm run build` PASS (2026-05-30); update homepage `FeaturedLabs` if needed.

---

## Wave 2 tasks (10 topics)

- [x] **Task 15:** `pagerank`
- [x] **Task 16:** `mapreduce`
- [x] **Task 17:** `raft-vs-gossip`
- [x] **Task 18:** `consensus-systems`
- [x] **Task 19:** `probabilistic-consensus`
- [ ] **Task 20:** `eventual-consistency`
- [x] **Task 21:** `random-early-detection`
- [ ] **Task 22:** `distributed-queues`
- [x] **Task 23:** `approximate-memory-cache-systems`
- [x] **Task 24:** `probabilistic-scheduling`

**Wave 2 gate:** ✓ All 10 slugs `status: "golden"`; `npm run build` PASS (2026-05-30).

---

## Wave 3 tasks (10 topics)

- [x] **Task 25:** `bayesian-inference-systems`
- [ ] **Task 26:** `bayesian-distributed-systems`
- [ ] **Task 27:** `probabilistic-databases`
- [ ] **Task 28:** `streaming-algorithms` — split from meta MiniSim into real multi-sketch or dedicated narrative+lab
- [ ] **Task 29:** `streaming-analytics`
- [ ] **Task 30:** `monte-carlo-systems`
- [ ] **Task 31:** `monte-carlo-tree-search`
- [ ] **Task 32:** `randomized-algorithms`
- [ ] **Task 33:** `information-theory`
- [ ] **Task 34:** `probability-theory`

---

## Wave 4 tasks (3 topics)

- [ ] **Task 35:** `mixture-of-experts` — toy router matrix; optional HF embed in MDX only as supplement
- [ ] **Task 36:** `token-routing`
- [ ] **Task 37:** `transformer-attention`

---

## Task 38: Retire MiniSim as production path

**Files:**
- Modify: `website/src/components/MiniSimLab.tsx` — add deprecation comment
- Delete or empty: `website/src/components/minisim/*` after all imports removed
- Modify: `website/README.md` — document golden-only policy

- [ ] **Step 1:** Grep `MiniSimLab` / `minisim/` — ensure zero topic imports.

- [ ] **Step 2:** Remove dead files; build passes.

- [ ] **Step 3:** Commit `chore(website): remove MiniSim after golden migration`

---

## Task 39: Catalog golden enforcement (optional)

**Files:**
- Modify: `website/scripts/generate-catalog.mjs`

- [ ] **Step 1:** Warn when `hasLab && status !== 'golden'` (non-fatal).

- [ ] **Step 2:** Commit `chore(website): catalog warns on non-golden labs`

---

## Plan self-review (coverage)

| Spec § | Plan task |
|--------|-----------|
| §2 Rubric | Task 0 checklist |
| §3.3 Primitives | Tasks 1–3, 4 |
| §5 Waves | Tasks 5–37 |
| §6 Status | Per-topic template + Task 39 |
| MiniSim retire | Task 38 |
| Research pedagogy | Template + Tasks 1–3 |

No TBD placeholders in task steps above.

---

## Execution handoff

**Plan saved to:** `docs/superpowers/plans/2026-05-28-lab-topics-golden-enrichment.md`

**Two execution options:**

1. **Subagent-driven (recommended)** — one subagent per task (start Tasks 0–4 platform, then Wave 1 topics).
2. **Inline execution** — same order with checkpoints after each wave gate.

Which approach do you want?
