# Unit Test Execution (apps/web)

Use one command only:

```bash
pnpm --filter web test:unit
```

Repository-level gate order is:
1) `pnpm install --frozen-lockfile`
2) `pnpm --filter web test:unit`
3) `pnpm --filter web build`

This delegates to `scripts/run-unit-tests.mjs`, which is the canonical unit-test runner for this package.

Why this runner exists:
- keeps deterministic file ordering (`tests/unit/*.test.mjs`, sorted)
- runs Node test with explicit TypeScript support (`--experimental-strip-types`)
- avoids noisy typeless-module warnings for this package

Conventions:
- unit tests stay in `tests/unit/*.test.mjs`
- tests may import TypeScript source modules directly (for example `../../lib/foo.ts`)
- execute tests from the package command above rather than ad-hoc `node --test` invocations
