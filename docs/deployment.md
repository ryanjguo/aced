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
| Healthcheck path | `/health` | — (no web server) |
| Watch paths | `apps/api/**`, `packages/**`, `pnpm-lock.yaml` | `apps/worker/**`, `packages/**`, `pnpm-lock.yaml` |
| Public domain | Yes | No |

The worker has no healthcheck, pre-deploy command or domain. Only the API runs migrations.

Variables (both services):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | Postgres service's `DATABASE_URL` (internal `postgres.railway.internal` address) |
| `REDIS_URL` | Redis service's `REDIS_URL` (internal address) |

API only:

| Name | Value |
| --- | --- |
| `WEB_ORIGIN` | The web app's URL (CORS, auth redirects, the Origin check on writes) |
| `BETTER_AUTH_SECRET` | A random secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | The API's public URL |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | OAuth apps. Both are needed: the sign-in page always shows both buttons |
| `INTERNAL_API_SECRET` | Same value as on Vercel. Until it's set, the per-IP rate limit stays off (page renders from Vercel would share one budget) |
| `COOKIE_DOMAIN` | Only with a custom domain; see below |
| `DB_POOL_MAX` | Optional, default 10 |
| `SENTRY_DSN` | Optional |

Worker only: `GRID_API_KEY`, `SENTRY_DSN` (optional).

Postgres, Redis, api and worker must be in the same Railway project and environment. Reference variables (`${{Postgres.DATABASE_URL}}`) are preferred, but they resolved to empty during setup, so the values are currently set directly. If the database password is rotated, update both services.

Railway sets `PORT` for the API automatically.

Database connections: the API pool holds `DB_POOL_MAX` connections (default 10) and the worker 5. Keep their sum, plus a few for migrations and `psql`, under the Postgres plan's connection limit. Queries time out after 5s in the API and 30s in the worker; requests over 500ms are logged as `slow request` with the route pattern only.

## Vercel

| Setting | Value |
| --- | --- |
| Root directory | `apps/web` |
| Framework | Next.js (auto-detected) |
| `NEXT_PUBLIC_API_URL` | The API's Railway public domain, e.g. `https://api-production-xxxx.up.railway.app` |
| `INTERNAL_API_SECRET` | Same value as on the Railway API; server-only, so browsers never see it |
| `NEXT_PUBLIC_SITE_URL` | Optional. The public site URL for canonicals, share images and the sitemap; defaults to Vercel's production domain |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional |

Set `NEXT_PUBLIC_API_URL` for Production and Preview. `NEXT_PUBLIC_` values are baked in at build time: redeploy after changing it.

Every PR gets a preview deployment.

## Custom domain and auth cookies

Sign-in needs web and API on one parent domain (e.g. `aced.gg` and `api.aced.gg`): browsers won't send the session cookie from `*.vercel.app` to `*.railway.app`. Once both have custom domains:

1. Railway API: set `BETTER_AUTH_URL=https://api.aced.gg`, `WEB_ORIGIN=https://aced.gg` and `COOKIE_DOMAIN=.aced.gg`.
2. Vercel: set `NEXT_PUBLIC_API_URL=https://api.aced.gg` and redeploy.

With an `https` `BETTER_AUTH_URL` the cookies are `Secure`; they stay `SameSite=Lax`. Leave `COOKIE_DOMAIN` blank locally.

## Checking a deploy

- API: `GET /health` returns `200` with `postgres` and `redis` both `true`
- Web: the home page shows "All systems ok"
