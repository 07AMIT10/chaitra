# Technical Review V2 — remainder sign-off

Date: 2026-05-28  
Branch: `feat/review-v2-remainder`

## Completed

- Site shell: favicon, footer, font-size tokens, light/dark theme toggle
- Topic TOC sidebar (desktop), homepage hero SVG, learning path with localStorage progress
- `readme-only` status for 17 prose topics; static paths include `readme-only`
- Tier B preview labs for all 17 readme-only topics
- Math tests: 187 tests across 34 `*-math.ts` modules
- Python reference: PageRank, queueing, gossip, rate limiting, TinyLFU (+ code panels)
- BitGridCanvas column cap (128 sampled)
- Play/Pause + aria-labels on stream labs: Bloom, CMS, TinyLFU, Gossip, Consensus, HLL, Streaming Analytics, **MapReduce, Monte Carlo, RED, Rate limiting, Streaming Algorithms, Probability Theory**
- SVG primary charts: HLL, Information Theory, Probability Theory (histogram + sparkline), Queueing, Monte Carlo convergence, Rate limiting timeline, RED packet timeline, Power-of-two, Token routing, Mixture-of-experts, Spam likelihood bars

## Verify

```bash
cd website
npm run test:math
npm run build
```
