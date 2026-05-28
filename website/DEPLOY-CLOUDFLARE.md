# Deploy Chaitra website on Cloudflare Pages

This document records what the **Cloudflare Cursor MCP servers** can and cannot do for this project, plus a dashboard checklist and optional Wrangler deploy path.

**Repository:** [github.com/07AMIT10/chaitra](https://github.com/07AMIT10/chaitra)  
**Site root:** `website/` (monorepo subdirectory)  
**Wrangler project name:** `chaitra` (`website/wrangler.toml`)

---

## MCP capabilities (what worked / what did not)

Four MCP servers are available in Cursor: `plugin-cloudflare-cloudflare-builds`, `plugin-cloudflare-cloudflare-bindings`, `plugin-cloudflare-cloudflare-docs`, and `plugin-cloudflare-cloudflare-observability`.

| Server | Tools (summary) | Result for Chaitra Pages |
|--------|-----------------|---------------------------|
| **cloudflare-builds** | `accounts_list`, `set_active_account`, `workers_list`, `workers_builds_list_builds`, `workers_builds_get_build`, `workers_builds_get_build_logs`, … | **Auth OK.** Listed account `Rajjoishere@gmail.com's Account` (`a881d96bfc9623bb548acc61b1554188`). **0 Workers** in account. **No Pages project list, no Pages build trigger, no deployment inspect.** Builds tools target [Workers CI/CD builds](https://developers.cloudflare.com/workers/ci-cd/builds/) only. |
| **cloudflare-bindings** | `accounts_list`, `set_active_account`, D1/KV/R2/Hyperdrive CRUD, `search_cloudflare_documentation`, `migrate_pages_to_workers_guide` | **Auth OK.** Same account. Useful for **Workers bindings**, not static Pages hosting. |
| **cloudflare-docs** | `search_cloudflare_documentation`, `migrate_pages_to_workers_guide` | **Works.** Used to validate `wrangler.toml` / Pages build settings against current docs. |
| **cloudflare-observability** | `accounts_list`, `query_worker_observability`, `workers_list`, … | **Auth OK.** **Worker runtime logs/metrics only** — not Pages build logs or static asset traffic. |

### MCP gaps for Pages

- **Cannot** create, list, or configure a Pages project via MCP.
- **Cannot** trigger or inspect Pages Git builds or preview deployments.
- **Cannot** read Pages build logs from the dashboard pipeline.

For Pages operations, use the **dashboard**, **Wrangler CLI**, or the [Pages REST API](https://developers.cloudflare.com/pages/configuration/api/) with an API token.

### Wrangler CLI in this environment

`npx wrangler pages project list` was not run successfully here (npm registry `EAI_AGAIN` when fetching Wrangler). After `wrangler login` on your machine:

```bash
cd website
npx wrangler pages project list --json
```

If a project named `chaitra` exists, production URL is typically **`https://chaitra.pages.dev`** (or a suffixed variant if the name is taken).

---

## Dashboard checklist (Git-connected Pages)

1. Open [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Create** → **Pages** → **Connect to Git**.
2. Select **`07AMIT10/chaitra`** and authorize GitHub if prompted.
3. Configure build (must match [website-ci.yml](../.github/workflows/website-ci.yml) Node 20 and catalog step):

| Setting | Value |
|---------|--------|
| **Production branch** | `main` (or your default) |
| **Root directory** | `website` |
| **Build command** | `npm ci && npm run catalog && npm run build` |
| **Build output directory** | `dist` |
| **Framework preset** | None / Astro (optional; command overrides preset) |
| **Build system** | Prefer **V2 or V3** (required if you later rely on `wrangler.toml` for Pages Functions config) |

4. **Environment variables** (Settings → Environment variables):

| Name | Value | Notes |
|------|--------|--------|
| `NODE_VERSION` | `20` | Matches GitHub Actions; pin to avoid default drift |
| `PUBLIC_SITE_URL` | *(optional)* | Canonical URL for Astro if configured |

5. **First deploy:** Save and Deploy → confirm build log shows `catalog` then `astro build` and uploads `dist/`.

6. **Content-Security-Policy:** Policy is in `public/_headers` (copied to `dist/_headers` on build). Required for WASM (`wasm-unsafe-eval`) and Pyodide (`cdn.jsdelivr.net`). Do not strip these in dashboard **Headers** unless you replicate the same directives. See [Pages custom headers](https://developers.cloudflare.com/pages/configuration/headers/).

7. **WASM:** Default build does **not** run `build:wasm` (no Rust/wasm-pack on Pages image). Use committed assets under `public/wasm/bloom_filter/`. Rebuild locally with `npm run build:wasm` when `BLOOM_FILTERS/` changes, then commit and push.

8. **Preview deployments:** Enable for pull requests (default with Git integration).

9. **Custom domain (optional):** Pages → **Custom domains** → add hostname and DNS records.

---

## Config alignment (`wrangler.toml` / README)

Current `website/wrangler.toml`:

```toml
name = "chaitra"
compatibility_date = "2024-09-23"
pages_build_output_dir = "dist"
```

This matches [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/):

- `name` — Pages project name for `wrangler pages deploy` / `pages project list`.
- `pages_build_output_dir` — static output after `npm run build` (`dist/`).
- `compatibility_date` — valid; bump when adopting Pages Functions or `nodejs_compat`.

**Note:** Dashboard Git build settings (command, root dir, output) are **not** read from `wrangler.toml` unless you migrate to dashboard-as-code / V2+ wrangler-driven project config. Keep dashboard values in sync with the table above.

Optional improvements (not required for static Astro):

- Add `website/.node-version` with `20` as a second pin alongside `NODE_VERSION`.
- Add `"$schema" = "./node_modules/wrangler/config-schema.json"` after Wrangler is a devDependency.

---

## Optional: deploy with Wrangler (direct upload)

No Git push required for a one-off upload (useful for testing CSP/assets):

```bash
cd website
npm ci && npm run catalog && npm run build
npx wrangler login                    # once per machine
npx wrangler pages deploy dist --project-name chaitra
```

Create the project first if needed:

```bash
npx wrangler pages project create chaitra --production-branch main
```

Account ID (from MCP `accounts_list`): `a881d96bfc9623bb548acc61b1554188` — use with `CLOUDFLARE_ACCOUNT_ID` in CI if you add [Direct Upload + GitHub Actions](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/).

Local preview:

```bash
npm run build && npx wrangler pages dev dist
```

---

## Blockers / manual steps

| Item | Status |
|------|--------|
| Cloudflare MCP OAuth | **Working** for account/workers/docs tools |
| Pages project `chaitra` | **Unknown** — not listable via MCP; confirm in dashboard or `wrangler pages project list` |
| Production URL | **Unknown** until first successful deploy (expected `*.pages.dev`) |
| GitHub → Cloudflare | **Manual** — connect `07AMIT10/chaitra` in dashboard (MCP cannot do this) |
| Wrangler in CI | Not configured; [website-ci.yml](../.github/workflows/website-ci.yml) builds only, does not deploy |

---

## Related docs

- [website/README.md](./README.md) — local dev, WASM, CSP, CI
- [Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Build image / NODE_VERSION](https://developers.cloudflare.com/pages/configuration/build-image/)
