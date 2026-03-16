# SoulBound Web App (`apps/web`)

## Validation Gate

Run the validation gate from the repository root:

```bash
pnpm install --frozen-lockfile
pnpm validate:web:scope
```

This repository uses pnpm workspaces as the canonical path for install and validation.
The `validate:web:scope` command runs unit tests and the production build.

## Local Development

From repository root:

```bash
pnpm --filter web dev
```

Or from `apps/web`:

```bash
pnpm dev
```

## Local E2E Behavior

Default local E2E run (no local auth credentials required):

```bash
pnpm --filter web test:e2e
```

This default run excludes auth-required scenarios tagged with `@auth`.
It is the default runnable local E2E lane.

For the canonical auth-required local E2E lane, provide isolated auth-lane credentials:

- `apps/web/.e2e/creds.auth.core.json`
- `apps/web/.e2e/creds.auth.stateful.json`

Each file must contain:

```json
{"email":"...","password":"..."}
```

Then run:

```bash
pnpm --filter web test:e2e:auth
```

This auth lane:

- runs product-path auth scenarios only
- uses isolated core/stateful users rather than `--workers 1`
- excludes `@auth-simulated` specs from the canonical lane

`onboarding-flow.spec.ts` remains available as a direct, non-canonical route-regression spec when you need to edit that scenario specifically:

```bash
ALLOW_TEST_API_ROUTES=true PLAYWRIGHT_REQUIRE_AUTH=1 pnpm --filter web exec playwright test tests/e2e/onboarding-flow.spec.ts
```
