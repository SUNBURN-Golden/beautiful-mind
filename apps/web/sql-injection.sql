-- 1. Get the admin user
DO $$
DECLARE
    v_user_id UUID;
    v_interview_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    -- 2. Force the PII-Free Profile data bypassing RLS
    UPDATE public.profiles SET 
        is_verified = true,
        gender = 'MALE',
        birth_year = 1990,
        height_cm = 180,
        weight_band = 'ATHLETIC',
        location_region = 'Seoul',
        location_city = 'Gangnam',
        verified_badges = '["PHYSICAL_VERIFIED", "RESIDENCE_VERIFIED"]'::jsonb,
        tiers = '{"income_tier": "A", "asset_tier": "B"}'::jsonb,
        qualification_passed = true
    WHERE id = v_user_id;

    -- 3. Force consent
    INSERT INTO public.consents (user_id, deep_profiling, tos, privacy, osint) 
    VALUES (v_user_id, true, true, true, true)
    ON CONFLICT (user_id) DO UPDATE SET deep_profiling = true;

    -- 4. Create an interview
    INSERT INTO public.interviews (user_id, status, transcript_json)
    VALUES (
        v_user_id, 
        'IN_PROGRESS', 
        '[{"question": "Hi", "answer": "I am an athletic male.", "created_at": "2026-02-25T00:00:00Z"}, {"question": "Tell me a lie.", "answer": null, "created_at": "2026-02-25T00:00:01Z"}]'::jsonb
    ) RETURNING id INTO v_interview_id;

    RAISE NOTICE 'TARGET USER: %', v_user_id;
    RAISE NOTICE 'TARGET INTERVIEW: %', v_interview_id;
END $$;
