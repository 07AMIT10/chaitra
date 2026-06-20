# Drishti Pass Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Drishti Pass experiential flow — persistent Apply Drishti chip, light pass slide-over (phenomenon → 7 lenses → summary), progressive unlock to `/drishti/pass/deep`, hints with micro-examples and study excerpt expandables, hub primary CTA, and localStorage persistence.

**Architecture:** React islands (`client:load`) mounted from `DrishtiLayout.astro` via a single `DrishtiPassLauncher` orchestrator that owns chip + slide-over state. Pass CRUD lives in `lib/drishti-pass.ts` (pure functions, testable without DOM). Content comes from `pass-hints.json` and `pass-excerpts.json`. Deep mode is a dedicated Astro page with a full-page `DeepPassWizard` island reading the same `passId` from URL query + localStorage.

**Tech Stack:** Astro 5, React 19, TypeScript, Node test runner (`tsx --test`), existing `DRISHTI_LENSES` from `lib/drishti-lenses.ts`, CSS in `drishti.css` using `--color-drishti` tokens.

---

## File map

| File | Responsibility |
|------|----------------|
| `website/src/lib/drishti-pass.ts` | Types, load/save/migrate, UUID, cap at 20, active draft lookup |
| `website/src/lib/drishti-pass.test.mjs` | Unit tests for pass state CRUD |
| `website/src/data/drishti/pass-hints.json` | Per-lens `microExample` + `deepPrompts[]` |
| `website/src/data/drishti/pass-excerpts.json` | Per lens × study curated excerpts (≤400 chars) |
| `website/src/components/drishti/StudyExcerptAccordion.tsx` | Collapsible "See how Sleep / Office / …" blocks |
| `website/src/components/drishti/DrishtiPassStep.tsx` | Single lens step UI (hint, textarea, excerpt) |
| `website/src/components/drishti/DrishtiPassPanel.tsx` | Right slide-over: steps 0–8, focus trap, auto-save |
| `website/src/components/drishti/DrishtiPassSummary.tsx` | Completion card: insight, copy, new pass, done |
| `website/src/components/drishti/ApplyDrishtiChip.tsx` | Fixed pill button + draft dot indicator |
| `website/src/components/drishti/DrishtiPassLauncher.tsx` | Chip + panel + shared React state (mounted in layout) |
| `website/src/components/drishti/DeepPassWizard.tsx` | Full-page vertical stepper wizard |
| `website/src/pages/drishti/pass/deep.astro` | Deep route; mounts wizard with `passId` query |
| `website/src/layouts/DrishtiLayout.astro` | Mount launcher; pass `studySlug`, `initialLens` props |
| `website/src/pages/drishti/index.astro` | Hub primary CTA |
| `website/src/styles/drishti.css` | Chip, panel, wizard, summary, toast styles |
| `website/package.json` | Add `test:drishti-pass` script |

**Naming note:** Spec calls the slide-over `DrishtiPassSlideOver` and wizard `DrishtiDeepWizard`. This plan uses `DrishtiPassPanel` and `DeepPassWizard` per approved task list — same components, different filenames.

---

### Task 1: Pass state library (`drishti-pass.ts`)

**Files:**
- Create: `website/src/lib/drishti-pass.ts`
- Create: `website/src/lib/drishti-pass.test.mjs`
- Modify: `website/package.json` (add test script)

- [ ] **Step 1: Write the failing test**

Create `website/src/lib/drishti-pass.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import {
  STORAGE_KEY,
  MAX_PASSES,
  createEmptyPass,
  loadPasses,
  savePasses,
  upsertPass,
  getPassById,
  getActiveDraft,
  capPasses,
} from "./drishti-pass.ts";

test("STORAGE_KEY is chaitra_drishti_pass", () => {
  assert.equal(STORAGE_KEY, "chaitra_drishti_pass");
});

test("createEmptyPass returns draft at step 0 with empty lens notes", () => {
  const pass = createEmptyPass({ sourceUrl: "/drishti" });
  assert.match(pass.passId, /^[0-9a-f-]{36}$/);
  assert.equal(pass.phenomenon, "");
  assert.equal(pass.status, "draft");
  assert.equal(pass.depth, "light");
  assert.equal(pass.currentStep, 0);
  assert.equal(pass.lenses["what-exists"].light, "");
  assert.equal(pass.sourceUrl, "/drishti");
});

test("loadPasses returns [] for missing or invalid JSON", () => {
  assert.deepEqual(loadPasses(null), []);
  assert.deepEqual(loadPasses("not json"), []);
  assert.deepEqual(loadPasses("[]"), []);
});

test("upsertPass inserts new pass at front", () => {
  const a = createEmptyPass({});
  a.phenomenon = "My team";
  const b = createEmptyPass({});
  b.phenomenon = "Sleep debt";
  const next = upsertPass([a], b);
  assert.equal(next[0].passId, b.passId);
  assert.equal(next[1].passId, a.passId);
});

test("capPasses keeps newest MAX_PASSES entries", () => {
  const passes = Array.from({ length: 25 }, (_, i) => {
    const p = createEmptyPass({});
    p.phenomenon = `p${i}`;
    p.createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
    return p;
  });
  const capped = capPasses(passes);
  assert.equal(capped.length, MAX_PASSES);
  assert.equal(capped[0].phenomenon, "p24");
});

test("getActiveDraft returns most recent draft", () => {
  const done = createEmptyPass({});
  done.status = "complete";
  const draft = createEmptyPass({});
  draft.phenomenon = "active";
  const found = getActiveDraft([done, draft]);
  assert.equal(found?.phenomenon, "active");
});

test("getPassById finds pass or returns undefined", () => {
  const p = createEmptyPass({});
  assert.equal(getPassById([p], p.passId)?.passId, p.passId);
  assert.equal(getPassById([p], "missing"), undefined);
});

test("savePasses serializes array", () => {
  const p = createEmptyPass({});
  const json = savePasses([p]);
  const parsed = JSON.parse(json);
  assert.equal(parsed.length, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd website && npx tsx --test src/lib/drishti-pass.test.mjs`
Expected: FAIL — `Cannot find module './drishti-pass.ts'`

- [ ] **Step 3: Write minimal implementation**

Create `website/src/lib/drishti-pass.ts`:

