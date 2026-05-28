# Chaitra website

Astro static site for topic discovery and in-browser labs.

## Local development

```bash
npm ci
npm run dev
```

Open the Bloom topic at `/topics/bloom-filters`.

## Build

When Rust WASM changes, rebuild glue and binaries before the site build:

```bash
npm run build:wasm   # requires wasm-pack: cargo install wasm-pack
npm run build
```

Output is `dist/`. WASM assets are copied from `public/wasm/bloom_filter/`.

## Cloudflare Pages

| Setting | Value |
|---------|--------|
| Root directory | `website` |
| Build command | `npm ci && npm run build:wasm && npm run build` |
| Output directory | `dist` |
| Node | 20 |

### Content-Security-Policy

WebAssembly compilation needs `wasm-unsafe-eval` in `script-src` (in addition to `'self'`). Pyodide loads from `cdn.jsdelivr.net`. Example header for Pages:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net wasm-unsafe-eval; connect-src 'self' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data:;
```

Adjust if you add more CDNs or analytics.
