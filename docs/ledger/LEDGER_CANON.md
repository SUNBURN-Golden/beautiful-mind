# SoulBound Ledger Canon

## Scope

This file is the canonical Layer 3 statement for SoulBound's ledger and economic-security substrate. It defines what Layer 3 must guarantee, how its source-of-truth objects are separated, and which boundaries protect that substrate from cross-layer drift. Observed repo facts are recorded separately in `## Current implementation status` and do not override the canon.

## Layer placement and authorities

This document is a Layer 3 authority. Its structural placement is defined by `docs/architecture/ARCHITECTURE.md`, and the operational rules that govern work on this layer remain in `docs/operations/operating-principles.md`. `docs/design/tone.md` is a Layer 4 design authority only and is not authoritative for Layer 3 content.

Layer 3 sits between product framing and governance judgment on one side, and user-facing surface representation on the other. It owns the append-only economic ledger, trust-event integrity boundary, deterministic evidence-receipt boundary, anchor-ready aggregation objects, and collateral/slashing interface posture. It does not own governance procedure, product messaging, or surface language.

## Non-goals

- This document does not specify governance procedure, adjudication flow, appeal handling, or other Layer 2 process logic.
- This document does not define user-facing product wording, surface copy, or any Layer 4 presentation rules.
- This document does not commit SoulBound to a specific chain integration, anchoring network, or live proving pipeline.
- This document does not clean up stale documents in place, including `docs/db_schema_overview.md`.
- This document does not change runtime behavior, database schema, or migration history.

## Canonical Layer 3 invariants

- Layer 3 source-of-truth history MUST be append-only. Correction is performed by compensating records, not by mutating prior economic or trust-event rows.
- Layer 3 objects MUST be separated by role. Economic movement, trust-event chaining, deterministic evidence capture, and proof-side projection are distinct responsibilities and must not be collapsed into one generic ledger.
- Source-of-truth tables MUST be written through explicit server-side boundaries. Client writes are forbidden. Repair paths are not canonical append paths.
- `token_ledger` MUST remain the canonical economic ledger. `user_wallets` and related balance views are projections, not independent authorities.
- `event_receipts` MUST remain the deterministic evidence-receipt boundary. Receipt construction must be stable enough for recomputation and future anchoring.
- `trust_ledger_events` MUST preserve per-subject chain continuity through `previous_event_hash` and `event_hash`. Its integrity role is distinct from economic accounting and distinct from receipt capture.
- Proof-side objects MUST remain downstream of evidence capture. `zk_event_receipts` and related batch tables are readiness and projection objects, not the canonical receipt source.
- Collateral and slashing effects MUST be expressed through dedicated Layer 3 interfaces that update economic state coherently, while governance-side decision procedure remains outside this document.

## Core ledger objects

### `token_ledger`

`token_ledger` is the canonical economic ledger. Its authority comes from append-only rows that record signed value movement over time. Its first-class columns are `id`, `user_id`, `amount`, `type`, `related_id`, `idempotency_key`, `meta`, and `created_at`. It does not carry first-class `vault` or `event_hash` columns.

The `meta` field may carry routing or classification details for particular flows, including treasury or insurance routing, but those values are implementation metadata rather than native ledger columns. Any document that describes vault routing must keep that distinction explicit.

### `user_wallets`

`user_wallets` is a guarded projection of economic state. It exists for balance access and operational efficiency, but it does not replace `token_ledger` as the source of truth. Any reconciliation model must recompute from `token_ledger`, not the other way around.

### Economic support objects

`token_holds`, `treasury_wallet`, `treasury_vaults`, `treasury_budgets`, `economy_config`, and `soul_airdrop_claims` are Layer 3 economic support objects. They constrain, classify, or operationalize economic behavior, but they do not replace the append-only ledger as the authoritative record of movement.

### `event_receipts`

`event_receipts` is the canonical evidence-receipt layer. It records deterministic representations of auditable mutations through `source_table`, `source_id`, `action`, `occurred_at`, `event_type`, `canonical_json`, `canonical_text`, `receipt_hash_keccak`, `schema_version`, and `created_at`. Its job is deterministic evidence capture, not user-facing trust history and not economic accounting.

### `trust_ledger_events`

`trust_ledger_events` is the append-only trust-event chain. It carries `user_id`, optional application and credential context, a free-text `event_type`, structured `event_payload`, `previous_event_hash`, `event_hash`, and `created_at`. Its authority lies in chain continuity and tamper evidence, not in caller-level idempotency and not in Merkle-ready receipt capture.

