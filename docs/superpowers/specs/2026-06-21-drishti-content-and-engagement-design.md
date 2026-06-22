# Drishti Content Quality & Engagement Design Spec

**Date:** 2026-06-21  
**Status:** Approved (brainstorming)  
**Builds on:** [Drishti Return Loop design spec](./2026-06-21-drishti-return-loop-design.md); [Drishti Mirror Closing design spec](./2026-06-21-drishti-mirror-closing-design.md)  
**Audience:** Implementation agents, content authors, product decisions

---

## Executive summary

Drishti has two content cohorts and a broken render path: the best prose lives in `README.md`, which never syncs to the site. Six Gemini-authored studies satisfy schema but read like textbook outlines. This spec locks **Voice D** (playful hooks, practitioner close) as the editorial north star, defines an agent-enforceable **14-dimension rubric**, ships **content lint** and **AGENTS.md** guardrails, and runs a **loop-first engagement experiment** (Return Loop + analytics) in parallel with a full rewrite of the six Gemini studies.

**Audience contract:** systems-curious nerds and pattern-spotters — an antidote to brainrot, not for everyone yet. **Engagement model:** a dual loop braid — return to your own insights *and* discover new studies. Neither alone is the product.

---

## User decisions (locked)

| Decision | Choice |
|----------|--------|
| **Voice** | **D** — playful hooks, practitioner close |
| **Six Gemini studies** | **A — full rewrite** to Office voice (Supply Chains, Internet Routing, Photosynthesis, Immune System, Urban Traffic, Power Grids) |
| **Future studies** | **D — standards only** (`AGENTS.md` + `lint-drishti-content.mjs`; no manual rewrite pass unless lint fails) |
| **Target audience** | Nerds, pattern-spotters, antidote to brainrot — **not for everyone yet** |
| **Engagement priority** | **Both** — return to own insights **and** discover new studies (dual loop braid) |
| **Experiment strategy** | **Loop-first** — merge Return Loop v1 + analytics; content rewrite in parallel |

---

## Audit context

### Two cohorts

| Cohort | Studies | Character |
|--------|---------|-----------|
| **Original 3** | Office, Sleep, Blood Circulation | Short, quotable, stakes; pattern-spotting voice |
| **Gemini 6** (Jun 22) | Supply Chains, Internet Routing, Photosynthesis, Immune System, Urban Traffic, Power Grids | Equal-length paragraphs, CS metaphor carpet, fake Bayesian %, `**Takeaway:**` labels |

### Biggest structural gap

**`README.md` is never synced.** Sync copies only `meta.yaml` + seven `what-*.md` files (`website/scripts/sync-drishti.mjs`). Phenomenon cards, mermaid diagrams, and richest narrative exist in authoring READMEs but **do not render** on `/drishti/studies/[slug]`. Readers see accordion lens snippets only. Agents optimize the wrong layer.

### Pass layer gap

`website/src/data/drishti/pass-excerpts.json` covers **3 of 9 studies** (sleep, blood-circulation, the-office-as-a-computer). Six catalog studies are invisible in Drishti Pass. `computeRelatedStudy()` (Return Loop) picks from excerpt-covered studies only — bridges silently under-deliver until excerpts exist for all studies.

### Gemini failure modes

1. **Outline mode** — seven equal sections: `**Takeaway:**` + three paragraphs each
2. **“Deep research” = more words** — verbosity mistaken for quality
3. **Metaphor mandate** — every phenomenon forced into distributed-systems language (immune system = spam filter, supply chain = DDoS)
4. **Historical trivia padding** — Wikipedia garnish without “so what for you”
5. **Premature abstraction** — “planetary-scale distributed system” before a concrete object
6. **Bayesian Mad Libs** — Prior/Evidence/Posterior/Branches with invented percentages
7. **README ↔ `what-*.md` duplication** — no compression for accordion UX
8. **No try-it moments** — lens guides have “Try it now”; studies have zero
9. **Sync checklist without read** — catalog updated; pass excerpts and voice QA skipped

