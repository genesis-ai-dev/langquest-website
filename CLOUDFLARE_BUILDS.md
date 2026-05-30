# Cloudflare Workers Builds (preview)

## What went wrong

Logs like `DOTENV_PRIVATE_KEY_PRODUCTION=` (empty) and `destination":"encrypted:BMN6..."` mean:

1. **Build secrets** — `DOTENV_PRIVATE_KEY_PRODUCTION` is set in the dashboard but **empty**. dotenvx tries to decrypt `.env.production` and leaves `encrypted:...` literals in `process.env`, so Next rewrites break.
2. **Wrong env file for preview** — `pnpm build` used `.env.production` while the preview Worker should use `.env.preview`.
3. **OpenNext runtime snapshot** — `compileEnvFiles` only reads `.env.production` / `.env.production.local`, not `.env.preview`. Preview deploys run `scripts/sync-preview-env-for-opennext.mjs` to write `.env.production.local` from decrypted preview vars.

## Preview worker — Build variables and secrets (required)

Your build log showed `node scripts/build.mjs` then plain `next build` with `encrypted:...` rewrites. That means **no private key was visible to the build** — the dashboard still had **Variables and secrets: None**.

In **Workers → langquest-website-preview → Settings → Builds → Variables and secrets → Add**:

| Type | Name | Value |
|------|------|--------|
| Secret (or Variable) | `DOTENV_PRIVATE_KEY_PREVIEW` | Paste the **full hex key** from local `.env.keys` after `DOTENV_PRIVATE_KEY_PREVIEW=` (no quotes) |

Example line in `.env.keys`:

```bash
DOTENV_PRIVATE_KEY_PREVIEW=f45341812fc32e3dd852d179a8197874f41a7379eb13932cdfb1a1e18757b448
```

In Cloudflare you set **Name** = `DOTENV_PRIVATE_KEY_PREVIEW`, **Value** = only the hex part.

| Do | Don't |
|----|--------|
| Add `DOTENV_PRIVATE_KEY_PREVIEW` | Leave secrets as **None** |
| Delete unused `DOTENV_PRIVATE_KEY_PRODUCTION` on this worker | Set `DOTENV_PRIVATE_KEY_PRODUCTION` to an **empty** value |

| Setting | Value |
|--------|--------|
| **Root directory** | `/` |
| **Build command** | `pnpm run build` *(runs OpenNext + decrypts preview when `WORKERS_CI` + `DOTENV_PRIVATE_KEY_PREVIEW` are set)* |
| **Non-production branch deploy command** | `pnpm exec wrangler deploy --env preview --dry-run` |

**Do not** use plain `next build` via a custom command — that skips dotenvx and leaves `encrypted:...` in rewrites.

Alternative (single step): leave **Build command** empty and set **Non-production branch deploy command** to `pnpm workers:ci`.

## Production worker

| Name | Value |
|------|--------|
| `DOTENV_PRIVATE_KEY_PRODUCTION` | From `.env.keys` |
| **Deploy command** | `pnpm deploy` |

Do **not** set `DOTENV_PRIVATE_KEY_PREVIEW` on the production worker unless you also need it.
