# Drishti (दृष्टि)

**Drishti** is Chaitra's reality-navigation layer — seven universal questions you can ask about *any* phenomenon.

The curriculum teaches **mechanisms** (Bloom filters, gossip, queueing). Drishti teaches **perception**: how to look at offices, sleep, traffic, or your own team through the same lenses.

## Structure

| Path | Purpose |
|------|---------|
| `lenses/` | Seven question-based guides |
| `studies/` | Case studies applying all seven lenses |
| `framework/` | Universal template + forecasting walkthrough |
| `AUTHORING.md` | Content rules (ADHD-friendly) |

## Site routes

- `/drishti` — hub
- `/drishti/framework` — onboarding
- `/drishti/lenses/[lens]` — lens guides
- `/drishti/studies/[slug]` — case studies

Edit here, then from `website/`: `npm run sync:drishti && npm run catalog:drishti`.