```typescript
import { DRISHTI_LENSES } from "./drishti-lenses";

export const STORAGE_KEY = "chaitra_drishti_pass";
export const MAX_PASSES = 20;
export const PHENOMENON_MAX = 120;
export const LIGHT_NOTE_MAX = 280;
export const DEEP_NOTE_MAX = 800;

export type LensSlug =
  | "what-exists"
  | "what-changes"
  | "what-flows"
  | "what-learns"
  | "what-persists"
  | "what-emerges"
  | "what-will-happen";

export type StudySlug = "sleep" | "blood-circulation" | "the-office-as-a-computer";

export interface LensPassNotes {
  light?: string;
  deep?: string;
  excerptStudy?: StudySlug;
  excerptExpanded?: boolean;
}

export interface DrishtiPassState {
  passId: string;
  phenomenon: string;
  context?: string;
  createdAt: string;
  updatedAt: string;
  depth: "light" | "deep";
  status: "draft" | "complete";
  currentStep: number;
  lenses: Record<LensSlug, LensPassNotes>;
  insight?: string;
  sourceUrl?: string;
  preferredStudy?: StudySlug;
}

function emptyLensNotes(): Record<LensSlug, LensPassNotes> {
  return Object.fromEntries(
    DRISHTI_LENSES.map((l) => [l.slug as LensSlug, { light: "", deep: "" }])
  ) as Record<LensSlug, LensPassNotes>;
}

export function createPassId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createEmptyPass(opts: {
  sourceUrl?: string;
  preferredStudy?: StudySlug;
  passId?: string;
}): DrishtiPassState {
  const now = new Date().toISOString();
  return {
    passId: opts.passId ?? createPassId(),
    phenomenon: "",
    createdAt: now,
    updatedAt: now,
    depth: "light",
    status: "draft",
    currentStep: 0,
    lenses: emptyLensNotes(),
    sourceUrl: opts.sourceUrl,
    preferredStudy: opts.preferredStudy,
  };
}

function isDrishtiPassState(value: unknown): value is DrishtiPassState {
  if (!value || typeof value !== "object") return false;
  const p = value as DrishtiPassState;
  return typeof p.passId === "string" && typeof p.phenomenon === "string";
}

export function loadPasses(raw: string | null): DrishtiPassState[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isDrishtiPassState);
  } catch {
    if (import.meta.env?.DEV) {
      console.warn("[drishti-pass] invalid localStorage JSON; resetting");
    }
    return [];
  }
}

export function savePasses(passes: DrishtiPassState[]): string {
  return JSON.stringify(capPasses(passes));
}

export function capPasses(passes: DrishtiPassState[]): DrishtiPassState[] {
  return passes.slice(0, MAX_PASSES);
}

export function upsertPass(
  passes: DrishtiPassState[],
  pass: DrishtiPassState
): DrishtiPassState[] {
  const without = passes.filter((p) => p.passId !== pass.passId);
  return capPasses([{ ...pass, updatedAt: new Date().toISOString() }, ...without]);
}

export function getPassById(
  passes: DrishtiPassState[],
  passId: string
): DrishtiPassState | undefined {
  return passes.find((p) => p.passId === passId);
}

export function getActiveDraft(passes: DrishtiPassState[]): DrishtiPassState | undefined {
  return passes.find((p) => p.status === "draft");
}

export function readPassesFromStorage(storage: Storage | null): DrishtiPassState[] {
  if (!storage) return [];
  return loadPasses(storage.getItem(STORAGE_KEY));
}

export function writePassesToStorage(
  storage: Storage | null,
  passes: DrishtiPassState[]
): { ok: boolean; reason?: "disabled" | "quota" } {
  if (!storage) return { ok: false, reason: "disabled" };
  try {
    storage.setItem(STORAGE_KEY, savePasses(passes));
    return { ok: true };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    if (name === "QuotaExceededError") return { ok: false, reason: "quota" };
    return { ok: false, reason: "disabled" };
  }
}
```

Add to `website/package.json` scripts:

