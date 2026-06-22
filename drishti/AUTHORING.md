# Drishti authoring guide

Content for neurodiverse readers: predictable structure, short chunks, scannable headings.

## Every page must have

1. **TL;DR** — exactly 3 bullets at the top
2. **Bold one-line hook** at the start of each section (not `**Takeaway:**`)
3. **Max 2–3 sentences** per paragraph

## Voice (Voice D)

**Surprise first, practitioner close.** Playful pattern-spotting hooks; end with something the reader can try in 60 seconds.

| Do | Don't |
|----|-------|
| One surprising reframe per lens | Six CS metaphors per study |
| Named objects (container, chloroplast, BGP table) | "Planetary-scale distributed system" openers |
| Practitioner close = instrument, not homework | Generic "reflect on your learning" |
| Invite disagreement where honest | Textbook authority voice |

### TL;DR stake test

At least one bullet must answer **"why should I care today?"** — consequence for a human decision, not just a definition.

### Brainrot antidote test

Would this sentence work in a group chat? If it sounds like a textbook outline, rewrite.

## Accordion vs README (separate templates)

| Surface | Audience | Length | Synced? |
|---------|----------|--------|---------|
| `what-*.md` | Site readers | ≤80 words per lens (or table/diagram) | Yes |
| `README.md` | Authors, hub preview | Expanded narrative | No |

**Write accordion first.** README can add diagrams, history, and depth — never copy README verbatim into accordion files.

### Accordion lens template (`what-*.md`)

```markdown
**Quotable hook — one concrete object.**

Two or three short sentences. Optional bullets or table. One inline `/topics/` link when a mechanism exists.
```

### README section template

```markdown
## What Exists?

**Same hook as accordion, can expand.**

Additional paragraphs, mermaid diagrams, historical context. Practitioner "Try it now" at end of README mirrors `meta.yaml` `tryIt`.
```

## Case study template (README)

1. TL;DR (3 bullets, ≥1 with stakes)
2. Phenomenon card (one sentence + optional diagram) — also set `phenomenon` in `meta.yaml`
3. Seven lens sections — expanded prose
4. Curriculum bridge — links to `/topics/*`
5. Try it now — mirrors `meta.yaml` `tryIt`

## Lens guide template

1. The question (H1)
2. TL;DR (3 bullets)
3. How to use this lens (numbered steps)
4. 2–3 mini-examples (one sentence each)
5. Curriculum bridge links
6. Try it now — one prompt for the reader

## File layout

```
lenses/WHAT_EXISTS/README.md
studies/_TEMPLATE/          # copy for new studies (Office-based)
studies/SLEEP/meta.yaml
studies/SLEEP/what-exists.md
```

## Sync + lint

```bash
cd website
npm run lint:drishti-content
npm run sync:drishti && npm run catalog:drishti
```

Do not hand-edit synced files under `website/src/content/drishti/` without syncing back.
