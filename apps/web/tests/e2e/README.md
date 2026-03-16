# E2E Execution Guide (`tests/e2e`)

## Default local run

```bash
pnpm --filter web test:e2e
```

- Runs auth-independent E2E scenarios.
- Excludes tests tagged with `@auth`.
- Does not require `apps/web/.e2e/creds.json`.
- This is the default runnable local E2E lane.

## Auth-required local run

```bash
pnpm --filter web test:e2e:auth
```

- Runs the canonical auth-required product-path lane.
- Includes `@auth` and `@auth-stateful` scenarios backed by isolated core/stateful users.
- Excludes specs tagged `@auth-simulated`, which are not part of the canonical auth verification lane.
- Requires isolated local credentials at:
  - `apps/web/.e2e/creds.auth.core.json`
  - `apps/web/.e2e/creds.auth.stateful.json`
- No single-worker override is required for this lane; isolated users are the repeatability mechanism.
- Required shape:

```json
{"email":"...","password":"..."}
```

If credentials are missing or invalid, auth setup fails fast with a short actionable error.

## Non-canonical auth-simulated route regression

```bash
ALLOW_TEST_API_ROUTES=true PLAYWRIGHT_REQUIRE_AUTH=1 pnpm --filter web exec playwright test tests/e2e/onboarding-flow.spec.ts
```

- Use this only when editing `onboarding-flow.spec.ts`.
- This spec is excluded from the canonical auth lane because it asserts mocked route/status behavior that does not define the current product-path verification truth.