### Banned phrases (lint-enforced)

- `Furthermore,`
- `What also exists are`
- `**Takeaway:**` (use plain bold hook instead)
- `Prior:` / `Posterior:` without real cited numbers
- Filler: `fundamentally`, `incredibly`, `massive` (when not describing a measurable quantity)
- Opener pattern: “planetary-scale distributed system”

### Gold vs anti-pattern references

| Gold | Anti-pattern |
|------|--------------|
| `drishti/studies/THE_OFFICE_AS_A_COMPUTER/what-exists.md` — “agreements wearing furniture” | `drishti/studies/THE_IMMUNE_SYSTEM/what-exists.md` — distributed spam filter opener |
| `drishti/studies/SLEEP/what-will-happen.md` — leading indicators, no fake % | `drishti/studies/POWER_GRIDS/what-will-happen.md` — Prior/Posterior template |
| `drishti/studies/BLOOD_CIRCULATION/what-flows.md` — queue timeout, inline topic link | `drishti/studies/PHOTOSYNTHESIS/README.md` — parallelized pipeline opener |

---

## Section 1: Content Quality Program

### 1.1 Voice D template

**Feel after finishing a study:** surprise first (playful pattern-spotter), then something you can use Monday (guided practitioner).

| Beat | Rule | Example |
|------|------|---------|
| **Hook** | First sentence quotable; one concrete object | “A container ship is a moving warehouse with no undo button.” |
| **Lens body** | ≤80 words **or** bullets/table; no `**Takeaway:**` label | Office-style bold line, not academic header |
| **Practitioner close** | One 60-second try-it per study (in `meta.yaml` `tryIt` or README) | “Check your last delivery — count countries touched.” |
| **Forecast** | Leading indicators; no fake % | Sleep-style: “watch time-to-fall-asleep, not coffee count” |

### 1.2 Voice D for nerds (refined)

| Do | Don’t |
|----|-------|
| One surprising reframe per lens | Six CS metaphors per study |
| Named objects (container, chloroplast, BGP table) | “Planetary-scale distributed system” openers |
| Practitioner close = instrument, not homework | Generic “reflect on your learning” |
| Invite disagreement (“this lens might be wrong here”) | Textbook authority voice |
| Link to curriculum when mechanism exists | Forced `/topics/` name-drops |

**Brainrot antidote test:** Would this sentence work in a group chat?

- ✅ “Sleep debt is a queue you can’t delete.”
- ❌ “Photosynthesis is an extremely parallelized pipeline.”

### 1.3 Fourteen-dimension rubric

Score each study **0–2** per dimension (0 = fail, 1 = pass, 2 = exemplar). **Publish threshold: ≥20/28.**

| # | Dimension | 0 | 2 (exemplar) |
|---|-----------|---|--------------|
| 1 | **Hook density** | First sentence could open any textbook | Study-specific, quotable (Office: “agreements wearing furniture”) |
| 2 | **Concrete anchor** | No physical object in first 100 words | Named object you could photograph |
| 3 | **`what-*.md` word count** | >120 words per lens file | ≤80 words OR bullets/table |
| 4 | **Paragraph brevity** | Any paragraph >3 sentences | All ≤3 sentences |
| 5 | **Lens shape variety** | All 7 lenses are 3 prose paragraphs | ≥2 lenses use bullets, table, or diagram |
| 6 | **Metaphor budget** | >3 CS metaphors in one study | ≤1 forced metaphor; rest plain language |
| 7 | **Banned phrase scan** | Contains banned phrases (see audit) | None |
| 8 | **TL;DR stake test** | All three bullets are definitions | ≥1 bullet implies consequence for a human decision |
| 9 | **Try-it moment** | None | ≥1 prompt reader can do in 60 seconds |
| 10 | **Forecasting honesty** | Fake % branches without leading indicators | Named indicators + what would change your mind |
| 11 | **Phenomenon on site** | Not synced | One-liner + optional diagram in rendered page hero |
| 12 | **Curriculum bridge in body** | Topics only in footer component | ≥1 inline `/topics/` link in a lens file |
| 13 | **Pass excerpt quality** | Missing or generic | ≤25 words, study-specific, Office-tier hook |
| 14 | **README ≠ accordion** | `what-*.md` copies README verbatim | Accordion compressed; README expanded |

