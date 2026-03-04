-- 1. Extend `interviews` table
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS transcript_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS analysis_json JSONB;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS absolute_score SMALLINT;
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS risk_flags TEXT[];
ALTER TABLE interviews ADD COLUMN IF NOT EXISTS model_version TEXT;

-- 2. Create `user_traits` table (matching cache)
CREATE TABLE IF NOT EXISTS user_traits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    traits_json JSONB NOT NULL,
    absolute_score SMALLINT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for user_traits
ALTER TABLE user_traits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own traits" ON user_traits FOR SELECT USING (auth.uid() = user_id);
-- Admins can view all (assuming is_admin exists in profiles)
CREATE POLICY "Admins can view all traits" ON user_traits FOR SELECT USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
-- Note: Inserts/Updates should be handled primarily through the service_role key on the server side API.
-- If we want users to insert via anon key (not recommended for truth), we'd add an INSERT policy.
-- For security, we let Next.js API do it.

-- 3. Create `pair_outcomes` table (feedback loop)
CREATE TABLE IF NOT EXISTS pair_outcomes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    peer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    interaction_score SMALLINT, -- 0 to 100
    feedback_json JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, peer_id)
);

-- Enable RLS for pair_outcomes
ALTER TABLE pair_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own outcomes" ON pair_outcomes FOR SELECT USING (auth.uid() = user_id OR auth.uid() = peer_id);
CREATE POLICY "Admins can view all outcomes" ON pair_outcomes FOR SELECT USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);
-- Again, writes via service_role API.

-- Add to Realtime (optional, depending on matching mechanics later)
-- alter publication supabase_realtime add table user_traits;
-- alter publication supabase_realtime add table pair_outcomes;
