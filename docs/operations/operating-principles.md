# SoulBound Operating Principles

## Scope
This file governs the operational conduct of all Stage 6 and subsequent phases.
It is subordinate to `docs/design/tone.md` and `docs/design/direction-note.md` for design matters.
For operational conduct, this file defines the standing rules of execution hygiene.
If a running phase prompt and this file appear to conflict on operational conduct, the work does not auto-resolve the conflict; it stops and requires renewed human authorization.
Conflicts in design are resolved by `docs/design/tone.md`.

## 1. Worktree Cleanliness 선결 원칙
Each phase begins by running `git status --short` to inspect the worktree state. If dirty changes unrelated to the current phase are present, the new phase is not started. Approved prior-phase artifacts must first be isolated by pathspec commit, by a separate branch, or by stash before the next phase is entered. This principle exists because Stage 5 repeatedly produced raw git outputs polluted by pre-existing worktree changes, which made scope auditing harder than it should have been.

## 2. Pathspec Truth 원칙
Approved phase artifacts are committed on a pathspec basis as soon as possible after approval. The raw global `git diff --name-only` output is not treated as trustworthy audit evidence. `git diff -- <confirmed paths>` is the primary truth for phase-scoped auditing, and the global diff serves only as supporting context.

## 3. 브라우저 눈검토 의무 원칙 (톤 의존 산출물)
When a phase produces changes whose correctness depends on rendered appearance, including tone tokens, palette, typography, spatial utilities, or any live surface that consumes them, the phase is not considered closed until the live route and its manual fixtures have been confirmed in a real browser. Hex values, font fallback chains, Korean Myeongjo rendering, and space depth cannot be verified at the code level. This principle exists because Stage 5 locked tone tokens and redesigned landing and dashboard surfaces without always pairing the approval with a browser sanity check.

## 4. Path-scoped Diff 우선 원칙
Audit review uses `git diff -- <confirmed paths>` as first-order evidence. Full `git diff` and `git status` remain available, but they serve only as secondary context for locating unrelated dirty state. This principle follows directly from Principle 1 and Principle 2, and it exists so that phase audits remain legible even when the worktree is polluted by unrelated work.

## 5. Known Baseline 분리 보고 원칙
The TypeScript errors in `apps/web/tests/e2e/onboarding-real.spec.ts` are treated as a known baseline as of Stage 5 closeout. Every phase's `tsc --noEmit` report must explicitly distinguish between errors already in the known baseline and any new regressions introduced by the current phase. The baseline itself is not modified inside a general phase. Baseline cleanup is a separate hygiene task scheduled outside normal design and implementation phases.

## 6. Semantic Hard Gate 원칙
When a phase is responsible for producing a judgment, such as compatibility, scope, or semantic fit, and the legitimacy of a subsequent phase depends on that judgment, the subsequent phase does not open automatically. If the judgment phase concludes with a hold, deferral, or incompatibility result, all downstream phases gated by that judgment are paused. Re-opening such a phase requires a new human decision and a new, explicitly re-authorized prompt. This principle exists to prevent cascading premature implementation in meaning-oriented stages such as Stage 6.

## 7. Amendment
This file may only be amended in a dedicated operational hygiene pass.
Amendments are not carried out inside design or implementation phases.
If a running phase prompt and this file conflict in interpretation, the work must stop and wait for human re-authorization rather than auto-resolving the conflict in favor of either document.

## 8. Layer Discipline 원칙
Every document and every code change is performed with explicit awareness of which of the four layers it belongs to (see `docs/architecture/ARCHITECTURE.md`).
Layer 4 documents do not embed Layer 3 vocabulary (token ledger, slashing, Merkle, L1, ZK).
Layer 3 documents do not embed Layer 4 vocabulary (tone, copy, vocabulary, motion).
Cross-layer references are always explicit and name the target layer and document.
Phase prompts state which layer they operate in.