Agents self-score before shipping; human/editor pass optional for exemplars.

### 1.4 Agent guardrails

**`drishti/AGENTS.md` additions:**

- Voice D template table and rubric reference
- Gold vs anti-pattern side-by-side (Office vs Immune System)
- Hard caps: `what-*.md` ≤80 words unless table/diagram; max 3 sentences per paragraph
- Ban list (see audit)
- **“Write for the accordion”** — README is long-form; `what-*.md` is what users read
- Require one concrete object and one 60-second try-it per study
- Explicit: run sync + verify rendered page, not just file creation

**`drishti/AUTHORING.md` additions:**

- Voice section: stakes, surprise, one quotable line per lens
- TL;DR: at least one bullet answers “why should I care today?”
- Phenomenon card must sync to site (or drop from template)
- Separate templates for accordion vs README

### 1.5 `lint-drishti-content.mjs`

New script (CI gate on `drishti/studies/`):

| Check | Rule |
|-------|------|
| Word count | `what-*.md` ≤80 words unless contains table or mermaid fence |
| Banned phrases | Regex scan for ban list |
| Paragraph length | Max 3 sentences per paragraph |
| Try-it | `meta.yaml` must have non-empty `tryIt` |
| Mermaid | `what-flows.md` should contain diagram (warn if missing) |
| `relatedTopics` | Valid slugs in `website/src/data/topics.json` |
| Excerpt coverage | Warn if study in catalog but missing from `pass-excerpts.json` |
| Copy-paste | Fail if `what-*.md` word count ≥ README section word count |

Run: `node website/scripts/lint-drishti-content.mjs` (path TBD at implementation).

### 1.6 `meta.yaml` extensions

```yaml
phenomenon: "One sentence, no jargon"      # sync to study hero
featured: true                             # hub ordering (Office, Sleep, Blood)
tryIt: "Look at your desk…"                # 60-second practitioner prompt
hooks:                                     # optional per-lens one-liners for Pass
  what-flows: "…"
```

### 1.7 Rewrite order

1. **Office** — refine as canonical Voice D template (already strong; formalize hooks + try-it)
2. **2 exemplars** — Global Supply Chains + Photosynthesis (different domains)
3. **Remaining 4** — Internet Routing, Immune System, Urban Traffic, Power Grids (batch with lint gate)
4. **Sync fix** — `phenomenon` from `meta.yaml` → study page hero (README prose finally visible)
5. **`pass-excerpts.json`** — all 9 studies, ≤25 words, hook-shaped

### 1.8 Future additions (standards only)

New studies must pass lint + rubric (≥20/28). No manual rewrite pass unless they fail. Template: `drishti/studies/_TEMPLATE/` copied from Office, not SLEEP alone.

---

## Section 2: Engagement Experiment v1

### 2.1 Hypothesis

**Nerds who complete one pass + read one study bridge will return within 7 days** to either reopen a pass **or** open a second study — more than pass-only users.

Return Loop + better excerpts increases **7-day return visits** and **pass journal reopens** without dark patterns.

### 2.2 Build (2 weeks)

| # | Deliverable | Notes |
|---|-------------|-------|
| 1 | **Merge Return Loop v1** | Cherry-pick from `feat/drishti-pass-phase1` (`18c8d2a`): `drishti-return.ts`, `DrishtiWhatsNext`, `DrishtiPassJournal`, `DrishtiHubReturn`, `DrishtiEchoBanner`, `DrishtiStudyBridge` |
| 2 | **Analytics events** | See §2.4 |
| 3 | **Content (parallel)** | Office Voice D rewrite + 1 Gemini exemplar (Supply Chains) |
| 4 | **Excerpts** | Extend `pass-excerpts.json` toward all 9 studies (minimum: studies referenced by Return Loop bridges) |

