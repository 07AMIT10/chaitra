# Chaitra website

Astro static site for topic discovery and in-browser labs.

## Local development

```bash
npm ci
npm run dev
```

Open the Bloom topic at `/topics/bloom-filters`.

## Build

Regenerate the topic catalog from repo READMEs, then build the static site:

```bash
npm run catalog
npm run sync:readme   # after changing topic README.md at repo root
npm run build
```

### Math and diagrams

Topic narratives use **remark-math** + **rehype-katex** (KaTeX CSS in `BaseLayout`) and a remark pass that turns ` ```mermaid ` fences into client-rendered diagrams. After editing a topic’s `README.md` outside `website/`, run `npm run sync:readme` before `npm run build` so `readme-body.md` stays in sync (duplicate `#` titles are stripped automatically).

When Rust WASM sources change (`BLOOM_FILTERS/` or `website/wasm/bloom_filter/`), rebuild glue and binaries before the site build:

```bash
npm run build:wasm   # requires wasm-pack: cargo install wasm-pack
npm run build
```

Output is `dist/`. WASM assets are copied from `public/wasm/bloom_filter/` (committed artifacts; CI does not rebuild WASM unless you add that step).

Full production-style build from `website/`:

```bash
npm ci && npm run catalog && npm run build:wasm && npm run build
```

## Cloudflare Pages

**Deploy checklist and MCP notes:** [DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md) (dashboard settings, Wrangler, GitHub `07AMIT10/chaitra`).

Connect the **chaitra** Git repository in the Cloudflare dashboard (Workers & Pages → Create → Connect to Git). Set the **root directory** to `website` so build commands run inside this folder.

| Setting | Value |
|---------|--------|
| Production branch | `main` (or your default) |
| Root directory | `website` |
| Build command | `npm ci && npm run catalog && npm run build:wasm && npm run build` |
| Build output directory | `dist` |
| Node.js version | **20** (Environment variables → `NODE_VERSION=20` if the dashboard offers it) |

### Environment

No secrets are required for Phase 1 static hosting. Optional: `PUBLIC_SITE_URL` for canonical URLs in `astro.config.mjs`.

### WASM on Pages

The build command above runs `build:wasm`, which needs **wasm-pack** and **Rust** on the build image. Cloudflare Pages does not include them by default. Choose one:

1. **Recommended for Phase 1:** Use `npm ci && npm run catalog && npm run build` and rely on committed files under `public/wasm/bloom_filter/`. Run `npm run build:wasm` locally when `BLOOM_FILTERS/` changes, commit the output, then deploy.
2. **Rebuild WASM on every deploy:** Add a pre-build step or custom build image with Rust + `cargo install wasm-pack`, or use CI to build WASM and deploy via Wrangler (below).

### Content-Security-Policy

WebAssembly compilation needs `wasm-unsafe-eval` in `script-src`. Pyodide loads from `cdn.jsdelivr.net`.

Headers are applied via `public/_headers` (copied into `dist/` on build). To change policy, edit that file or set **Headers** in the Cloudflare Pages project settings (dashboard overrides should match the same directives).

Example policy (also in `_headers`):

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net wasm-unsafe-eval; connect-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
```

Adjust if you add analytics or other CDNs.

### Custom domain

1. Pages project → **Custom domains** → **Set up a custom domain**.
2. Enter your hostname (e.g. `chaitra.example.com`).
3. Add the CNAME (or flattened A/AAAA) records Cloudflare shows at your DNS provider, or use a zone already on Cloudflare for automatic setup.
4. Wait for **Active** SSL status; enforce HTTPS in **SSL/TLS** if needed.

### Deploy paths

| Path | What happens |
|------|----------------|
| **Git integration (default)** | Push to the production branch; Cloudflare runs the build settings above and publishes `dist/`. |
| **Wrangler CLI** | After a local build: `npx wrangler pages deploy dist --project-name chaitra` (requires `wrangler login`). See `wrangler.toml`. |
| **Local preview** | `npm run build && npx wrangler pages dev dist` |

Preview deployments are created automatically for pull requests when Git integration is enabled.

## CI (GitHub Actions)

Workflow: [`.github/workflows/website-ci.yml`](../.github/workflows/website-ci.yml)

- **Push** to `website/**` or `BLOOM_FILTERS/**`: `npm ci`, `npm run catalog`, `npm run build` in `website/`.
- **Pull requests** touching `website/**` only: same build (no deploy).

To verify locally (matches CI):

```bash
cd website && npm ci && npm run catalog && npm run build
```

To also test WASM rebuild (not in default CI):

```bash
cargo install wasm-pack   # once
cd website && npm run build:wasm && npm run build
```

## Catalog script

`npm run catalog` scans the **repository root** (parent of `website/`) for topic folders with `README.md` and writes `src/data/topics.json`. Run it after adding or renaming topic directories, even when only READMEs change outside `website/`.

## Accessibility (Lighthouse)

After layout or lab UI changes, run a static build and audit the Bloom topic:

```bash
cd website
npm run build
npx --yes serve dist -l 4321
```

In another terminal (Chrome required):

```bash
npx --yes lighthouse http://localhost:4321/topics/bloom-filters/ \
  --only-categories=accessibility \
  --chrome-flags="--headless=new" \
  --output=json --output-path=./lighthouse-a11y.json
```

Target: **accessibility score ≥ 90**. Manual checks: Tab through Bloom lab sliders and buttons; Enter on **Test** / **Insert**; arrow keys on parameter and code tabs; verify skip link (“Skip to content”) appears on keyboard focus.

Topic pages use `TopicLayout` (skip link, section landmarks) and shared focus rings in `src/styles/tokens.css`.
