# SoulBound Autoresearch V1 Policy (Hybrid-Match Only)

## Scope
This policy applies only to the hybrid-match optimization island:
- `apps/web/scripts/lib/hybrid-match/scoring.mjs`
- `apps/web/scripts/lib/hybrid-match/self-development.mjs`
- `apps/web/scripts/lib/hybrid-match/evidence.mjs` (optional edits)

No other product areas are in-scope.

## Safety Boundary
- Primary evaluation must be local-offline only.
- No Supabase writes in evaluation path.
- DB target is `N/A` for the primary loop (offline-only).
- If any future DB bootstrap is added, it must live outside this loop and explicitly verify `cjmn` target.
- `fcqs` is excluded.

## Immutable Surface (Do Not Edit in Autoresearch Loop)
- `apps/web/scripts/run-hybrid-match.mjs`
- `apps/web/scripts/train-hybrid-ranker.mjs`
- `apps/web/scripts/eval-hybrid-match-offline.mjs`
- `apps/web/autoresearch/fixtures/hybrid-match-offline-v1.json`
- unit tests and package scripts

Runtime enforcement:
- baseline captures SHA-256 for canonical eval harness + canonical fixture
- candidate run is blocked if either hash changes

## Primary Metric
Single score used for keep/discard:
- `offline_hybrid_score`

This score is computed by the fixed offline harness and combines:
- rank quality on frozen pair cases
- evidence grounding pass-rate
- self-development exploration behavior pass-rate

Weighted score is used because the optimization island spans 3 coupled modules.

## Keep/Discard Rule
Given baseline `B` and candidate `C`:
- keep if `C - B >= 0.005`
- otherwise discard and restore baseline snapshot

## V1.5 OpenAI Proposer Mode
- OpenAI API is proposal-only and never a judge.
- Keep/discard remains local and machine-measured by the immutable offline harness.
- Candidate patching is restricted to the hybrid-match optimization island.
- If proposal generation, patch application, or evaluation fails, the run is logged and stops safely.
- Required manual environment variable for proposer mode:
  - `OPENAI_API_KEY`

## Logging
All loop results are appended to:
- `apps/web/autoresearch/results.jsonl`

Each entry must include:
- timestamp, git commit, branch
- optimization island
- baseline metric, candidate metric, delta
- decision, short note
- run status, environment target, safety verified

## Canonical Commands
From repo root:

```bash
node apps/web/scripts/eval-hybrid-match-offline.mjs --pretty
node apps/web/scripts/run-autoresearch-hybrid-match.mjs baseline --note "baseline snapshot"
node apps/web/scripts/run-autoresearch-hybrid-match.mjs baseline --force-rebaseline --note "intentional rebaseline"
node apps/web/scripts/run-autoresearch-hybrid-match.mjs candidate --note "candidate tweak"
node apps/web/scripts/run-autoresearch-hybrid-match.mjs propose-candidate --model gpt-5-mini --note "openai proposal run"
node apps/web/scripts/run-autoresearch-hybrid-match.mjs reset --note "manual rollback"
```

Unsafe debug-only fixture override (outside normal loop):

```bash
node apps/web/scripts/eval-hybrid-match-offline.mjs --fixture /tmp/debug-fixture.json --allow-unsafe-fixture --pretty
```

## Baseline Snapshot Manifest
Equivalent clean baseline is defined by:
- git HEAD + branch
- current island file hashes at baseline capture time
- frozen fixture version `hybrid-match-offline-v1`

This allows safe local iteration even when unrelated repo areas are dirty.
