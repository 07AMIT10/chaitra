# Algorithms

A third content section beside [`topics/`](../topics) and [`drishti/`](../drishti).

It teaches algorithms through **raw mathematics**, not computer science. The unit of explanation is a mathematical object — a partition, a lattice, a potential function, a recurrence, a semiring — never a code trace. Each page is interactive: the reader manipulates the object itself, predicts before revealing, and controls the pace. The one-line brief is that the reader should finish thinking *"I did not know we could see it like this."*

Why it exists: there is half a century of mathematics-of-algorithms writing (Sedgewick–Flajolet, Knuth, Wilf, Bird–de Moor) that is almost entirely text and proof, and a rich visualisation tradition (VisuAlgo, Bostock, Red Blob) that is almost entirely operational. Interactive exposition whose primary unit is a mathematical object is under-served. This section occupies that gap.

## Layout

```
algorithms/
├── README.md              # you are here
├── AGENTS.md              # agent authoring checklist and rubric
├── _TEMPLATE/             # copy this to start a new algorithm
│   ├── meta.yaml
│   └── page.mdx
└── programming/           # the field axis: programming, later systems, mathematics, ai, networking
    └── UNION_FIND/
        ├── meta.yaml      # catalogue metadata
        └── page.mdx       # the whole page body, in MDX
```

Underscore-prefixed directories are skipped by every script, so `_TEMPLATE/` is never published.

The authored unit is **exactly two files**. A page is continuous, so it is one MDX document, not a set of accordions. MDX is deliberate: it lets the author import primitives, place an interactive block exactly where the prose needs it, and pass data inline.

## Add an algorithm

1. **Check the field.** Put the algorithm under its domain axis (`programming/`, later `systems/`, `mathematics/`, `ai/`, `networking/`) in a `SCREAMING_SNAKE_CASE` folder.
2. **Copy the template.**
   ```bash
   cp -r algorithms/_TEMPLATE algorithms/programming/YOUR_ALGORITHM
   ```
3. **Fill `meta.yaml`.** Every required field, plus a `reframe` that is a real one-sentence thesis. `relatedTopics` must use slugs that exist in `website/src/data/topics.json`.
4. **Write `page.mdx`.** No frontmatter. Follow the skeleton in [AGENTS.md](./AGENTS.md). Only reference primitives that exist in `website/src/components/algorithms/`.
5. **Sync, derive the catalogue, lint, build.**
   ```bash
   cd website
   npm run sync:algorithms
   npm run catalog:algorithms
   npm run lint:algorithms
   npm run build
   ```
6. **Open it in a real browser** and check for zero console exceptions, zero KaTeX errors, no empty panels, and every control responding. The build passing is not the same as the page working.

## The rules in one screen

| Rule | Why |
|---|---|
| Concrete artefact first | A thing on screen before any definition. Abstraction second. |
| Every page is manipulable | A watched animation teaches nothing; a driven one does. |
| No autoplay | The reader owns the pace. Step, play, pause, reset. |
| At least one prediction prompt | Lock a guess before the reveal; prediction is the best-evidenced feature here. |
| Attribute every theorem | Tarjan 1975, Birkhoff 1940, Kruskal 1956, and so on. No orphan results. |
| No decorative maths | Every symbol points at something visible. If a reader cannot tie it to the screen, cut it. |
| No per-page CSS | Primitives and design tokens only. Tokens live in `website/src/styles/tokens.css`. |
| State claims at the right strength | A cited theorem, a derived identity and a measured curve are three different things. Say which is which. |

### Making it interactive

Astro renders React to static HTML unless you ask it to hydrate, so an interactive part with no directive looks fine and does nothing. Three rules keep a page alive:

- **A primitive needs a client directive.** Write `client:visible` on it. `SeriesChart`, `GrowthTable` and `PrimitiveShell` are static and need none.
- **Islands cannot nest.** Never put one `client:*` component inside another. If controls must drive a visual, build one self-contained component that owns both.
- **Only data crosses the island boundary.** A callback cannot be passed in from the page; the component owns its handlers.

`npm run lint:algorithms` enforces all three. Check just your own page while you work with `node scripts/lint-algorithms-content.mjs --slug <slug>`.

Authoring checklist: [AGENTS.md](./AGENTS.md). Design: [docs/specs/2026-10-18-algorithms-section-design.md](../docs/specs/2026-10-18-algorithms-section-design.md). Plan: [docs/plans/2026-10-18-algorithms-section.md](../docs/plans/2026-10-18-algorithms-section.md).
