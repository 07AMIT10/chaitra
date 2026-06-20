# Drishti authoring guide

Content for neurodiverse readers: predictable structure, short chunks, scannable headings.

## Every page must have

1. **TL;DR** — exactly 3 bullets at the top
2. **Bold one-line takeaway** at the start of each section
3. **Max 2–3 sentences** per paragraph

## Voice

- Plain language first; jargon only after a plain-language line
- Bullets and numbered lists over prose walls
- One idea per lens block — no nested concepts without a bridge sentence

## Case study template

1. TL;DR (3 bullets)
2. Phenomenon card (one sentence + optional diagram)
3. Seven lens sections — collapsible; first open, rest closed
4. Curriculum bridge — links to `/topics/*`
5. Forecasting snapshot — only under `what-will-happen` lens block

## Lens guide template

1. The question (H1)
2. TL;DR (3 bullets)
3. How to use this lens (numbered steps)
4. 2–3 mini-examples (one sentence each)
5. Curriculum bridge links
6. Try it now — one prompt for the reader

## File layout

```
lenses/WHAT_EXISTS/README.md     # frontmatter + body
studies/SLEEP/meta.yaml          # title, slug, tldr, relatedTopics, atAGlance
studies/SLEEP/what-exists.md     # one file per lens
framework/README.md
```

## Sync

```bash
cd website && npm run sync:drishti && npm run catalog:drishti
```

Do not hand-edit synced files under `website/src/content/drishti/` without syncing back.
