## Getting Started

First, install the dependencies:

```bash
pnpm i
```

Second, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables (Vercel)

Pull environment variables from your Vercel project into a local `.env.local` and access them via `process.env`.

1. Link this folder to your Vercel project (skip if `.vercel/project.json` exists):

```bash
pnpm dlx vercel@latest link
```

2. Pull the env variables into a local file:

```bash
pnpm dlx vercel@latest env pull .env.local
```

- Choose which set to pull (Development/Preview/Production) when prompted.

## Local Development (Docker)

To run the website against a local Supabase Docker container, copy the example file:

```bash
cp .env.example .env.development.local
```

Then fill in the local Supabase values (the default demo keys from `npx supabase status`):

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from supabase status>
NEXT_PUBLIC_SUPABASE_BUCKET=local
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SUPABASE_SERVICE_ROLE_KEY=<service_role key from supabase status>
```

Next.js automatically loads `.env.development.local` over `.env.local` during `pnpm dev`, so no other changes are needed. To switch back to the remote environment, rename or delete `.env.development.local`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Future Development (Possibilities)

### Database Viewer

- Move to a local first approach, and sync with Supabase database
  - then do SQL queries and such for filtering rather than JavaScript (save bandwidth).
