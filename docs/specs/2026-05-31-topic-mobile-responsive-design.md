# Design: Topic page mobile responsiveness

**Status:** Implemented (2026-05-31)  
**Deferred:** Story text zoom controls (A− / A+)

## Goal

Topic pages should read on phones like `/topics/probability-theory` — one aligned column, readable type, no horizontal page scroll. Labs and Code get overflow guards; zoom buttons are a follow-up if preview still needs them.

## Changes

- `website/src/styles/topic-page.css` — topic shell, breadcrumbs, jump nav, section overflow
- `website/src/styles/narrative.css` — prose, math, tables, diagrams
- `TopicLayout.astro` — `.topic-page` wrapper
- `lab.css`, `code-workbench.css`, `CodePanel.css` — narrow-viewport tweaks

## Verification

Manual check on ~390px: probability-theory, bloom-filters, one readme-only topic.
