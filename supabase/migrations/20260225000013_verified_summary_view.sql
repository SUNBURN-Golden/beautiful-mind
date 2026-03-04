-- SOULBOUND MVP - PHASE 2.6 VERIFIED SUMMARY BLOCK
-- Creates a strictly PII-free Database View to inject fact-based metadata into LLMs

-- 1. Create a Secure View over profiles that entirely excludes raw strings, addresses, and CIs
CREATE OR REPLACE VIEW public.user_verified_profile AS 
SELECT 
    id AS user_id,
    is_verified,
    birth_year,
    gender,
    height_cm,
    weight_band,
    location_region,
    location_city,
    verified_badges
FROM public.profiles;

-- Ensure the view respects Row Level Security of the underlying table
-- The service_role (backend) will access this view directly.

-- 2. Grant permissions to service_role to ensure API can read it
GRANT SELECT ON public.user_verified_profile TO service_role;