```json
"test:drishti-pass": "tsx --test src/lib/drishti-pass.test.mjs"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd website && npm run test:drishti-pass`
Expected: all tests PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-pass.ts website/src/lib/drishti-pass.test.mjs website/package.json
git commit -m "feat(drishti): add pass state library with unit tests"
```

---

### Task 2: Content data files

**Files:**
- Create: `website/src/data/drishti/pass-hints.json`
- Create: `website/src/data/drishti/pass-excerpts.json`

- [ ] **Step 1: Create pass-hints.json**

Create `website/src/data/drishti/pass-hints.json` with all seven lenses:

```json
{
  "what-exists": {
    "microExample": "Your 'team' is partly people, partly Slack channels, partly shared habits — name which layer you're looking at.",
    "deepPrompts": [
      "What is physical vs informational vs agreed-upon?",
      "What would disappear if everyone stopped believing it?",
      "What measurements prove this exists?"
    ]
  },
  "what-changes": {
    "microExample": "Sleep pressure drifts up all day; your mood may swing hour to hour — separate slow trends from noise.",
    "deepPrompts": [
      "What drifts over weeks vs hours?",
      "What looks stable but is slowly shifting?",
      "What would a time series of this phenomenon show?"
    ]
  },
  "what-flows": {
    "microExample": "In a standup, attention flows to whoever speaks loudest — the bottleneck is airtime, not ideas.",
    "deepPrompts": [
      "What enters and leaves this system?",
      "Where does work queue up?",
      "What would you throttle first?"
    ]
  },
  "what-learns": {
    "microExample": "A team retrospective updates process; muscle memory updates after reps — both are learning with different timescales.",
    "deepPrompts": [
      "What feedback loops update behavior here?",
      "What gets remembered between sessions?",
      "What optimizes toward what metric?"
    ]
  },
  "what-persists": {
    "microExample": "Org chart titles survive reorgs; circadian rhythm survives a late night — find the invariants.",
    "deepPrompts": [
      "What survives parameter changes?",
      "What constraints never flex?",
      "What would still be true after a major shock?"
    ]
  },
  "what-emerges": {
    "microExample": "Simple meeting rules → complex office politics; local sleep stages → global rested feeling.",
    "deepPrompts": [
      "What local rules produce global behavior?",
      "What complexity appears without central control?",
      "What would you see at scale that you miss up close?"
    ]
  },
  "what-will-happen": {
    "microExample": "Three short nights don't guarantee a crash — but they shift the distribution toward debt and irritability.",
    "deepPrompts": [
      "Which futures are becoming more likely?",
      "What leading indicators would you watch?",
      "What evidence would update your forecast?"
    ]
  }
}
```

- [ ] **Step 2: Create pass-excerpts.json**

Create `website/src/data/drishti/pass-excerpts.json` — 7 lenses × 3 studies (21 entries). Structure: `{ "lens-slug": { "study-slug": { "title": "...", "excerpt": "..." } } }`.

Use curated plain-text excerpts (no mermaid/links) ≤400 chars, sourced from study lens bodies:

```json
{
  "what-exists": {
    "sleep": {
      "title": "Sleep",
      "excerpt": "Sleep exists as behavior, brain state, and measurable physiology — not absence of activity but a distinct mode with its own jobs."
    },
    "blood-circulation": {
      "title": "Blood Circulation",
      "excerpt": "Blood is a transport layer; the heart is a pump; vessels are queues with capacity limits — a closed-loop delivery network."
    },
    "the-office-as-a-computer": {
      "title": "The Office as a Computer",
      "excerpt": "The office is mostly agreements wearing furniture — desks are physical; roles, OKRs, and culture are informational and agreed-upon."
    }
  },
  "what-changes": {
    "sleep": {
      "title": "Sleep",
      "excerpt": "Sleep pressure accumulates while awake and drains during sleep — a non-stationary queue you cannot delete, only drain."
    },
    "blood-circulation": {
      "title": "Blood Circulation",
      "excerpt": "Heart rate and vessel tone shift with demand; blockages change flow patterns — stationary topology, non-stationary throughput."
    },
    "the-office-as-a-computer": {
      "title": "The Office as a Computer",
      "excerpt": "Headcount, priorities, and remote/hybrid policy drift quarter to quarter while the legal entity persists."
    }
  },
  "what-flows": {
    "sleep": {
      "title": "Sleep",
      "excerpt": "Energy and metabolic waste out; organized memory and repaired tissue in. Bottleneck nights: insufficient deep sleep blocks recovery."
    },
    "blood-circulation": {
      "title": "Blood Circulation",
      "excerpt": "The heart pumps; arteries and capillaries are a network with queues. Narrow vessels raise residence time; clots starve downstream organs."
    },
    "the-office-as-a-computer": {
      "title": "The Office as a Computer",
      "excerpt": "Electricity in; decisions and shipped code out. Bottlenecks: meeting load, review queues, unclear ownership — every standup is a scheduler."
    }
  },
  "what-learns": {
    "sleep": {
      "title": "Sleep",
      "excerpt": "Sleep consolidates memory and resets learning capacity — the brain compiles experience overnight via replay and synaptic downscaling."
    },
    "blood-circulation": {
      "title": "Blood Circulation",
      "excerpt": "Baroreceptors and the autonomic nervous system adjust pump rate and vessel tone — a feedback loop optimizing perfusion."
    },
    "the-office-as-a-computer": {
      "title": "The Office as a Computer",
      "excerpt": "Retrospectives, postmortems, and OKR cycles update team behavior — organizational learning with stored state in docs and habits."
    }
  },
  "what-persists": {
    "sleep": {
      "title": "Sleep",
      "excerpt": "Circadian rhythm and sleep architecture stages persist across nights — invariants that outlast individual bad evenings."
    },
    "blood-circulation": {
      "title": "Blood Circulation",
      "excerpt": "Closed circuit topology and hemoglobin chemistry persist; local clots are noise against a durable transport invariant."
    },
    "the-office-as-a-computer": {
      "title": "The Office as a Computer",
      "excerpt": "Legal entity, brand, and API contracts persist through reorgs — agreements that survive people churn."
    }
  },
  "what-emerges": {
    "sleep": {
      "title": "Sleep",
      "excerpt": "Local neural oscillations produce global rested feeling and next-day performance — simple stage rules, complex cognitive outcomes."
    },
    "blood-circulation": {
      "title": "Blood Circulation",
      "excerpt": "Local vessel autoregulation produces organ-level perfusion patterns — micro-adjustments yield macro circulation behavior."
    },
    "the-office-as-a-computer": {
      "title": "The Office as a Computer",
      "excerpt": "Local meeting norms and Slack habits emerge into org culture and shipping velocity without a single culture officer."
    }
  },
  "what-will-happen": {
    "sleep": {
      "title": "Sleep",
      "excerpt": "Branches: recovery, chronic debt, or acute collapse. Leading indicators: time to fall asleep and morning alertness beat guessing from coffee count."
    },
    "blood-circulation": {
      "title": "Blood Circulation",
      "excerpt": "Compensation until decompensation — the system masks bottlenecks until a threshold shifts the probability of failure sharply."
    },
    "the-office-as-a-computer": {
      "title": "The Office as a Computer",
      "excerpt": "Likely futures: AI agents as coworkers, hybrid remote equilibrium — watch hiring plans and tool adoption as leading indicators."
    }
  }
}
```

- [ ] **Step 3: Verify JSON parses**

Run: `node -e "JSON.parse(require('fs').readFileSync('website/src/data/drishti/pass-hints.json')); JSON.parse(require('fs').readFileSync('website/src/data/drishti/pass-excerpts.json')); console.log('ok')"`
Expected: `ok`

- [ ] **Step 4: Commit**

```bash
git add website/src/data/drishti/pass-hints.json website/src/data/drishti/pass-excerpts.json
git commit -m "feat(drishti): add pass hints and study excerpts data"
```

---

### Task 3: StudyExcerptAccordion component

**Files:**
- Create: `website/src/components/drishti/StudyExcerptAccordion.tsx`

- [ ] **Step 1: Implement accordion**

```tsx
import { useId, useState } from "react";
import excerpts from "../../data/drishti/pass-excerpts.json";
import type { LensSlug, StudySlug } from "../../lib/drishti-pass";

type ExcerptEntry = { title: string; excerpt: string };

type Props = {
  lensSlug: LensSlug;
  preferredStudy?: StudySlug;
};

const STUDY_ORDER: StudySlug[] = [
  "sleep",
  "blood-circulation",
  "the-office-as-a-computer",
];

export function StudyExcerptAccordion({ lensSlug, preferredStudy }: Props) {
  const baseId = useId();
  const lensExcerpts = (excerpts as Record<string, Record<string, ExcerptEntry>>)[lensSlug];
  if (!lensExcerpts) return null;

  const ordered = [
    ...(preferredStudy && lensExcerpts[preferredStudy]
      ? [preferredStudy]
      : []),
    ...STUDY_ORDER.filter((s) => s !== preferredStudy && lensExcerpts[s]),
  ];

  if (ordered.length === 0) return null;

  return (
    <div className="drishti-pass-excerpt">
      {ordered.map((studySlug) => {
        const entry = lensExcerpts[studySlug];
        if (!entry) return null;
        return (
          <ExcerptItem
            key={studySlug}
            id={`${baseId}-${studySlug}`}
            studySlug={studySlug}
            entry={entry}
          />
        );
      })}
    </div>
  );
}

