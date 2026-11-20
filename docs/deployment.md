# Deployment

`main` deploys automatically. Web runs on Vercel; API, worker, Postgres and Redis run on Railway in one project.

Railway settings live in the dashboard (Railway's `railway.json` config is deprecated). Keep this file in sync when you change them.

## Railway

All app services use the repo root as the source (shared monorepo).

| Setting | api | worker |
| --- | --- | --- |
| Build command | `pnpm turbo build --filter=@aced/api` | `pnpm turbo build --filter=@aced/worker` |
| Start command | `pnpm --filter @aced/api start` | `pnpm --filter @aced/worker start` |
| Pre-deploy command | `pnpm db:migrate` | — |
| Healthcheck path | `/health` | — |
| Watch paths | `apps/api/**`, `packages/**`, `pnpm-lock.yaml` | `apps/worker/**`, `packages/**`, `pnpm-lock.yaml` |
| Public domain | Yes | No |

Variables (both services):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |

Railway sets `PORT` for the API automatically.

## Vercel

| Setting | Value |
| --- | --- |
| Root directory | `apps/web` |
| Framework | Next.js (auto-detected) |
| `NEXT_PUBLIC_API_URL` | The API's Railway public domain, e.g. `https://api-production-xxxx.up.railway.app` |

Every PR gets a preview deployment.

## Checking a deploy

- API: `GET /health` returns `200` with `postgres` and `redis` both `true`
- Web: the home page shows "All systems ok"
