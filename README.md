# aced

The VCT community hub.

A home for VCT discussion: a feed, forums, and a page for every player, team and event, built on official VALORANT Esports data.

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

---

Not affiliated with or endorsed by Riot Games.
