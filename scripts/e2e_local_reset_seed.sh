#!/bin/bash
# ==============================================================================
# e2e_local_reset_seed.sh
# E2E Test Provisioning Script for Local Development
# Resets the DB, prepares ZK schemas, and seeds initial users for E2E tests.
# ==============================================================================

# Ensure execution in project root
cd "$(dirname "$0")/../" || exit

echo "[1/3] Resetting Supabase Database..."
npx supabase db reset --local

echo "[2/3] Seeding E2E Test Users via Auth API & Service Role Bypass..."
# 1. Create a user via Auth to trigger `on_auth_user_created` (profiles trigger)
# We will use direct SQL to insert into auth.users as an admin bypass for seeding.
SEED_SQL=$(cat <<EOF
-- Clean up existing specifically
DELETE FROM auth.users WHERE email = 'e2e@example.com';

-- Insert E2E test user
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, 
    recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) 
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    '00000000-e2e0-4000-8000-000000000000', 
    'authenticated', 
    'authenticated', 
    'e2e@example.com', 
    crypt('password123', gen_salt('bf')), 
    now(), now(), now(), 
    '{"provider": "email", "providers": ["email"]}', 
    '{}', 
    now(), now(), '', '', '', ''
);

-- Note: The trigger public.handle_new_user() will automatically insert a row 
-- into the public.profiles table setting verified=false, banned=false.
EOF
)

# Apply Seed script
npx supabase db execute "$SEED_SQL" --local

echo "[3/3] Toggling ZK Registery to accept events..."
# Ensure registry allows onboarding events so ETL / receipts don't fail mid-test
ZK_REGISTRY_SQL=$(cat <<EOF
INSERT INTO public.zk_event_registry (event_type, description, is_active)
VALUES 
('KYC_VERIFICATION_COMPLETE', 'KYC Success event', true),
('ONBOARDING_CONSENT_GRANTED', 'Consent recorded', true),
('CONTRACT_SIGNATURE_CAPTURED', 'Signature stored', true),
('INTERVIEW_DECISION_FINALIZED', 'Interview done', true)
ON CONFLICT (event_type) DO UPDATE SET is_active = EXCLUDED.is_active;
EOF
)

npx supabase db execute "$ZK_REGISTRY_SQL" --local

echo "====================================================="
echo "✅ Local Environment Reset & Seed completed."
echo "Login: e2e@example.com / password123"
echo "Run E2E tests: npx playwright test tests/e2e/onboarding-real.spec.ts"
echo "====================================================="