### 2.3 Measure

| Metric | Source |
|--------|--------|
| Pass completes → mirror confirm rate | `mirror-confirmed` event |
| Hub return within 7 days | localStorage `completedAt` timestamp + `pass-journal-reopen` |
| Journal reopen rate | `pass-journal-reopen` |
| Study discovery from loop | `whats-next-study-click`, `study-bridge-compare` |
| Echo engagement | `echo-yes`, `echo-changed`, `echo-dismiss` |
| Qualitative | “Would you come back?” / “I’d send this to X” after Mirror Room |

**Cohort:** author + 3–5 friends who match audience (systems-minded, not “general user”).  
**Success:** ≥2 of 5 return voluntarily within 7 days; qualitative “I’d send this to X.”

### 2.4 Analytics events needed

| Event | Trigger | Status |
|-------|---------|--------|
| `mirror-confirmed` | User confirms insight in Mirror Room | **Add** |
| `echo-yes` | Echo banner: insight still true | **Add** |
| `echo-changed` | Echo banner: insight changed | **Add** |
| `echo-dismiss` | Echo banner dismissed | **Add** |
| `whats-next-study-click` | Post-closure related study link | **Add** |
| `pass-journal-reopen` | Hub journal reopens a pass | **Add** |
| `study-bridge-compare` | Study page bridge card engaged | **Add** |
| `apply-drishti-chip` | Apply Drishti chip clicked | Exists |
| `hub-apply-drishti` | Hub CTA | Exists |
| `pass-go-deeper` | Deep pass started | Exists |
| `pass-deep-finish` | Deep pass completed | Exists |
| `pass-excerpt-study-link` | Excerpt → full study | Exists |

Implement via `data-analytics` attributes or minimal `drishtiAnalytics.track()` wrapper.

### 2.5 Ethics checklist

Use as lint for any future engagement feature:

1. **User-initiated triggers only** — no push, no streak-break warnings
2. **Insight as reward** — mirror confirm, echo, `nowSentence` change; not XP or badges
3. **Gaps are data** — never shame empty lenses; gap cards stay informational
4. **One study link at closure** — avoid choice overload after cognitive work
5. **Spaced, not scheduled** — echo on next visit ≥3 days, dismissible
6. **Investment compounds** — journal shows past passes; notes make mirror richer
7. **Exit to curriculum** — bridge goes to `/topics/*`, not infinite Drishti scroll
8. **Honest progress** — distinguish “7/7 steps” from substantive engagement

**Anti-patterns explicitly avoided:** streak guilt, infinite scroll feed, notification spam, fake progress rings, leaderboards, shame for gaps.

### 2.6 Content ↔ engagement link

Better studies make Return Loop surfaces land:

1. **Mid-pass excerpts** — highest-intent moment; weak excerpt breaks curiosity
2. **Study bridge** — strongest lens → study match feels like the product read your mind
3. **Mirror quality** — richer user notes → richer mirror → higher confirm rate
4. **Voice D excerpts** — invitations, not homework

**Chain:** better study → better excerpt → more pass completions → richer mirror → stronger echo → higher return → second study discovery.

---

## Section 3: Positioning, Dual Loop & Nerd-Native UX

### 3.1 Audience contract

**For:** systems-curious people who’d rather notice a bottleneck than scroll another reel.

**Not for (yet):** casual browsers, certification seekers, “explain like I’m 5” crowd.

**Hub tagline (light):** *“Seven questions. Any phenomenon. No feed.”* — positions against brainrot without being preachy.

### 3.2 Dual loop architecture

Discovery without personal stake feels like Wikipedia. Insight without discovery feels like a journal app. **The product is the braid.**

