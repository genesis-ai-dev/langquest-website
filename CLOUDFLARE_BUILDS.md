# Cloudflare Workers Builds (preview)

## What went wrong

Logs like `DOTENV_PRIVATE_KEY_PRODUCTION=` (empty) and `destination":"encrypted:BMN6..."` mean:

1. **Build secrets** — `DOTENV_PRIVATE_KEY_PRODUCTION` is set in the dashboard but **empty**. dotenvx tries to decrypt `.env.production` and leaves `encrypted:...` literals in `process.env`, so Next rewrites break.
2. **Wrong env file for preview** — `pnpm build` used `.env.production` while the preview Worker should use `.env.preview`.
3. **OpenNext runtime snapshot** — `compileEnvFiles` only reads `.env.production` / `.env.production.local`, not `.env.preview`. Preview deploys run `scripts/sync-preview-env-for-opennext.mjs` to write `.env.production.local` from decrypted preview vars.

## Preview worker — Build variables and secrets

In **Workers → langquest-website-preview → Settings → Builds → Build variables and secrets**:

| Name | Value |
|------|--------|
| `DOTENV_PRIVATE_KEY_PREVIEW` | Full key from local `.env.keys` (required) |
| `DOTENV_PRIVATE_KEY_PRODUCTION` | Full production key **or delete this variable entirely** on the preview worker — **never** set it to an empty string |

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
