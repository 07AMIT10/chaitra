# Topics

All **curriculum modules** live here — one folder per subject (`SCREAMING_SNAKE_CASE`), each with at least a `README.md`.

| Start here | Site |
|------------|------|
| [BLOOM_FILTERS](BLOOM_FILTERS/) | [Bloom filters](https://chaitra.pages.dev/topics/bloom-filters) |
| [HYPERLOGLOG](HYPERLOGLOG/) | [HyperLogLog](https://chaitra.pages.dev/topics/hyperloglog) |
| [COUNT_MIN_SKETCH](COUNT_MIN_SKETCH/) | [Count–Min Sketch](https://chaitra.pages.dev/topics/count-min-sketch) |

**Full list:** [chaitra.pages.dev/catalog](https://chaitra.pages.dev/catalog)

## Add a topic

1. Create `topics/YOUR_TOPIC/README.md` (and optional `.py` / `.rs`).
2. Wire the site under `website/src/content/topics/<slug>/` if it should appear on [chaitra.pages.dev](https://chaitra.pages.dev).
3. From `website/`: `npm run catalog`, `npm run sync:readme`, `npm run build`.

See [website/README.md](../website/README.md) for deploy and Code workbench details.