### `zk_event_registry` and `zk_event_receipts`

`zk_event_registry` is the explicit proof-side allowlist that maps event categories to circuit intent. `zk_event_receipts` is a 1:1 proof-oriented projection from `event_receipts`, keyed by `source_receipt_id` and extended with `circuit_id`, `public_inputs`, `public_inputs_hash_keccak`, `commitment_scheme`, `commitment_hash`, `nullifier_hash`, `schema_version`, and timing fields. These are proof-boundary objects, not canonical receipt sources.

### Readiness-side anchoring objects

`merkle_anchors`, `anchor_submissions`, `zk_rollup_batches`, and `zk_rollup_submissions` are readiness-side anchoring objects. They exist to batch, anchor, or prepare evidence-derived material for future chain or proof workflows. They are downstream of the canonical economic and evidence boundaries.

### Economic and enforcement interface objects

`collateral_accounts`, `audits`, `challenges`, `enforcement_actions`, `sbt_claims`, `compensation_cases`, and `compensation_allocations` are Layer 3 interface objects. They connect economic consequences to governance-side decisions and exception handling, but they do not themselves define governance procedure. This document treats them as interface-bearing state, not as procedural canon.

## Canonical write-path rules

Canonical append behavior means that source-of-truth tables are written through named server-side boundaries with explicit responsibility. A repair utility, a report, or a projection refresh is not a canonical append path.

For economic writes, `append_soul_ledger_internal` is the hardened internal append boundary for internal token-ledger writes. It matters because it standardizes append semantics, projection syncing, and repair separation. It must not, however, be misdescribed as the only ledger-writing function in the repo. Specialized economic flows such as airdrop claim, treasury spend, collateral deposit, collateral refund, collateral slash, and fraud-slash handling may own their own dedicated server-side write boundaries.

For trust writes, `log_trust_ledger_event` is the preferred trust-event append boundary and the web runtime uses a dedicated wrapper for it. The canonical rule is boundary discipline, not a false claim that current SQL already forbids every alternative path.

Direct script RPC usage is an implementation fact, not canonical authority. Scripts may exercise an existing boundary, but they do not define that boundary's legitimacy.

## Idempotency and projection repair rules

Economic append paths that may be retried MUST expose stable idempotency input, typically through `idempotency_key`. Duplicate retry must resolve to the same logical write outcome rather than silently duplicating value movement.

Projection repair is a separate class of operation. `reconcile_user_wallet_balance` exists to repair or verify projection state and must not be treated as equivalent to economic append. A healthy Layer 3 design preserves this difference: append updates source-of-truth state, while reconcile repairs a derived view.

`trust_ledger_events` does not provide caller-level idempotency through `event_hash`. Because the current hash input includes `previous_event_hash` and `created_at`, replaying the same logical event later will usually produce a different hash. The present hash chain therefore provides tamper-evident uniqueness and continuity, not a general replay-deduplication contract.

## Hashing, receipt, and proof boundaries

The trust-event boundary is a hash chain. `set_trust_ledger_event_hash` links each event to the prior event for the same subject and computes `event_hash` from row content, prior hash, and timestamp material. That boundary is for continuity and tamper evidence.

The evidence-receipt boundary is deterministic capture. `event_receipts` stores canonical JSON, canonical text, and `receipt_hash_keccak` so that receipt material can be recomputed and batched without rewriting source history. This boundary is distinct from the trust-event hash chain even when both describe related product activity.

The anchor-ready boundary is the Merkle and batch layer built over evidence receipts. `merkle_anchors` and `anchor_submissions` are downstream of deterministic receipt capture and should remain so.

The proof boundary is the circuit-facing projection layer. `zk_event_receipts` and `zk_rollup_batches` MUST carry explicit public-input and commitment metadata. The current locked placeholder constant is `KECCAK_PLACEHOLDER_V0`, and any future cryptographic upgrade must appear as an explicit versioned change rather than an implicit replacement.

## Access model and mutation discipline

Layer 3 source-of-truth objects MUST deny client writes. This applies to economic ledgers, trust-event chains, evidence receipts, proof projections, and guarded projections.

Read-access symmetry does not have to be uniform. A user-scoped ledger or trust chain may expose own-read access while still denying client mutation. Evidence receipts and proof-side tables may remain service-only when their role is backend integrity rather than user presentation.

Append-only enforcement MUST be physical where appropriate. Mutation-block triggers on `token_ledger` and `trust_ledger_events` are part of the protection model, and projection-write guards on `user_wallets` are part of that same discipline.

