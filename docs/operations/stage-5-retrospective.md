# Stage 5 Retrospective

## Scope
This file records lessons learned during Stage 5, including Phases 5.1 through 5.6 and the 5.4a hygiene pass. It exists to inform the operating principles in `docs/operations/operating-principles.md` and to help Stage 6 and later phases avoid repeating the same issues. It is historical context and is not authoritative for any ongoing work.

## What Stage 5 accomplished
Stage 5 strengthened the social-bound UI system by locking domain vocabulary, motion primitives, and tone before redesigning landing and dashboard on top of those locks. The authoritative outputs included the Antiquarian tone lock, the `sb-space-stage-antiquarian` / `sb-space-warm` / `sb-space-document` space rules, and the corresponding dashboard rewrite that removed generic SaaS grammar. It also established a clearer separation between documentary stage space, warm access space, and document space for subsequent work.

## Lessons
1. `liquid-*` 혼입. Phase 5.1 required a corrective pass because legacy `liquid-*` classes leaked into new domain components. The durable fix was to narrow the vocabulary layer strictly to `sb-*` and `sb-vocab-*`, rather than allowing legacy stylistic aliases to persist beside the new system.

2. tone hex without browser verification. Phase 5.3 locked the Antiquarian hex values at the code level without pairing that lock with a live browser verification step. Later phases should not repeat that pattern for tone-dependent work, because rendered depth, serif fallback, and Korean Myeongjo behavior cannot be established from source alone.

3. direction-note absence discovered late. The absence of `docs/design/direction-note.md` was discovered only during Phase 5.3 execution and was backfilled in Phase 5.4a. Operational scaffolding should be confirmed at the start of a phase rather than discovered at closeout, because missing upstream documents distort otherwise narrow implementation work.

4. dirty worktree pollution. Repeated raw `git diff` outputs were polluted by unrelated pre-existing worktree changes, which forced audits to rely on path-scoped diffs instead of global outputs. Principles 1, 2, and 4 in `docs/operations/operating-principles.md` formalize that lesson so future phase review remains readable even when the repo state is imperfect.

5. `onboarding-real.spec.ts` TS baseline. The TypeScript failures in `apps/web/tests/e2e/onboarding-real.spec.ts` persisted across all Stage 5 phases and were treated as a known baseline rather than something to repair opportunistically inside each design pass. Principle 5 in `docs/operations/operating-principles.md` records that separation so later phases report the baseline cleanly instead of obscuring new regressions.

## Downstream references
Stage 6 and later phases follow `docs/operations/operating-principles.md`. `docs/design/tone.md` remains the authoritative design document. `docs/design/direction-note.md` remains a historical memo only.
