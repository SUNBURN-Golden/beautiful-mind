# SoulBound Governance Canon

## Scope

This file is the canonical Layer 2 statement for SoulBound's governance and due-process substrate. It defines the authority boundaries, reversible enforcement posture, review queues, promotion gates, and authorization boundaries that must govern adverse and restorative action. Observed repo facts are recorded separately in `## Current implementation status` and do not override the canon.

## Layer placement and authorities

This document is a Layer 2 authority. Its structural placement is defined by `docs/architecture/ARCHITECTURE.md`, and the operational rules for how work on this layer is performed remain in `docs/operations/operating-principles.md`. Layer 3 is referenced, not restated, through `docs/ledger/LEDGER_CANON.md`.

Layer 2 owns governance posture: who may initiate review, who may adjudicate, what state transitions must be explicit, where human authorization is required, how reversible enforcement is preserved, and how shadow evaluation and promotion gates operate. It does not own economic mechanics or surface language.

## Non-goals

- This document does not restate Layer 3 ledger or economic mechanics already governed by `docs/ledger/LEDGER_CANON.md`.
- This document does not define product wording, route copy, or any Layer 4 presentation behavior.
- This document does not promise implementation completeness beyond the governance boundary that should exist.
- This document does not clean up stale documents in place during this pass.
- This document does not turn route presence, RPC names, or admin workflows into a product plan or an operations playbook.

## Canonical Layer 2 invariants

- Irreversible punishment MUST NOT arise from ambient product activity alone. Slash, penalty, revocation, or equivalent adverse effect requires an explicit governance state boundary and explicit authorization.
- Governance state transitions MUST be explicit, auditable, and attributable. Hidden or implicit transition rules are not acceptable governance.
- A reversible enforcement posture MUST exist. Protective freeze may be used as an interim governance measure, but restoration and reversal pathways must remain first-class governance concerns even when current implementation is partial.
- Queues and gates MUST be explicit. Audit intake, challenge intake, appeal handling, exception handling, review queues, and promotion gates may not be collapsed into informal side effects.
- Shadow-before-promotion discipline MUST be explicit. Governance-affecting policy change must pass through reviewable shadow evaluation before rollout or promotion.
- The human authorization boundary MUST be explicit. Automation may assist, propose, or execute pre-authorized actions, but automation boundary is not authority by itself.
- Governance MUST consume Layer 3 effects by interface. It may authorize or finalize economic consequence, but it must not restate or replace Layer 3 ledger canon.

## Due-process state objects

`audits` hold formal review of trust-bearing claims. They define when governance review is open, frozen, under review, or resolved.

`challenges` hold peer-triggered contestation. They are not merely evidence attachments; they are initiation objects with their own state and linkage to formal audit.

`enforcement_actions` hold governance action intent and due-process posture. They are the state objects that distinguish notification, response, finalization, and execution.

`appeals` hold user-initiated contestation of prior admission decisions. They represent a governance queue, not a direct restoration guarantee by themselves.

`exception_cases` hold cold-path review when automated hot-path decisioning is not sufficient for direct resolution.

`audit_samples` hold post-decision quality review samples. They are governance review objects used to evaluate whether a completed decision path should be trusted or escalated.

`review_cases` and `review_case_events` hold structured human-review work and its event trail. They provide queue state and append-only review evidence for manual adjudication.

`policy_change_proposals` and `policy_shadow_runs` hold governance-side policy experimentation and promotion evidence. They are governance control objects, not product-surface configuration.

## Audit and challenge initiation boundaries

Random audit initiation MUST occur through an explicit governance authority boundary. A random audit is legitimate only when an accountable governance actor or pre-authorized automation boundary opens it.

Challenge-based audit initiation MUST require a non-self challenger and an explicit evidence reference. Governance must not accept self-challenge as valid initiation.

Duplicate or overlapping review MUST be blocked at initiation. Governance may not silently open parallel live audits for the same claim when an open review state already exists.

Protective freeze at open is governance-compatible only when it remains explicitly attributable, reversible in posture, and linked to an open review object. Freeze-at-open is not itself final punishment.

## Enforcement action lifecycle

The governance action classes are `FREEZE`, `PENALTY`, `SLASH`, and `REVOKE_SBT`. These action classes are not interchangeable: freeze is protective, while penalty, slash, and revocation are adverse actions that require stronger adjudicative clarity.

The due process vocabulary is `NOTIFIED`, `RESPONDED`, `FINALIZED`, and `EXECUTED`. Governance canon requires those states to mean different things: notification is not finalization, and finalization is not execution.

Authorization and execution are distinct. Governance may finalize an adverse action before any Layer 3 economic effect is executed. Economic consequence must then be consumed through the Layer 3 interface defined in `docs/ledger/LEDGER_CANON.md`, rather than being re-specified here.

Service execution must not be mistaken for governance legitimacy. A service-role-backed function may execute a finalized action, but the authorization for that action must already exist in governance state.

## Appeal, exception, and restoration paths

Appeal is a governance queue for contesting prior decision. It MUST be explicit, attributable, and separately reviewable from the original decision path.