Proof-side tables may legitimately be stricter than user-scoped chains. The canon requires explicit access posture, not accidental access inheritance.

## Event vocabulary model

Layer 3 currently operates with multiple vocabulary spaces, and the canon must keep them distinct.

- Economic transaction vocabulary lives on `token_ledger.type` and is governed by the transaction-type enum space.
- Trust-event vocabulary lives on `trust_ledger_events.event_type` and is currently free-text.
- Proof eligibility vocabulary lives in `zk_event_registry`, which acts as an explicit allowlist and mapping boundary.

The canonical requirement is not that all Layer 3 vocabularies collapse into one mechanism. The requirement is that each vocabulary space be explicit, stable enough for audit, and clearly separated by role. This pass does not invent a new database enum for trust events and does not rename runtime strings.

Adjacent application contracts may exist outside this canon. Shared status-reason contracts are preserved as adjacent runtime boundaries and are not redefined here.

## Collateral and slashing policy interface

Collateral and slashing belong to Layer 3 as interface posture, not as policy procedure. This document defines the economic invariants that such operations must respect, the write boundaries they must use, and the state objects they must update coherently.

Collateral interfaces MUST keep `collateral_accounts` aligned with the economic ledger effects produced by deposit, refund, and slash operations. Slashing and refund behavior MUST remain expressible as append-only economic consequences plus synchronized collateral-state change.

`audits`, `challenges`, `enforcement_actions`, and `sbt_claims` define the state boundary through which governance decisions reach Layer 3 consequences. This document does not define when a slash is justified, what procedure is required before execution, or what policy values should apply to collateral amounts.

## Current implementation status

This section records observed repo reality. These facts support interpretation of the canon but do not replace it.

- The current repo splits Layer 3 responsibilities across distinct objects: `token_ledger` for economic movement, `user_wallets` for balance projection, `event_receipts` for deterministic evidence capture, `trust_ledger_events` for append-only trust history, and `zk_event_receipts` for proof-side projection.
- `append_soul_ledger_internal` is the hardened internal token-ledger append path, and `reconcile_user_wallet_balance` is an operational repair path rather than a product append primitive.
- The current token-ledger write surface is broader than one function. Specialized server-side functions such as `claim_soul_airdrop`, `treasury_spend_with_budget`, `apply_collateral_deposit`, `apply_collateral_refund`, `apply_collateral_slash`, and `slash_fraud_docs` also append to `token_ledger` for their own scoped flows.
- The current trust-event runtime uses `writeTrustLedgerEvent` and `log_trust_ledger_event` as its preferred append boundary, but SQL still grants `ALL` on `trust_ledger_events` to `service_role`. The preferred boundary is therefore real in runtime practice but not yet fully narrowed at the table-grant level.
- `token_ledger` and `trust_ledger_events` currently expose own-read access to `authenticated` users while denying client writes. `event_receipts` is locked against client read and write. ZK-side tables are hardened to service-role-only access after the defuse and spec-lock migrations.
- `zk_event_receipts` remains a 1:1 projection from `event_receipts` gated by `zk_event_registry`. `zk_event_receipts` and `zk_rollup_batches` are currently locked to `KECCAK_PLACEHOLDER_V0`.
- The current event vocabulary is fragmented by design: free-text trust strings, a transaction-type enum space, and the proof-side allowlist in `zk_event_registry`. Runtime trust strings currently cover admission start, document processing, consent capture, identity and liveness verification, decision recording, approval and rejection outcomes, purge and cleanup events, appeal open, and active-trust events such as chat, meeting, incident, revoke-request, and attestation submission.
- `open_random_audit_and_freeze`, `open_challenge_audit_and_freeze`, and `execute_enforcement_action` exist today as implementation facts. They expose interface-bearing state and economic consequences, but they do not convert this document into governance-procedure canon.
- `docs/db_schema_overview.md` is stale relative to current Layer 3 reality. In particular, it does not capture the present separation among `event_receipts`, `trust_ledger_events`, and `zk_event_receipts`, and it should remain reference-only in this pass.

## Out-of-scope references

- Governance and due-process canon for Phase 7.2.
- Surface implications and the Stage 7.0a browser review track.
- Future chain anchoring implementation, live proof generation, and verifier deployment.
- Broader economics policy tuning, including collateral sizing, slashing ratios, and treasury policy.
- Hygiene cleanup of adjacent reference documents, including `docs/db_schema_overview.md`.
