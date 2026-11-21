-- Launch boards. ON CONFLICT keeps this safe if a board was created or renamed by hand.
INSERT INTO "boards" ("slug", "name", "description", "sort_order") VALUES
  ('general', 'General', 'Anything about the pro scene.', 0),
  ('transfers', 'Transfers & Rumors', 'Roster moves, rumors and confirmations.', 1),
  ('match-threads', 'Match Threads', 'Live and post-match discussion.', 2),
  ('americas', 'Americas', 'The Americas league.', 3),
  ('emea', 'EMEA', 'The EMEA league.', 4),
  ('pacific', 'Pacific', 'The Pacific league.', 5),
  ('china', 'China', 'The China league.', 6),
  ('clips', 'Clips', 'Highlights and plays.', 7)
ON CONFLICT ("slug") DO NOTHING;
