-- Patch immutable trigger to allow service_role (E2E cleanup) to delete identity claims
-- We check for both current_user and the JWT role claim for maximum compatibility (PostgREST vs Direct)

CREATE OR REPLACE FUNCTION public.block_identity_claims_mutation()
RETURNS TRIGGER AS $$
DECLARE
    r text;
BEGIN
    -- For UPDATE, we always block as per No-Trust policy
    IF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Updates on identity_claims are strictly forbidden by systemic No-Trust policy.';
    END IF;

    -- For DELETE, we allow it ONLY for service_role to permit E2E cleanup scripts
    -- We try to get the JWT claim first (PostgREST case)
    BEGIN
        r := current_setting('request.jwt.claim.role', true);
    EXCEPTION WHEN OTHERS THEN
        r := NULL;
    END;

    -- If either the session role or the current database user is 'service_role', allow the delete
    IF TG_OP = 'DELETE' AND (r = 'service_role' OR current_user = 'service_role' OR current_user = 'supabase_admin') THEN
        RETURN OLD;
    END IF;

    RAISE EXCEPTION 'Deletions on identity_claims are strictly forbidden for non-admin roles.';
END;
$$ LANGUAGE plpgsql;
