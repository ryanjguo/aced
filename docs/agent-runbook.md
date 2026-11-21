# Agent runbook

How an unattended agent session picks up and ships one ticket. Read CLAUDE.md first; this file adds the process.

## 1. Pick a ticket

1. Open the pinned **Build order** issue. Work top to bottom.
2. A ticket is **available** if it is open, labelled `agent-ready`, has no open PR linked to it, and every "Depends on" issue is closed or has an open PR you can stack on.
3. Never take `needs-human`, `blocked` or `epic` issues: they need Ryan or something external.
4. Prefer tickets Ryan won't need to act on. A ticket **needs Ryan** if its PR would need manual steps to work (new keys, accounts, env vars, dashboard changes). Take one of those only if:
   - later tickets depend on it, or
   - no other available ticket is left.
   Build the code anyway and list the manual steps in the PR.
5. Before starting, check the ticket's size. If it would clearly exceed ~400 changed lines (excluding generated files), split it: create sub-issues with the issue template (add them under the ticket via the sub-issues API), add them to the Build order right after the parent, then start the first one.
6. Keep going ticket after ticket.

### When the Build order is done

There is always more to do. When no available ticket is left:

1. Compare the app with `docs/` and the open issues, and look for gaps: bugs, missing tests, missing empty/error/loading states, accessibility, performance, missing pieces of finished slices.
2. Create tickets for what you find (issue template, labels, `agent-ready` or `needs-human`) and append them to the Build order.
3. Only when the current slices have no gaps left, break down the first `epic` issue in the Build order's "Later" list into tickets the same way.
4. Continue with the new tickets.

## 2. Branch

- Dependencies all merged: branch from `main`.
- A dependency has an open PR: branch from that PR's branch and open your PR against it (stacked PR). Say so at the top of the PR.
- Name: `feat/<issue>-<slug>`, `fix/…`, `chore/…`, `docs/…`.

## 3. Local environment

Docker may not be available. Start Postgres and Redis directly:

```sh
PGBIN=$(ls -d /usr/lib/postgresql/*/bin | tail -1)
id pgtest >/dev/null 2>&1 || useradd -m pgtest
mkdir -p /tmp/pgdata && chown pgtest /tmp/pgdata
[ -f /tmp/pgdata/PG_VERSION ] || su pgtest -c "$PGBIN/initdb -D /tmp/pgdata -U postgres --auth=trust"
su pgtest -c "$PGBIN/pg_ctl -D /tmp/pgdata -o '-p 5432 -k /tmp' -l /tmp/pgdata/pg.log start"
psql -h localhost -U postgres -tc "select 1 from pg_database where datname='aced'" | grep -q 1 || psql -h localhost -U postgres -c "create database aced"
redis-server --port 6379 --daemonize yes
cp -n .env.example .env
pnpm install && pnpm db:migrate
```

If the seed script exists, run `pnpm db:seed` for sample data.

## 4. Build

- Follow the ticket's "Additional context": files to touch, patterns to copy, defaults to use.
- Micro commits: one small logical step each, imperative subject.
- Stay under ~400 changed lines excluding generated files. If the ticket is clearly bigger, ship the first coherent part, and create a follow-up issue for the rest (template below), linked in the PR.
- Add tests for API routes and worker jobs (Vitest; API routes via `app.inject`).
- For UI, take screenshots with headless Chrome at 390px and 1100px and check them:
  `google-chrome --headless=new --no-sandbox --window-size=390,900 --virtual-time-budget=4000 --screenshot=/tmp/shot.png http://localhost:3000/<path>`
- Unsure about a product decision not covered by the ticket? Pick the simplest option that keeps the acceptance criteria, and note it under "Decisions" in the PR.

## 5. Check

```sh
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

All must pass before pushing. Never push red.

## 6. Pull request

- Title: the change in plain words.
- Body (no links to the agent conversation):

  ```
  Closes #<issue>            (or "Part of #<issue>" if partial)
  Stacked on #<pr>           (only if stacked)

  ## What does this do?
  ## Why is this important?
  ## How was it tested?
  ## Decisions              (only if you made any)
  ## Manual steps           (only if something must be done outside the code)
  ```

- Wait for CI. If it fails, fix it on the same branch.
- Never merge. Ryan reviews and merges.

## 7. Follow-ups

Create an issue for anything found but out of scope (bugs, tech debt, missing pieces). Use the template:
What does this do? / Why is this important? / Additional context / How do we test this? / Acceptance criteria.
Label it with one type (`feature`, `bug`, `chore`, `docs`), its areas, and `agent-ready` or `needs-human`.

## 8. When blocked

If the ticket can't be done (missing key, unclear requirement, broken dependency), comment on the issue explaining what's needed, add `needs-human`, and move to the next ticket.

## Never

- Merge PRs, force-push `main`, or delete branches
- Commit `.env`, keys or real credentials
- Run migrations or seed scripts against production
- Edit an applied migration
