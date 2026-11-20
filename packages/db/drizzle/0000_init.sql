-- Initial migration: extensions used by later tables.
-- citext: case-insensitive handles and slugs.
CREATE EXTENSION IF NOT EXISTS citext;
