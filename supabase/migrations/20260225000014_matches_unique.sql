-- Phase 3.1 Constraints Additive Patch: Unique Matches
-- The matching engine uses `upsert` on user1_id and user2_id. A unique constraint is required.

ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_user1_user2_key;

ALTER TABLE public.matches
ADD CONSTRAINT matches_user1_user2_key UNIQUE (user1_id, user2_id);
