# Cloudflare Workers Builds

Workers Builds must run OpenNext **before** Wrangler. A bare `wrangler deploy --dry-run` fails with:

```text
The entry-point file at ".open-next/worker.js" was not found.
```

## Dashboard settings

Worker: `langquest-website-preview` (or your preview worker name)

| Setting | Value |
|--------|--------|
| **Root directory** | `/` (repo root, not `cloud-services/audio-concat-worker`) |
| **Build command** | *(leave empty)* |
| **Non-production branch deploy command** | `pnpm workers:ci` |

### Alternative (two-step)

| Setting | Value |
|--------|--------|
| **Build command** | `LANGQUEST_DOTENV_FILE=.env.preview pnpm exec dotenvx run -f .env.preview --overload --ignore=MISSING_ENV_FILE -- opennextjs-cloudflare build` |
| **Non-production branch deploy command** | `pnpm exec wrangler deploy --env preview --dry-run` |

## Build variables and secrets

Add in **Settings → Builds → Build variables and secrets** ([docs](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#environment-variables)):

- `DOTENV_PRIVATE_KEY_PREVIEW` — from your local `.env.keys`

Production worker (`langquest-website-production`):

- **Deploy command**: `pnpm deploy`
- `DOTENV_PRIVATE_KEY_PRODUCTION`

## GitHub Actions

PRs run `.github/workflows/cloudflare-preview.yml` via `pnpm workers:ci`. Add repo secret `DOTENV_PRIVATE_KEY_PREVIEW`.
