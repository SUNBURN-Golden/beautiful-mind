# ONBOARDING Deprecation Checklist

## Scope
- Legacy compatibility only, no primary product traffic:
  - `/onboarding`
  - `/onboarding/help`
  - `/onboarding/verify`
  - `/onboarding/qualification`
  - `/onboarding/consent`
  - `/onboarding/sign`
  - `/interview`
  - `/contract`
  - `/consent`
  - `/osint`
  - `/admin-verify`

## Current Behavior (Expected)
- All legacy entries are redirected to the admission-first canonical path:
  - non-active user -> `/apply/status`
  - active user -> `/dashboard`
- Source of truth:
  - `apps/web/lib/legacy-routes.ts`
  - `apps/web/utils/supabase/middleware.ts`
  - `apps/web/tests/e2e/onboarding-flow.spec.ts`

## Deletion Gate (must be green before physical removal)
1. Vercel production logs show near-zero hits on legacy routes for 7 consecutive days.
2. E2E `legacy routes are fully redirected` stays green.
3. No external docs or links point to `/onboarding/*`.
4. CS/support runbook updated to `/apply/*` only.

## Safe Removal Order
1. Remove legacy links from docs/runbooks.
2. Keep middleware redirects for one release as fallback.
3. Delete route files under:
   - `apps/web/app/(guarded)/onboarding/**`
   - `apps/web/app/contract/page.tsx`
   - `apps/web/app/consent/page.tsx`
   - `apps/web/app/osint/page.tsx`
   - `apps/web/app/(guarded)/interview/page.tsx`
4. Keep `LEGACY_REDIRECT_PREFIXES` in middleware one more release, then remove.

