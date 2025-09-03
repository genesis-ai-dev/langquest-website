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

1) Link this folder to your Vercel project (skip if `.vercel/project.json` exists):

```bash
pnpm dlx vercel@latest link
```

2) Pull the env variables into a local file:

```bash
pnpm dlx vercel@latest env pull .env.local
```

- Choose which set to pull (Development/Preview/Production) when prompted.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Future Development (Possibilities)

### Database Viewer

- Move to a local first approach, and sync with Supabase database
  - then do SQL queries and such for filtering rather than JavaScript (save bandwidth).