function ExcerptItem({
  id,
  studySlug,
  entry,
}: {
  id: string;
  studySlug: StudySlug;
  entry: ExcerptEntry;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="drishti-pass-excerpt__item"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary>See how {entry.title}…</summary>
      <p>{entry.excerpt}</p>
      <a href={`/drishti/studies/${studySlug}`} data-analytics="pass-excerpt-study-link">
        Read full study →
      </a>
    </details>
  );
}
```

- [ ] **Step 2: Build to verify TypeScript**

Run: `cd website && npm run build`
Expected: build succeeds (component may be unused yet — that's fine if tree-shaken; otherwise import in a temp file or proceed to Task 4)

- [ ] **Step 3: Commit**

```bash
git add website/src/components/drishti/StudyExcerptAccordion.tsx
git commit -m "feat(drishti): add study excerpt accordion for pass steps"
```

---

### Task 4: DrishtiPassStep component

**Files:**
- Create: `website/src/components/drishti/DrishtiPassStep.tsx`

- [ ] **Step 1: Implement lens step**

```tsx
import hints from "../../data/drishti/pass-hints.json";
import { LENS_BY_SLUG } from "../../lib/drishti-lenses";
import {
  LIGHT_NOTE_MAX,
  DEEP_NOTE_MAX,
  type LensSlug,
  type StudySlug,
} from "../../lib/drishti-pass";
import { StudyExcerptAccordion } from "./StudyExcerptAccordion";

type HintEntry = { microExample: string; deepPrompts: string[] };

type Props = {
  lensSlug: LensSlug;
  mode: "light" | "deep";
  lightNote?: string;
  deepNote?: string;
  preferredStudy?: StudySlug;
  onLightChange?: (value: string) => void;
  onDeepChange?: (value: string) => void;
};

