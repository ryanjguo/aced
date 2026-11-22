# Performance

## Match-day load test

`scripts/load/match-day.js` (k6) simulates a match-day spike against the API: 500 readers refreshing the feed, live series, series pages, posts, comments, trending and search every 1–2 seconds, plus 50 signed-in users voting. It ramps up over a minute, holds for two and ramps down over 30 seconds.

Run it with `scripts/load/run.sh <api url>`. It creates 50 voter accounts (votes are limited to 300 per user per hour), runs k6 in Docker (`grafana/k6:1.4.2`) and deletes the accounts. The API must be built and started with `NODE_ENV=test`, so `/auth/test-login` exists, against a seeded database.

### Results, November 2026

Local production build of the API (`node dist/index.js`, pool of 10 connections), Postgres and Redis in Docker, the `pnpm db:seed` data, one MacBook running everything.

| Endpoint | Share of reads | p95 |
| --- | --- | --- |
| `GET /feed/for-you` | 35% | 2.1 ms |
| `GET /series?status=live` | 20% | 4.5 ms |
| `GET /series/:id` | 15% | 6.8 ms |
| `GET /posts/:id` | 10% | 6.3 ms |
| `GET /posts/:id/comments` | 10% | 4.8 ms |
| `GET /trending` | 5% | 1.7 ms |
| `GET /search/entities` | 5% | 3.9 ms |
| `PUT /votes` (writers) | — | 13.6 ms |

60,689 requests in 3.5 minutes (287 per second at peak load), 0 errors, overall p95 6.7 ms, max 84 ms.

### What this does and doesn't show

- **No bottleneck at this load.** Throughput was capped by the test's own pacing (550 users waiting 1–2 seconds between requests), not by the API.
- **The data is tiny.** The seed has a few hundred posts, so every query is cheap. Slow plans and missing indexes only show with volume: https://github.com/ryanjguo/aced/issues/276 reruns this against production-sized data.
- **Production differs:** network latency between Railway services, a smaller Postgres plan, and the web tier (Vercel) in front. Since #169 the web caches esports API responses for 60 seconds, so a spike of page views reaches the API far less than this test does.
- Votes are the slowest endpoint (a transaction with a row lock per target); still well under budget.

### At production volume, November 2026 (#276)

`scripts/load/scale.sql` fills a throwaway database (`aced_load`, never the dev one) after `pnpm db:migrate` and `pnpm db:seed`: 2,000 users, 200k posts over 60 days, 500k comments, 2M votes and 60k tags, in about four minutes.

Same test, same machine: 60,771 requests (286/s), 0 errors, overall p95 7.3 ms. Per endpoint p95: feed 2.2 ms, live series 5.1 ms, series page 7.6 ms, post 6.2 ms, comments 6.8 ms, trending 1.8 ms, entity search 4.5 ms, votes 15.2 ms. Volume barely moved the numbers: indexes cover the hot paths, and the feed and trending are cached in Redis.

Cold, uncached timings of the heavier queries at this volume:

| Request | Cold |
| --- | --- |
| `GET /feed/for-you` (then cached) | 154 ms |
| `GET /search/posts?q=meta` (133k matches) | 125 ms |
| `GET /search/posts?q=clutch` (few matches) | 3 ms |
| `GET /boards/general/posts?sort=hot` | 54 ms |
| Comments on the busiest post | 10 ms |

**Bottleneck:** post search for very common terms ranks every match before cutting the page, and isn't cached. #288 caps that cost.
