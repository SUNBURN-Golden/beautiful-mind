# ZK Rollup Readiness (Phase 4.2++ v0)

This system establishes the SSOT-Parallel architectural baseline for a Zero-Knowledge Proof (ZKP) computation layer across all core backend events.

At the current stage, no actual proofs (Groth16/Plonk) are generated. The implementation functions strictly as an off-chain data availability and sequence aggregator, converting existing validation data into cryptographic commitments (`zk_event_receipts`) ready for future prover circuits.

## 1. Zero-Knowledge Event Registry
Instead of ad-hoc commitments, the ZK pipeline exclusively mirrors the single-source-of-truth `event_receipts` ledger.
The allowlist is managed via `public.zk_event_registry`, which strictly binds an `event_type` to a specific Proving Circuit (`circuit_id`).

Currently Support Events:
- `VERIFICATIONS_INSERT` & `UPDATE` -> `QUALIFICATION_V0`
- `TOKEN_LEDGER_INSERT` (Fraud) -> `FRAUD_V0`
- `INTERVIEWS_INSERT` & `UPDATE` -> `INTERVIEW_CONSIST_V0`
- `SLASH_NO_REVIEW` -> `REVIEW_SLA_V0`

## 2. PII-Free Public Inputs & Meta Injection (Schema v3)
The core schema for generating the proofs resides in `public_inputs` inside `zk_event_receipts`.
To guarantee zero-PII extraction, the `event_receipts` trigger automatically sanitizes the raw `canonical_json` into a strictly structured `zk_meta` payload upon insertion. 

**Absolute Rules:**
- **No Raw Identifiers**: Never store the raw `auth.users(id)` UUID directly. Use a 256-bit hash (e.g. Keccak/Poseidon) of the `id`.
- **No Document Keys**: Never include the `artifact_object_key` or S3 path.
- **No Exact Dates**: Convert specific temporal events into rounded `timestamp_bucket` integers (e.g. truncated to the day/week level) to prevent correlation attacks.
- **No Raw Demographics**: Exclude plaintext physical descriptions, exact age, addresses, and phone crypts.

## 3. Commitment Versioning (PLACEHOLDER_V0)
To accommodate the eventual rollout of ZK provers (such as Circom/Noir circuits), `commitment_scheme` and `schema_version` are explicitly tracked.

For Phase 4.2++, we utilize `PLACEHOLDER_V0`. 
Under the hood, this generates a `sha3-256` digest via rigid Domain Separation logic:
- `nullifier_hash` = `sha3("SOULBOUND_NULLIFIER_V0" | userIdKeccak | event_type | source_receipt_id)`
- `commitment_hash` = `sha3("SOULBOUND_COMMIT_V0" | public_inputs_hash_keccak | circuit_id | schema_version)`

These placeholders enforce 1:1 structural rigidity until Poseidon/Mimc scalar field algorithms are established in Smart Contracts.

## 4. Relationship with L1 Merkle Anchors
The existing `merkle_anchors` mechanism operates exclusively as a **"System Log Integrity" proving layer**. Its job is to guarantee to external auditors that the system logs themselves were not retroactively altered.

The **ZK Rollup Pipeline** operates independently as an **"Attribute Verification" proving layer**.
- It creates and submits its own transaction hashes via `zk_rollup_submissions`.
- Because it reads specifically enriched structured tags out of the SSOT ledger, the Merkle anchor pacing (e.g., Weekly Lazy Commitment) is totally unbound from the frequency of ZK Batch Proof generation.
