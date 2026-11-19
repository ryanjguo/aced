# aced

Watch VCT with friends. Call it before it happens.

Live match rooms, pick'em leagues and a track record for every call you make, built on official VALORANT Esports data.

## Stack

TypeScript monorepo · pnpm + Turborepo · Next.js · Fastify · Postgres · Redis · Biome

```
apps/
  web/      Next.js web app
  api/      Fastify API
  worker/   GRID ingestion and background jobs
packages/
  types/    Shared types
  tsconfig/ Shared TypeScript config
```

## Getting started

Requires Node 22+ and pnpm.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Web runs on `localhost:3000`, API on `localhost:4000`.

## Scripts

| Command          |                             |
| ---------------- | --------------------------- |
| `pnpm dev`       | Run every app in watch mode |
| `pnpm build`     | Build everything            |
| `pnpm typecheck` | Type-check all packages     |
| `pnpm lint`      | Lint and format check       |
| `pnpm format`    | Fix lint and formatting     |

---

Not affiliated with or endorsed by Riot Games.