```
DISCOVER                    PERSONALIZE                 RETURN
─────────                   ───────────                 ──────
Study / lens guide    →     Apply Drishti pass    →     Journal + echo
"Sleep is a queue"          on YOUR thing               "Still true?"
       ↑                            │                          │
       └──── Study bridge ──────────┴── What's next ───────────┘
            "You wrote about flows — compare Sleep"
```

| Loop | Path | Reward |
|------|------|--------|
| **Discovery** | Study → excerpt in pass → “same lens, different domain” click | Transfer — “supply chains are *also* queueing theory” |
| **Insight** | Pass → mirror → journal → echo → reopen / edit `nowSentence` | Compounding mental model of *your* world |
| **Braid moment** | Study bridge when reading *after* a pass | Nerd candy — “I saw this in music AND in BGP routing” |

### 3.3 Hub design principles (nerd-native, not content feed)

- **Featured row:** Office, Sleep, Blood — proven voice (`featured: true` in meta)
- **“Your passes” journal** — primary return surface (not algorithmic feed)
- **“Same lens, different worlds”** — lens-centric browse (Phase 3): *What Flows across all studies*
- **No** streaks, no “daily challenge,” no notification permission on first visit
- Study cards show **phenomenon one-liner**, not generic tagline

### 3.4 Updated experiment cohort

Optimize for **both loops equally** in measurement:

| Signal | Loop |
|--------|------|
| `pass-journal-reopen`, `echo-*` | Insight return |
| `whats-next-study-click`, `study-bridge-compare`, second study page view | Discovery |
| 7-day return with either signal | Braid success |

---

## Phasing

### Phase 1 — Foundation (spec items)

- Merge Return Loop v1 onto `main`
- Add 6 analytics events
- Ship `lint-drishti-content.mjs` + CI gate
- Extend `AGENTS.md` / `AUTHORING.md` with Voice D + rubric
- Office Voice D template rewrite
- 2 exemplar rewrites (Supply Chains, Photosynthesis)
- Begin `pass-excerpts.json` extension

### Phase 2 — Content completion

- Remaining 4 Gemini study rewrites
- Sync fix: `phenomenon` → study page hero
- `pass-excerpts.json` for all 9 studies
- Widen `StudySlug` type if needed for new excerpt keys

### Phase 3 — Discovery & depth

- Lens-centric browse (“Same lens, different worlds”)
- Gap retry UI (Mirror Closing Phase B)
- Excerpt copy A/B (hook variants) once traffic allows

---

## Self-review checklist

Verified at spec write time:

- [x] **Placeholder scan** — no TBD/TODO sections; all requirements explicit
- [x] **Internal consistency** — Voice D applies to rewrites and future studies; loop-first does not block content parallel work
- [x] **Scope check** — single spec covering content program + engagement experiment + positioning; Phase 3 deferred appropriately
- [x] **Ambiguity resolved** — six studies = full rewrite; future = lint only; audience = nerds not everyone; engagement = both loops
- [x] **Audit context captured** — two cohorts, README sync gap, 3/9 excerpts, Gemini failure modes
- [x] **Cross-references** — Return Loop spec linked; analytics events enumerated; rewrite order explicit
- [x] **Ethics** — anti-patterns and checklist aligned with SDT / no dark patterns research

---

## Related paths

| Path | Role |
|------|------|
| `drishti/studies/THE_OFFICE_AS_A_COMPUTER/` | Voice D gold template |
| `drishti/AGENTS.md` | Agent authoring guide (to extend) |
| `drishti/AUTHORING.md` | Human voice rules (to extend) |
| `website/src/data/drishti/pass-excerpts.json` | Pass + bridge excerpt source |
| `website/scripts/sync-drishti.mjs` | Sync + phenomenon hero fix target |
| `website/scripts/lint-drishti-content.mjs` | Content lint (to create) |
| `docs/superpowers/specs/2026-06-21-drishti-return-loop-design.md` | Return Loop v1 spec |
| `feat/drishti-pass-phase1` @ `18c8d2a` | Return Loop implementation branch |

---

## Next step

After spec approval: invoke **writing-plans** skill to produce implementation plan(s) for Phase 1.