Exception handling is a governance queue for cases that cannot responsibly remain on the hot path. It MUST preserve human review posture rather than pretending that ambiguous cases are already settled.

Restoration and reversal are core governance concerns. A governance system that can freeze, penalize, slash, or revoke MUST also preserve a path for restoration when the adverse posture is later found to be incorrect or unsupported.

This canon therefore requires a reversible governance posture even where implementation is incomplete. Protective freeze should be restorable, and overturned decisions should have a clearly defined governance consequence, even if the current repo does not yet provide a complete automatic restoration path.

## Shadow evaluation and promotion gate

`policy_shadow_runs` exists to compare production outcomes with proposed policy outcomes before promotion. Shadow evaluation is a governance control, not a surface behavior.

`policy_change_proposals` exists to formalize change before rollout. Governance promotion gate means that a proposal must not move from observation to rollout without explicit reviewable posture.

`feature_flags` and staged rollout posture are governance-side controls when they affect trust, review, or admission outcome. Their use must remain subordinate to explicit authorization, recorded review, and shadow evidence.

Automation boundary matters here. Automation may refresh metrics, generate proposals, or execute pre-authorized rollout steps, but automation must not replace approval, adjudication, or promotion gate authority.

## Authorization and mutation boundary

Read access and action authority are not the same. A subject may read certain governance-relevant objects that concern them, but that does not grant initiation, adjudication, or execution authority.

User authority is narrow and explicit. In current governance shape, user-side initiation exists for challenge and appeal entry points, but adjudication remains separate from that initiation.

Admin or explicitly pre-authorized service authority governs random audit initiation, formal decision, and execution entry points. Human authorization is required at the points where governance changes a subject's standing or authorizes adverse consequence.

Service-role execution exists as a mutation boundary, not as a source of legitimacy. Route existence is not canonical authority; governance legitimacy comes from the state boundary and authorization model behind the route.

## Current implementation status

This section records observed repo reality. These facts support interpretation of the canon but do not replace it.

- `docs/governance/GOVERNANCE_CANON.md` previously existed with useful due-process vocabulary, freeze-at-open awareness, appeal and policy queue coverage, and a separated implementation-status intent. Those strengths are preserved here while the file is corrected into Layer 2 structure.
- `open_random_audit_and_freeze`, `open_challenge_audit_and_freeze`, `decide_audit_atomic`, and `execute_enforcement_action` are present as transaction-heavy governance RPCs. Random audit opening is currently admin-or-cron gated, while challenge opening is currently authenticated-user initiated with non-self challenge validation.
- The current open RPCs create audits directly in `FROZEN`, freeze the relevant claim/profile, and insert a `FREEZE` enforcement action in `NOTIFIED`. That is an implementation fact, not the only imaginable canonical initiation form.
- `decide_audit_atomic` currently finalizes freeze actions from `NOTIFIED` or `RESPONDED`, resolves audits to pass or fail, unfreezes on pass, and queues slash and revoke actions on fail. This demonstrates separation between adjudication and later execution.
- `execute_enforcement_action` currently executes only after `FINALIZED`, and its economic consequences are delegated through Layer 3 interfaces rather than inlined in routes.
- `appeals` exist with single-open-per-application protection, and current appeal-opening flow also opens or reuses a `review_cases` queue, appends a `review_case_events` entry, and writes a trust-ledger event. This is implementation evidence for appeal intake, not proof of a fully implemented restoration path.
- `review_cases` and `review_case_events` exist as service-role-managed no-client-access review queues. `exception_cases`, `audit_samples`, `policy_change_proposals`, and `policy_shadow_runs` also exist and are similarly governance-side queue or gate objects.
- Current authorization is asymmetric. Some tables are own-readable or own/admin-readable for authenticated users, while review, exception, sample, and policy-shadow objects remain service-role/admin-side only.
- Reversibility is only partially explicit in current implementation. No independent unfreeze RPC was confirmed. Unfreeze appears tied to audit pass. Appeal overturn to automatic reversal or automatic unfreeze is not clearly implemented.
- The `RESPONDED` due-process state exists in schema and is consumed by `decide_audit_atomic`, but an explicit subject-response path was not confirmed in this pass.
- `UNDER_REVIEW` exists across audit, appeal, exception, sample, and review-case vocabularies, but the transition coverage is uneven. Some objects clearly enter `UNDER_REVIEW`, while others expose the state without a fully explicit route or RPC transition confirmed here.
- Policy shadow and proposal flows exist in repo routes and tables, including admin proposal generation and decision routes, but they should still be understood as current governance machinery rather than automatic proof that every promotion safeguard is complete.

## Out-of-scope references

- Layer 3 ledger and economic mechanics, which remain governed by `docs/ledger/LEDGER_CANON.md`.
- Stage 7.0a browser review and other surface-facing review tracks.
- Layer 4 surface implications, copy implications, or user-interface implications.
- Future execution improvements, including any fuller restoration automation not yet canonized.
- Broader economics policy tuning and other parameter-setting work that is adjacent to governance but not defined here.