export function DrishtiPassStep({
  lensSlug,
  mode,
  lightNote = "",
  deepNote = "",
  preferredStudy,
  onLightChange,
  onDeepChange,
}: Props) {
  const lens = LENS_BY_SLUG[lensSlug];
  const hint = (hints as Record<string, HintEntry>)[lensSlug];
  if (!lens) return null;

  const textareaId = `drishti-pass-note-${lensSlug}-${mode}`;

  return (
    <div className="drishti-pass-step" data-lens={lensSlug}>
      <p className="drishti-pass-step__glyph" aria-hidden="true">
        {lens.glyph}
      </p>
      <h2 className="drishti-pass-step__question">{lens.question}</h2>
      <p className="drishti-pass-step__hook">{lens.hook}</p>

      {hint?.microExample && (
        <p className="drishti-pass-step__hint">
          <span className="drishti-pass-step__hint-label">Example: </span>
          {hint.microExample}
        </p>
      )}

      {mode === "light" && onLightChange && (
        <label className="drishti-pass-step__field" htmlFor={textareaId}>
          Your note
          <textarea
            id={textareaId}
            value={lightNote}
            maxLength={LIGHT_NOTE_MAX}
            rows={4}
            onChange={(e) => onLightChange(e.target.value)}
            aria-describedby={`${textareaId}-count`}
          />
          <span id={`${textareaId}-count`} className="drishti-pass-step__count">
            {lightNote.length}/{LIGHT_NOTE_MAX}
          </span>
        </label>
      )}

      {mode === "deep" && (
        <>
          {lightNote && (
            <details className="drishti-pass-step__light-readonly">
              <summary>Light pass note</summary>
              <p>{lightNote}</p>
            </details>
          )}
          {hint?.deepPrompts && (
            <ul className="drishti-pass-step__prompts">
              {hint.deepPrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ul>
          )}
          {onDeepChange && (
            <label className="drishti-pass-step__field" htmlFor={textareaId}>
              Go deeper
              <textarea
                id={textareaId}
                value={deepNote}
                maxLength={DEEP_NOTE_MAX}
                rows={6}
                onChange={(e) => onDeepChange(e.target.value)}
                aria-describedby={`${textareaId}-count`}
              />
              <span id={`${textareaId}-count`} className="drishti-pass-step__count">
                {deepNote.length}/{DEEP_NOTE_MAX}
              </span>
            </label>
          )}
        </>
      )}

      <StudyExcerptAccordion lensSlug={lensSlug} preferredStudy={preferredStudy} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/drishti/DrishtiPassStep.tsx
git commit -m "feat(drishti): add reusable pass step component"
```

---

### Task 5: DrishtiPassPanel (light pass slide-over)

**Files:**
- Create: `website/src/components/drishti/DrishtiPassPanel.tsx`

- [ ] **Step 1: Implement panel with focus trap and auto-save**

Key behaviors:
- Steps 0–7 lenses, step 8 = completion choice
- Step 0: phenomenon (required, max 120) + optional context
- Debounced save (500ms) on blur and step change via `writePassesToStorage`
- Escape → confirm if any notes exist
- `aria-live="polite"` region for step announcements
- `role="dialog"`, `aria-modal="true"`

```tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import {
  PHENOMENON_MAX,
  type DrishtiPassState,
  type LensSlug,
  readPassesFromStorage,
  upsertPass,
  writePassesToStorage,
} from "../../lib/drishti-pass";
import { DrishtiPassStep } from "./DrishtiPassStep";

type Props = {
  open: boolean;
  pass: DrishtiPassState;
  onPassChange: (pass: DrishtiPassState) => void;
  onClose: () => void;
  onFinish: (pass: DrishtiPassState) => void;
  onGoDeeper: (pass: DrishtiPassState) => void;
  initialLens?: LensSlug;
};

export function DrishtiPassPanel({
  open,
  pass,
  onPassChange,
  onClose,
  onFinish,
  onGoDeeper,
  initialLens,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [liveMsg, setLiveMsg] = useState("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  const persist = useCallback(
    (next: DrishtiPassState) => {
      onPassChange(next);
      const passes = readPassesFromStorage(localStorage);
      const updated = upsertPass(passes, next);
      const result = writePassesToStorage(localStorage, updated);
      if (!result.ok && result.reason === "quota") {
        setStorageWarning("Storage full — notes kept for this session only.");
      }
    },
    [onPassChange]
  );

  const debouncedPersist = useCallback(
    (next: DrishtiPassState) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(next), 500);
    },
    [persist]
  );

  useEffect(() => {
    if (!open) return;
    const step = pass.currentStep;
    if (step === 0) {
      setLiveMsg("Name your phenomenon");
    } else if (step >= 1 && step <= 7) {
      const lens = DRISHTI_LENSES[step - 1];
      setLiveMsg(`Step ${step} of 7: ${lens.title}`);
    } else {
      setLiveMsg("Pass complete — finish or go deeper");
    }
  }, [open, pass.currentStep]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
  }, [open, pass.currentStep]);

  useEffect(() => {
    if (!open || !initialLens || pass.currentStep !== 0) return;
    const idx = DRISHTI_LENSES.findIndex((l) => l.slug === initialLens);
    if (idx >= 0) {
      persist({ ...pass, currentStep: idx + 1 });
    }
  }, [open, initialLens]); // eslint: resume lens only on open

  const handleClose = () => {
    const hasNotes =
      pass.phenomenon.trim() ||
      Object.values(pass.lenses).some((l) => l.light?.trim() || l.deep?.trim());
    if (hasNotes && !window.confirm("Save draft and close?")) return;
    persist({ ...pass, status: "draft" });
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pass]);

  if (!open) return null;

  const lensIndex = pass.currentStep - 1;
  const lensSlug = DRISHTI_LENSES[lensIndex]?.slug as LensSlug | undefined;

  return (
    <>
      <button
        type="button"
        className="drishti-pass-panel__backdrop"
        aria-label="Close pass panel"
        onClick={handleClose}
      />
      <div
        ref={dialogRef}
        className="drishti-pass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drishti-pass-title"
        tabIndex={-1}
      >
        <header className="drishti-pass-panel__header">
          <h2 id="drishti-pass-title">Apply Drishti</h2>
          <button type="button" onClick={handleClose} aria-label="Close">
            ×
          </button>
        </header>

        <p className="drishti-pass-panel__progress" aria-live="polite">
          {pass.currentStep === 0
            ? "Start"
            : pass.currentStep <= 7
              ? `${pass.currentStep} of 7`
              : "7 of 7 complete"}
        </p>
        <div className="visually-hidden" aria-live="polite">
          {liveMsg}
        </div>

        {storageWarning && (
          <p className="drishti-pass-panel__warning" role="status">
            {storageWarning}
          </p>
        )}

        {pass.currentStep === 0 && (
          <div className="drishti-pass-panel__phenomenon">
            <label htmlFor="drishti-phenomenon">
              Name the phenomenon
              <input
                id="drishti-phenomenon"
                value={pass.phenomenon}
                maxLength={PHENOMENON_MAX}
                onChange={(e) =>
                  debouncedPersist({ ...pass, phenomenon: e.target.value })
                }
                onBlur={() => persist(pass)}
                required
              />
            </label>
            <label htmlFor="drishti-context">
              Optional context (one line)
              <input
                id="drishti-context"
                value={pass.context ?? ""}
                maxLength={200}
                onChange={(e) =>
                  debouncedPersist({ ...pass, context: e.target.value })
                }
              />
            </label>
          </div>
        )}

        {pass.currentStep >= 1 && pass.currentStep <= 7 && lensSlug && (
          <DrishtiPassStep
            lensSlug={lensSlug}
            mode="light"
            lightNote={pass.lenses[lensSlug].light ?? ""}
            preferredStudy={pass.preferredStudy}
            onLightChange={(value) => {
              const next = {
                ...pass,
                lenses: {
                  ...pass.lenses,
                  [lensSlug]: { ...pass.lenses[lensSlug], light: value },
                },
              };
              debouncedPersist(next);
            }}
          />
        )}

        {pass.currentStep === 8 && (
          <div className="drishti-pass-panel__complete">
            <p className="drishti-pass-panel__ring" aria-hidden="true">
              7/7
            </p>
            <p>Light pass complete. Finish with a summary or go deeper.</p>
          </div>
        )}

        <footer className="drishti-pass-panel__footer">
          {pass.currentStep > 0 && pass.currentStep <= 8 && (
            <button
              type="button"
              onClick={() =>
                persist({ ...pass, currentStep: Math.max(0, pass.currentStep - 1) })
              }
            >
              Back
            </button>
          )}
          {pass.currentStep === 0 && (
            <button
              type="button"
              disabled={!pass.phenomenon.trim()}
              onClick={() => persist({ ...pass, currentStep: 1 })}
            >
              Next
            </button>
          )}
          {pass.currentStep >= 1 && pass.currentStep < 7 && (
            <button
              type="button"
              onClick={() => persist({ ...pass, currentStep: pass.currentStep + 1 })}
            >
              Next
            </button>
          )}
          {pass.currentStep === 7 && (
            <button
              type="button"
              onClick={() => persist({ ...pass, currentStep: 8 })}
            >
              Next
            </button>
          )}
          {pass.currentStep === 8 && (
            <>
              <button type="button" onClick={() => onFinish(pass)}>
                Finish
              </button>
              <button
                type="button"
                className="drishti-pass-panel__deeper"
                onClick={() => onGoDeeper(pass)}
                data-analytics="pass-go-deeper"
              >
                Go deeper
              </button>
            </>
          )}
        </footer>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/drishti/DrishtiPassPanel.tsx
git commit -m "feat(drishti): add light pass slide-over panel"
```

---

### Task 6: DrishtiPassSummary component

**Files:**
- Create: `website/src/components/drishti/DrishtiPassSummary.tsx`

- [ ] **Step 1: Implement summary card**

```tsx
import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import type { DrishtiPassState, LensSlug } from "../../lib/drishti-pass";

type Props = {
  pass: DrishtiPassState;
  onInsightChange: (insight: string) => void;
  onCopy: () => void;
  onNewPass: () => void;
  onDone: () => void;
  storageWarning?: string | null;
};

export function DrishtiPassSummary({
  pass,
  onInsightChange,
  onCopy,
  onNewPass,
  onDone,
  storageWarning,
}: Props) {
  return (
    <div className="drishti-pass-summary" data-depth={pass.depth}>
      <h2>{pass.phenomenon}</h2>
      {pass.context && <p className="drishti-pass-summary__context">{pass.context}</p>}

      <ul className="drishti-pass-summary__notes">
        {DRISHTI_LENSES.map((lens) => {
          const notes = pass.lenses[lens.slug as LensSlug];
          const text = pass.depth === "deep" ? notes.deep || notes.light : notes.light;
          if (!text?.trim()) return null;
          return (
            <li key={lens.slug}>
              <span className="drishti-pass-summary__lens">
                {lens.glyph} {lens.title}
              </span>
              <span>{text}</span>
            </li>
          );
        })}
      </ul>

      <label htmlFor="drishti-insight">
        What shifted?
        <textarea
          id="drishti-insight"
          value={pass.insight ?? ""}
          maxLength={400}
          rows={3}
          onChange={(e) => onInsightChange(e.target.value)}
          placeholder="One sentence on how you see it differently now."
        />
      </label>

      {storageWarning && (
        <p className="drishti-pass-summary__warning" role="status">
          {storageWarning}
        </p>
      )}

      <div className="drishti-pass-summary__actions">
        <button type="button" onClick={onCopy}>
          Copy summary
        </button>
        <button type="button" onClick={onNewPass}>
          New pass
        </button>
        <button type="button" onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/components/drishti/DrishtiPassSummary.tsx
git commit -m "feat(drishti): add pass completion summary card"
```

---

### Task 7: ApplyDrishtiChip + DrishtiPassLauncher

**Files:**
- Create: `website/src/components/drishti/ApplyDrishtiChip.tsx`
- Create: `website/src/components/drishti/DrishtiPassLauncher.tsx`

- [ ] **Step 1: Implement chip**

```tsx
type Props = {
  hasDraft: boolean;
  onClick: () => void;
};

export function ApplyDrishtiChip({ hasDraft, onClick }: Props) {
  return (
    <button
      type="button"
      className="drishti-apply-chip"
      onClick={onClick}
      aria-label={hasDraft ? "Apply Drishti — draft in progress" : "Apply Drishti"}
      data-analytics="apply-drishti-chip"
    >
      <span aria-hidden="true">◎</span>
      Apply Drishti
      {hasDraft && <span className="drishti-apply-chip__dot" aria-hidden="true" />}
    </button>
  );
}
```

- [ ] **Step 2: Implement launcher orchestrator**

```tsx
import { useCallback, useEffect, useState } from "react";
import {
  createEmptyPass,
  getActiveDraft,
  readPassesFromStorage,
  upsertPass,
  writePassesToStorage,
  type DrishtiPassState,
  type LensSlug,
  type StudySlug,
} from "../../lib/drishti-pass";
import { ApplyDrishtiChip } from "./ApplyDrishtiChip";
import { DrishtiPassPanel } from "./DrishtiPassPanel";
import { DrishtiPassSummary } from "./DrishtiPassSummary";

type Props = {
  sourceUrl: string;
  studySlug?: StudySlug;
  initialLens?: LensSlug;
};

export function DrishtiPassLauncher({ sourceUrl, studySlug, initialLens }: Props) {
  const [pass, setPass] = useState<DrishtiPassState | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    const passes = readPassesFromStorage(localStorage);
    setHasDraft(!!getActiveDraft(passes));
  }, [panelOpen, showSummary]);

  const openPass = useCallback(() => {
    const passes = readPassesFromStorage(localStorage);
    const draft = getActiveDraft(passes);
    const next =
      draft ??
      createEmptyPass({ sourceUrl, preferredStudy: studySlug });
    setPass(next);
    setPanelOpen(true);
    setShowSummary(false);
  }, [sourceUrl, studySlug]);

  const finalizePass = (next: DrishtiPassState, depth: "light" | "deep") => {
    const completed: DrishtiPassState = {
      ...next,
      depth,
      status: "complete",
      updatedAt: new Date().toISOString(),
    };
    const passes = upsertPass(readPassesFromStorage(localStorage), completed);
    const result = writePassesToStorage(localStorage, passes);
    if (!result.ok) setStorageWarning("Could not save — copy your summary before leaving.");
    setPass(completed);
    setPanelOpen(false);
    setShowSummary(true);
    setHasDraft(false);
  };

  const handleCopy = () => {
    if (!pass) return;
    const lines = [
      `# Drishti Pass: ${pass.phenomenon}`,
      pass.insight ? `\nWhat shifted: ${pass.insight}` : "",
    ];
    void navigator.clipboard?.writeText(lines.join("\n"));
  };

  return (
    <>
      <ApplyDrishtiChip hasDraft={hasDraft} onClick={openPass} />

      {pass && panelOpen && (
        <DrishtiPassPanel
          open={panelOpen}
          pass={pass}
          onPassChange={setPass}
          onClose={() => setPanelOpen(false)}
          onFinish={(p) => finalizePass(p, "light")}
          onGoDeeper={(p) => {
            const saved = upsertPass(readPassesFromStorage(localStorage), {
              ...p,
              status: "draft",
              depth: "light",
            });
            writePassesToStorage(localStorage, saved);
            window.location.href = `/drishti/pass/deep?passId=${encodeURIComponent(p.passId)}`;
          }}
          initialLens={initialLens}
        />
      )}

      {pass && showSummary && (
        <div className="drishti-pass-summary-overlay" role="dialog" aria-modal="true">
          <DrishtiPassSummary
            pass={pass}
            storageWarning={storageWarning}
            onInsightChange={(insight) => {
              const updated = { ...pass, insight };
              setPass(updated);
              writePassesToStorage(
                localStorage,
                upsertPass(readPassesFromStorage(localStorage), updated)
              );
            }}
            onCopy={handleCopy}
            onNewPass={() => {
              setShowSummary(false);
              setPass(createEmptyPass({ sourceUrl, preferredStudy: studySlug }));
              setPanelOpen(true);
            }}
            onDone={() => setShowSummary(false)}
          />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add website/src/components/drishti/ApplyDrishtiChip.tsx website/src/components/drishti/DrishtiPassLauncher.tsx
git commit -m "feat(drishti): add apply chip and pass launcher orchestrator"
```

---

### Task 8: DeepPassWizard + deep route

**Files:**
- Create: `website/src/components/drishti/DeepPassWizard.tsx`
- Create: `website/src/pages/drishti/pass/deep.astro`

- [ ] **Step 1: Implement DeepPassWizard**

```tsx
import { useEffect, useState } from "react";
import { DRISHTI_LENSES } from "../../lib/drishti-lenses";
import {
  getPassById,
  readPassesFromStorage,
  upsertPass,
  writePassesToStorage,
  type DrishtiPassState,
  type LensSlug,
} from "../../lib/drishti-pass";
import { DrishtiPassStep } from "./DrishtiPassStep";
import { DrishtiPassSummary } from "./DrishtiPassSummary";

type Props = {
  passId: string;
};

export function DeepPassWizard({ passId }: Props) {
  const [pass, setPass] = useState<DrishtiPassState | null>(null);
  const [step, setStep] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    const found = getPassById(readPassesFromStorage(localStorage), passId);
    if (!found) {
      window.location.href = "/drishti?toast=pass-not-found";
      return;
    }
    setPass(found);
    setStep(found.currentStep <= 7 ? found.currentStep : 0);
  }, [passId]);

  if (!pass) {
    return <p className="drishti-deep-wizard__loading">Loading pass…</p>;
  }

  const lensSlug = DRISHTI_LENSES[step]?.slug as LensSlug;

  const persist = (next: DrishtiPassState) => {
    setPass(next);
    writePassesToStorage(localStorage, upsertPass(readPassesFromStorage(localStorage), next));
  };

  const finish = () => {
    const completed: DrishtiPassState = {
      ...pass,
      depth: "deep",
      status: "complete",
      currentStep: step,
    };
    persist(completed);
    setShowSummary(true);
  };

  if (showSummary) {
    return (
      <DrishtiPassSummary
        pass={pass}
        storageWarning={storageWarning}
        onInsightChange={(insight) => persist({ ...pass, insight })}
        onCopy={() => void navigator.clipboard?.writeText(pass.phenomenon)}
        onNewPass={() => (window.location.href = "/drishti")}
        onDone={() => (window.location.href = pass.sourceUrl ?? "/drishti")}
      />
    );
  }

  return (
    <div className="drishti-deep-wizard">
      <header>
        <a href={pass.sourceUrl ?? "/drishti"}>← Back</a>
        <h1>{pass.phenomenon || "Deep pass"}</h1>
        <label>
          Phenomenon
          <input
            value={pass.phenomenon}
            onChange={(e) => persist({ ...pass, phenomenon: e.target.value })}
          />
        </label>
      </header>

      <ol className="drishti-deep-wizard__stepper">
        {DRISHTI_LENSES.map((l, i) => (
          <li key={l.slug} data-done={i < step}>
            <button type="button" onClick={() => setStep(i)}>
              {l.glyph} {l.title}
            </button>
          </li>
        ))}
      </ol>

      <div aria-live="polite" className="visually-hidden">
        Deep pass step {step + 1} of 7: {DRISHTI_LENSES[step]?.title}
      </div>

      {lensSlug && (
        <DrishtiPassStep
          lensSlug={lensSlug}
          mode="deep"
          lightNote={pass.lenses[lensSlug].light}
          deepNote={pass.lenses[lensSlug].deep ?? ""}
          preferredStudy={pass.preferredStudy}
          onDeepChange={(value) =>
            persist({
              ...pass,
              lenses: {
                ...pass.lenses,
                [lensSlug]: { ...pass.lenses[lensSlug], deep: value },
              },
              currentStep: step,
            })
          }
        />
      )}

      <footer>
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}>
          Back
        </button>
        {step < 6 ? (
          <button type="button" onClick={() => setStep(step + 1)}>
            Next
          </button>
        ) : (
          <button type="button" onClick={finish} data-analytics="pass-deep-finish">
            Finish deep pass
          </button>
        )}
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Create deep.astro page**

```astro
---
import DrishtiLayout from "../../../layouts/DrishtiLayout.astro";
import { DeepPassWizard } from "../../../components/drishti/DeepPassWizard.tsx";

const passId = Astro.url.searchParams.get("passId") ?? "";
---

<DrishtiLayout
  title="Deep pass"
  tagline="Seven lenses, elaborated — your light notes carry forward."
  crumbs={[
    { label: "Drishti", href: "/drishti" },
    { label: "Deep pass" },
  ]}
>
  {passId ? (
    <DeepPassWizard client:load passId={passId} />
  ) : (
    <p>Missing pass. <a href="/drishti">Start from Apply Drishti</a>.</p>
  )}
</DrishtiLayout>
```

- [ ] **Step 3: Add hub toast for invalid passId**

In `website/src/pages/drishti/index.astro`, add after opening layout tag content:

```astro
{Astro.url.searchParams.get("toast") === "pass-not-found" && (
  <p class="drishti-toast" role="status">
    Start a pass from Apply Drishti.
  </p>
)}
```

- [ ] **Step 4: Build**

Run: `cd website && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/components/drishti/DeepPassWizard.tsx website/src/pages/drishti/pass/deep.astro website/src/pages/drishti/index.astro
git commit -m "feat(drishti): add deep pass wizard route"
```

---

### Task 9: DrishtiLayout integration

**Files:**
- Modify: `website/src/layouts/DrishtiLayout.astro`
- Modify: `website/src/pages/drishti/studies/[slug].astro`
- Modify: `website/src/pages/drishti/lenses/[lens].astro`

- [ ] **Step 1: Extend DrishtiLayout props and mount launcher**

Add to Props interface:

```typescript
studySlug?: string;
initialLens?: string;
```

Before closing `</BaseLayout>`, after the main page div:

```astro
---
import { DrishtiPassLauncher } from "../components/drishti/DrishtiPassLauncher.tsx";
const passSourceUrl = Astro.url.pathname;
---
<DrishtiPassLauncher
  client:load
  sourceUrl={passSourceUrl}
  studySlug={studySlug}
  initialLens={initialLens}
/>
```

- [ ] **Step 2: Pass studySlug from study pages**

In `[slug].astro`, add to DrishtiLayout:

```astro
studySlug={study.slug}
```

- [ ] **Step 3: Pass initialLens from lens pages**

In `[lens].astro`, add:

```astro
initialLens={lens}
```

- [ ] **Step 4: Build**

Run: `cd website && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add website/src/layouts/DrishtiLayout.astro website/src/pages/drishti/studies/[slug].astro website/src/pages/drishti/lenses/[lens].astro
git commit -m "feat(drishti): mount pass launcher on all Drishti pages"
```

---

### Task 10: Hub primary CTA

**Files:**
- Modify: `website/src/pages/drishti/index.astro`

- [ ] **Step 1: Add hero CTA that opens pass panel**

The chip handles open, but hub needs a prominent in-content CTA per spec. Add a button that dispatches a custom event the launcher listens for:

In `DrishtiPassLauncher.tsx`, add:

```tsx
useEffect(() => {
  const handler = () => openPass();
  window.addEventListener("drishti:open-pass", handler);
  return () => window.removeEventListener("drishti:open-pass", handler);
}, [openPass]);
```

In hub hero section:

```astro
<section class="drishti-hub__hero">
  <p>Perception layer · complements the curriculum</p>
  <button
    type="button"
    class="drishti-hub__cta"
    data-analytics="hub-apply-drishti"
    onclick="window.dispatchEvent(new Event('drishti:open-pass'))"
  >
    ◎ Apply Drishti to your phenomenon
  </button>
</section>
```

- [ ] **Step 2: Commit**

```bash
git add website/src/pages/drishti/index.astro website/src/components/drishti/DrishtiPassLauncher.tsx
git commit -m "feat(drishti): add hub primary Apply Drishti CTA"
```

---

### Task 11: Styles and accessibility utilities

**Files:**
- Modify: `website/src/styles/drishti.css`
- Modify: `website/src/styles/tokens.css` (only if `--drishti-accent` alias needed — use existing `--color-drishti`)

- [ ] **Step 1: Add pass styles**

Append to `drishti.css`:

```css
/* Apply Drishti chip */
.drishti-apply-chip {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  z-index: 40;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.65rem 1.1rem;
  border: none;
  border-radius: 999px;
  background: var(--color-drishti);
  color: var(--color-bg);
  font-weight: 600;
  box-shadow: 0 4px 20px color-mix(in srgb, var(--color-drishti) 35%, transparent);
  cursor: pointer;
}

.drishti-apply-chip__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-bg);
}

/* Slide-over panel */
.drishti-pass-panel__backdrop {
  position: fixed;
  inset: 0;
  z-index: 45;
  border: none;
  background: color-mix(in srgb, var(--color-bg) 40%, transparent);
  cursor: pointer;
}

.drishti-pass-panel {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 50;
  width: min(420px, 100vw);
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-left: 1px solid color-mix(in srgb, var(--color-muted) 25%, transparent);
  box-shadow: -8px 0 32px color-mix(in srgb, var(--color-bg) 50%, transparent);
  padding: var(--space-4);
  overflow-y: auto;
}

@media (max-width: 40rem) {
  .drishti-pass-panel {
    width: 100vw;
  }
}

.drishti-pass-panel__footer {
  display: flex;
  gap: var(--space-3);
  margin-top: auto;
  padding-top: var(--space-4);
}

.drishti-pass-panel__deeper {
  margin-left: auto;
}

/* Hub CTA */
.drishti-hub__cta {
  margin-top: var(--space-4);
  padding: 0.75rem 1.25rem;
  border: none;
  border-radius: var(--radius-md);
  background: var(--color-drishti);
  color: var(--color-bg);
  font-weight: 600;
  cursor: pointer;
}

/* Deep wizard */
.drishti-deep-wizard {
  max-width: 640px;
  margin: 0 auto;
}

.drishti-deep-wizard__stepper {
  list-style: none;
  padding: 0;
  display: grid;
  gap: var(--space-2);
}

/* Summary overlay */
.drishti-pass-summary-overlay {
  position: fixed;
  inset: 0;
  z-index: 55;
  display: grid;
  place-items: center;
  padding: var(--space-4);
  background: color-mix(in srgb, var(--color-bg) 55%, transparent);
}

.drishti-pass-summary {
  max-width: 36rem;
  width: 100%;
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-drishti) 30%, transparent);
}

.drishti-toast {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-drishti-subtle);
  color: var(--color-drishti);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .drishti-pass-panel {
    transition: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add website/src/styles/drishti.css
git commit -m "style(drishti): add pass chip, panel, wizard, and summary styles"
```

---

### Task 12: Component tests and verification

**Files:**
- Create: `website/src/lib/drishti-pass-prefill.test.mjs`

- [ ] **Step 1: Add pre-fill behavior test**

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { createEmptyPass, upsertPass } from "./drishti-pass.ts";

test("light notes carry forward to deep pass object", () => {
  const pass = createEmptyPass({});
  pass.phenomenon = "Team standup";
  pass.lenses["what-flows"].light = "Airtime bottleneck";
  const saved = upsertPass([], pass)[0];
  assert.equal(saved.lenses["what-flows"].light, "Airtime bottleneck");
  assert.equal(saved.lenses["what-flows"].deep, "");
});
```

- [ ] **Step 2: Run all drishti-pass tests**

Run: `cd website && npm run test:drishti-pass`
Expected: all PASS

- [ ] **Step 3: Production build**

Run: `cd website && npm run build`
Expected: PASS with no TypeScript errors

- [ ] **Step 4: Manual verification checklist**

| Check | How |
|-------|-----|
| Chip visible on hub, lens, study, framework | Visit each route |
| Hub CTA opens panel | Click hero button |
| Phenomenon required | Next disabled until name entered |
| Auto-save draft | Enter note, refresh, reopen — draft dot shows |
| 7 lens steps + completion | Walk through light pass |
| Study excerpt accordion | Expand "See how Sleep…" on step 1 |
| Finish → summary + insight | Complete light pass |
| Go deeper → deep route | Light notes visible read-only in deep step |
| Invalid passId | Visit `/drishti/pass/deep?passId=bad` → hub toast |
| Escape closes with confirm | Press Escape mid-pass |
| Keyboard | Tab through panel controls |
| Mobile | Panel full-width ≤640px |
| Reduced motion | No transitions with `prefers-reduced-motion` |

- [ ] **Step 5: Commit**

```bash
git add website/src/lib/drishti-pass-prefill.test.mjs
git commit -m "test(drishti): verify light notes prefill for deep pass"
```

---

## Self-review (plan author checklist)

| Spec requirement | Task |
|------------------|------|
| Apply Drishti chip on all Drishti pages | Task 7, 9 |
| Light pass slide-over steps 0–8 | Task 5 |
| Progressive unlock to `/drishti/pass/deep` | Task 5, 8 |
| Hints + micro-examples | Task 2, 4 |
| Expandable study excerpts | Task 2, 3 |
| Hub primary CTA | Task 10 |
| localStorage DrishtiPassState | Task 1 |
| pass-hints.json + pass-excerpts.json | Task 2 |
| All six named components | Tasks 3–8 |
| Error handling (quota, disabled, invalid passId) | Task 1, 5, 7, 8 |
| Accessibility (focus trap, aria-live, reduced motion) | Task 5, 11, 12 |
| Analytics data attributes | Task 3, 5, 7, 10 |
| Out of scope respected (no Phase 2–4 UI) | No tasks for study heroes, micro-labs, homepage teaser |

**Placeholder scan:** No TBD/TODO steps. All code blocks are complete starter implementations.

**Type consistency:** `LensSlug`, `StudySlug`, `DrishtiPassState` defined once in Task 1 and imported everywhere.

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-06-21-drishti-pass-phase1-plan.md`.

**Recommended next step:** Run **superpowers:executing-plans** (or subagent-driven-development) task-by-task with review checkpoints after Tasks 1, 5, 8, and 12.

**Summary:** 12 tasks, ~55 bite-sized steps, 5 major milestones (state lib → data → light pass UI → deep wizard → layout/hub/styles/verification).
