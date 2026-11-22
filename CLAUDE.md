# Aced

VCT community hub: home feed, Reddit-style boards, and pages for every player, team and event, built on official VALORANT Esports data (Riot Open Access via GRID).

## Layout

```
apps/web       Next.js (App Router) + Tailwind
apps/api       Fastify REST API
apps/worker    GRID ingestion and background jobs
packages/db    Drizzle schema, client and migrations (@aced/db)
packages/redis Redis client (@aced/redis)
packages/types Shared types, imported as @aced/types
packages/tsconfig Shared TS config
```

Code shared by more than one app goes in `packages/`. Apps never import from each other.

## Commands

```sh
pnpm dev        # all apps in watch mode
pnpm lint       # Biome lint + format check
pnpm format     # fix lint + formatting
pnpm typecheck
pnpm build
pnpm test        # tests (db tests need DATABASE_URL and migrations applied)
pnpm db:up       # local Postgres + Redis via Docker Compose
pnpm db:generate # generate a migration after editing packages/db/src/schema
pnpm db:migrate  # apply migrations
pnpm db:seed     # fill the local DB with sample esports data (idempotent)
pnpm --filter @aced/worker cards:enqueue  # queue result cards and match threads for completed series (worker must be running)
```

Run `pnpm lint && pnpm typecheck && pnpm build` before every push. CI runs the same.

## Conventions

- TypeScript strict everywhere. No `any`; prefer `unknown` and narrow.
- Biome formats: 2 spaces, single quotes, no semicolons. Don't hand-format.
- File names: `kebab-case.ts`; React components `PascalCase.tsx`.
- API response and domain types live in `@aced/types`, not in apps.
- Only `apps/worker` talks to GRID. Store GRID ids in mapping columns; use our own UUIDs everywhere else.
- Generated posts (stat cards, results, transfers) must be idempotent via a deterministic `source_key`.
- Cursor pagination only, never offsets.
- New code ships with tests. Each package's `test:coverage` script sets a coverage floor (`--coverage.thresholds.*`) and CI fails below it. Floors only go up: raise one when coverage climbs. Web aims for 60% lines.
- DB row types come from `@aced/db` (`TeamRow`, `SeriesRow`, …); API response shapes from `@aced/types`. Map between them in the API.
- Schema changes go through Drizzle migrations: edit `packages/db/src/schema`, run `pnpm db:generate`, commit the generated SQL. Never edit an applied migration.
- UI follows `docs/design-system.md`: tokens only (no raw hex), crimson only where it allows, check both themes.
- No secrets in code. Add new env vars to `.env.example`.

## Workflow

- Unattended agent sessions follow `docs/agent-runbook.md`.

- One issue → one branch → one PR. PRs are atomic: one concern, ideally under ~400 changed lines excluding generated files. Split bigger tickets into stacked PRs.
- Micro commits: one small logical step each.
- Branches: `feat/<issue>-<slug>`, `fix/…`, `chore/…`, `docs/…` (e.g. `feat/12-esports-tables`).
- Commits: short imperative subject ("Add series endpoints"), body only when needed.
- PR description starts with `Closes #<issue>`, then: What does this do? / Why is this important? / How was it tested? Keep each short and plain. Squash-merge.
- Issues use the template: What does this do? / Why is this important? / Additional context / How do we test this? / Acceptance criteria.
- Labels: one type (`feature`, `bug`, `chore`, `docs`) plus areas (`web`, `api`, `worker`, `infra`, `data`).

## Don't

- Don't commit `.env` files or GRID payloads containing keys.
- Don't add dependencies to the root `package.json` unless they're repo tooling.
- Don't use "Valorant", "VCT" or Riot logos in branding. Footer must keep "Not affiliated with or endorsed by Riot Games."
