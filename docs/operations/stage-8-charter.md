# Stage 8 Charter — Conformance & Polish

## Status

- Project Stage 8/8
- Phase 8.0/6 — Charter / Scope Lock (this file)
- Entry condition: Stage 7 closed with Layer 2 and Layer 3 canon documents in place
- Layer 1 note: `docs/product/north-star.md` is referenced by ARCHITECTURE.md but does not yet exist; Phase 8.1 must record this as an explicit gap rather than assume a complete four-layer canon baseline

## Purpose

Stage 8 is the final project stage. Its job is to measure the gap between canon and code, triage that gap, execute only what is approved, and close the project with a clean backlog.

Stage 8 is not a feature stage. It does not introduce new surfaces, new governance behavior, new economic mechanics, or new product routes.

## Authority documents

- `docs/architecture/ARCHITECTURE.md` — four-layer structure
- `docs/ledger/LEDGER_CANON.md` — Layer 3 canonical specification
- `docs/governance/GOVERNANCE_CANON.md` — Layer 2 canonical specification
- `docs/operations/operating-principles.md` — operational conduct
- `docs/design/tone.md` — Layer 4 design authority
- `docs/operations/stage-7-surface-reentry-decision.md` — surface re-entry decision record

## Phase structure

| Phase | Name | Purpose |
| --- | --- | --- |
| 8.0 | Charter / Scope Lock | This file |
| 8.1 | Canon-Code Conformance Audit | Review-only: extract every MUST from canon docs, check whether current code satisfies it |
| 8.2 | Gap Triage Decision | Human decision: classify each gap as fix-now, document-only, defer, unsafe-without-migration, or requires-product-decision |
| 8.3 | Narrow Polish / Hygiene | Execute only 8.2-approved work: wording alignment, liquid-* cleanup, docs correction |
| 8.4 | Production-Readiness / Docs Hygiene | Stale doc cleanup (db_schema_overview.md), test baseline review, release checklist |
| 8.5 | Final Closeout | Stage 1-8 closeout, next-cycle backlog |

## Phase 8.1 — Canon-Code Conformance Audit

Scope: review-only. No file modifications.

Method:
1. Extract every MUST and SHOULD statement from canon and operational authority documents: LEDGER_CANON.md, GOVERNANCE_CANON.md, ARCHITECTURE.md, operating-principles.md, and stage-7-surface-reentry-decision.md
2. For each statement, verify whether current repo code and operational state satisfies it
3. Record result as SATISFIED, PARTIAL, NOT SATISFIED, or NOT VERIFIABLE
4. Include file path and line evidence for every judgment
5. Explicitly record any authority document that is referenced but does not yet exist (e.g. docs/product/north-star.md)

Known candidates from prior phases (not exhaustive):
- Independent unfreeze RPC absent (GOVERNANCE_CANON known gap)
- Appeal overturn to auto-reversal not implemented (GOVERNANCE_CANON known gap)
- RESPONDED transition path not confirmed (GOVERNANCE_CANON known gap)
- UNDER_REVIEW coverage uneven (GOVERNANCE_CANON known gap)
- trust_ledger_events service_role GRANT ALL not yet narrowed (LEDGER_CANON observation)
- docs/db_schema_overview.md stale relative to Layer 3 reality (LEDGER_CANON observation)

Division of labor:
- Review-only conformance audit is performed first
- Gap triage document and approved corrections follow separately

## Phase 8.2 — Gap Triage Decision

Scope: decision document only. No implementation.

For each gap found in 8.1, classify as one of:
- **fix-now** — safe to close in Stage 8 without behavior change or migration risk
- **document-only** — record the gap explicitly but do not implement
- **defer** — defer to next development cycle
- **unsafe-without-migration** — requires migration plan before any change
- **requires-product-decision** — requires human product decision before any work

Output: single triage document with explicit classification and rationale for each gap.

## Phase 8.3 — Narrow Polish / Hygiene

Scope: execute only items classified as fix-now in Phase 8.2.

Candidates from Stage 7 deferred list:
- Narrow manual trust/access/evidence wording alignment
- Legacy liquid-* hygiene cleanup
- Docs wording corrections

All work must stay within fix-now boundary. No scope expansion.

## Phase 8.4 — Production-Readiness / Docs Hygiene

Scope:
- docs/db_schema_overview.md stale resolution (if classified as fix-now in 8.2)
- Test baseline review
- Release checklist verification

## Phase 8.5 — Final Closeout

Scope:
- Stage 1-8 summary closeout document
- Next-cycle backlog: all items classified as defer or requires-product-decision in 8.2
- Project completion record

## Prohibited work in Stage 8

- Profile live route creation
- Introduction live promotion
- Circles live route creation
- New trust-explanation route creation
- Landing or dashboard broad redesign
- Production DB permission changes without explicit migration plan
- Governance enforcement behavior changes without explicit human authorization
- Production-targeted destructive or speculative work
- Forcing implementation to match canon when the gap requires product decision
- Opening any surface that Stage 7 Phase 7.3 did not authorize

## Operating rules

- Stage 7 operating principles remain in force
- Layer discipline from operating-principles.md §8 applies
- Canon documents are reference authorities, not implementation orders
- Discovery of a gap does not authorize fixing it; Phase 8.2 triage is required first
- Worktree must be clean between phases
