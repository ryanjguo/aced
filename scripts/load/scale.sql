-- Bulk-fills a seeded database to production-like volume for load tests (#276):
-- 2,000 users, 200k posts over 60 days, 500k comments, ~2M votes, 60k tags.
-- Run against a throwaway database, never your dev one:
--   createdb aced_load && DATABASE_URL=.../aced_load pnpm db:migrate && ... pnpm db:seed
--   psql .../aced_load -f scripts/load/scale.sql
\timing on
insert into users (id, name, email, handle, created_at)
select gen_random_uuid(), 'Scale ' || i, 'scale_' || i || '@load.test', 'scale_' || i, now() - interval '90 days'
from generate_series(1, 2000) i;

create temp table u as select id, row_number() over () as n from users;
create temp table b as select id, row_number() over () as n from boards;

insert into posts (kind, author_id, board_id, title, body, score, hot_score, created_at)
select
  case when i % 3 = 0 then 'take'::post_kind else 'thread'::post_kind end,
  (select id from u where n = 1 + (i * 7919) % (select count(*) from u)),
  case when i % 3 = 0 then null else (select id from b where n = 1 + i % (select count(*) from b)) end,
  case when i % 3 = 0 then null else 'Scaled thread ' || i || ' about the stage one meta' end,
  'Body ' || i || ' talking about rosters, maps and who is playing well this week.',
  (random() * 200 - 20)::int,
  random() * 10,
  now() - (random() * interval '60 days')
from generate_series(1, 200000) i;

create temp table p as select id, row_number() over () as n from posts where body like 'Body %';

insert into comments (post_id, author_id, body, score, created_at)
select p.id, u.id, 'Comment ' || g.i, (random() * 20)::int, now() - (random() * interval '60 days')
from generate_series(1, 500000) g(i)
join p on p.n = 1 + (g.i::bigint * 104729) % 200000
join u on u.n = 1 + (g.i * 31) % (select count(*) from u);

-- ~1,000 votes per user on pseudo-random posts.
insert into votes (user_id, target_type, target_id, value)
select u.id, 'post', p.id, case when (u.n + p.n) % 5 = 0 then -1 else 1 end
from u
join p on (p.n * 7 + u.n * 13) % 200 = 0
on conflict do nothing;

insert into post_tags (post_id, entity_type, entity_id)
select p.id, 'team', t.id
from p join (select id, row_number() over () as n from teams) t
  on t.n = 1 + p.n % (select count(*) from teams)
where p.n % 10 < 3
on conflict do nothing;

update posts set comment_count = c.count
from (select post_id, count(*) from comments group by post_id) c
where posts.id = c.post_id;

analyze;
select (select count(*) from posts) posts, (select count(*) from comments) comments,
       (select count(*) from votes) votes, (select count(*) from post_tags) tags;
