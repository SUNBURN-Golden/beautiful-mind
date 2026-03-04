-- 5. Realtime Match & Chat Schema

-- 5.1 Matches Table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, HIDDEN, UNMATCHED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- 5.2 Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5.3 Match Reviews Table (Feedback Loop)
CREATE TABLE match_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    feedback_text TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, reviewer_id)
);

-- 6. Audit Triggers for New Tables
CREATE TRIGGER audit_matches_trigger
AFTER INSERT OR UPDATE OR DELETE ON matches
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_messages_trigger
AFTER INSERT OR UPDATE OR DELETE ON messages
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

CREATE TRIGGER audit_match_reviews_trigger
AFTER INSERT OR UPDATE OR DELETE ON match_reviews
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

-- 7. RLS Policies

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_reviews ENABLE ROW LEVEL SECURITY;

-- [matches] Users can only view or update matches they are part of
CREATE POLICY "Users can view own matches" ON matches 
FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own matches" ON matches 
FOR UPDATE USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Only backend functions/service role should create matches, but if client does:
CREATE POLICY "Service role or edge functions create matches" ON matches
FOR INSERT WITH CHECK (true); 

-- [messages] Users can only view or insert messages in their matches
CREATE POLICY "Users can view messages of their matches" ON messages 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM matches m 
        WHERE m.id = messages.match_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
);

CREATE POLICY "Users can insert messages to their matches" ON messages 
FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM matches m 
        WHERE m.id = messages.match_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
);

-- [match_reviews] Users can only review if they are part of the match
CREATE POLICY "Users can view reviews by or about them" ON match_reviews 
FOR SELECT USING (auth.uid() = reviewer_id OR auth.uid() = target_id);

CREATE POLICY "Users can insert reviews for their matches" ON match_reviews 
FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
        SELECT 1 FROM matches m 
        WHERE m.id = match_reviews.match_id AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    )
);

-- 8. Enable Realtime
-- To enable realtime for specific tables in Postgres:
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE match_reviews;
