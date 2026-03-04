-- 1. Add is_admin and banned columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned BOOLEAN DEFAULT false;

-- 2. Create the specific admin user
-- NOTE: We are doing an UPDATE here. If the user doesn't exist, they need to sign up first.
UPDATE profiles SET is_admin = true WHERE email = 'justice.parkit@gmail.com';

-- 3. RLS Policies for Admins
-- Add a policy to profiles so admins can read all profiles
CREATE POLICY "Admins can view all profiles" ON profiles 
FOR SELECT USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

CREATE POLICY "Admins can update all profiles" ON profiles 
FOR UPDATE USING (
    (SELECT is_admin FROM profiles WHERE id = auth.uid()) = true
);

-- Note: We assume the same pattern for other tables if necessary.
-- Admins should be able to view consents, contracts, interviews, matches, messages, match_reviews, etc.
CREATE POLICY "Admins can view all consents" ON consents FOR SELECT USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can view all contracts" ON contracts FOR SELECT USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can view all interviews" ON interviews FOR SELECT USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can view all matches" ON matches FOR SELECT USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can view all messages" ON messages FOR SELECT USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can view all match_reviews" ON match_reviews FOR SELECT USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);
CREATE POLICY "Admins can view all audit_logs" ON audit_logs FOR SELECT USING ((SELECT is_admin FROM profiles WHERE id = auth.uid()) = true);

-- Add an RPC to easily get admin status securely on the client via Supabase API (optional, but helpful)
-- Or we just query profiles filtering by id if auth.uid() == id

-- Ensure audit_logs is readable by admin
-- In the previous schema, audit_logs was insert-only for trigger. Let's make sure admins can read it.
-- Added the view policy above.
