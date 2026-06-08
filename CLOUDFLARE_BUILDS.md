# Cloudflare Workers Builds (preview)

Preview secrets use [dotenvx `.env.txt` on Cloudflare Workers](https://dotenvx.com/docs/secrets-in-cloudflare-workers), same pattern as `cloud-services/resend-webhook-router` in the langquest repo.

| File | Committed | Purpose |
|------|-----------|---------|
| `.env.preview.txt` | Yes (encrypted) | Preview env bundled / read at build + runtime |
| `.env.keys` | No | Private keys (local only) |

## Why the key can be “set” but the build still fails

Cloudflare has **two** env surfaces:

| Where | Used for | Example |
|-------|----------|---------|
| **Settings → Variables and Secrets** | Worker **runtime** | `DOTENV_PRIVATE_KEY` — decrypts `.env.preview.txt` in the running Worker |
| **Settings → Builds → Variables and secrets** | **`pnpm run build`** only | Same key value — required for Next.js / OpenNext ([OpenNext env docs](https://opennext.js.org/cloudflare/howtos/env-vars)) |

If `DOTENV_PRIVATE_KEY_PREVIEW` (or `DOTENV_PRIVATE_KEY`) exists only under **Variables and Secrets**, the build log will show `DOTENV_* in build env: (none)` even though the dashboard lists the secret.

Build variables are also **per trigger** (production branch vs other branches). Add the key on the trigger that matches the branch you build.

## Preview worker setup

**Worker:** `langquest-website-preview`

### 1. Runtime (dotenvx Workers pattern)

**Settings → Variables and Secrets → Add secret:**

| Name | Value |
|------|--------|
| `DOTENV_PRIVATE_KEY` | Hex from `.env.keys` (`DOTENV_PRIVATE_KEY_PREVIEW=...`) |

`DOTENV_PRIVATE_KEY_PREVIEW` also works; `scripts/dotenv-load-preview.mjs` accepts both.

### 2. Build (required for Next.js)

**Settings → Builds → Variables and secrets → Add secret** (same hex value):

| Name | Value |
|------|--------|
| `DOTENV_PRIVATE_KEY` | Same hex as runtime |

### 3. Build settings

| Setting | Value |
|--------|--------|
| **Root directory** | `/` |
| **Build command** | `pnpm run build` |
| **Deploy command** | `pnpm run deploy:preview` or `pnpm exec wrangler versions upload --env preview` |

Use `opennextjs-cloudflare deploy --env preview -- --keep-vars` (see `deploy:preview` in `package.json`) so dashboard runtime secrets are not wiped on deploy.

## Local commands

```bash
pnpm encrypt:preview   # re-encrypt after editing .env.preview.txt
pnpm dev             # dotenvx + .env.preview.txt
pnpm deploy:preview  # OpenNext preview deploy
```

## Production worker

Use `.env.production` (or add `.env.production.txt` later) and `DOTENV_PRIVATE_KEY` / `DOTENV_PRIVATE_KEY_PRODUCTION` the same way on `langquest-website-production`.
