# SoulBound Architecture

## Scope
This file is the single canonical statement of SoulBound's four-layer architecture. It governs which documents and code belong to which layer. It also records gate rules that exist specifically to protect this architecture during Stage 7. Operational conduct, including worktree, baselines, and semantic gates, remains authoritative in `docs/operations/operating-principles.md`. Design tone remains authoritative in `docs/design/tone.md`. This file is structural, not stylistic.

## Why four layers
SoulBound is not a single-layer product. User-facing surface and the substrates that give it enforceable meaning are different layers. Mixing layers in documentation has previously caused phase audits to drift, as recorded in `docs/operations/stage-5-retrospective.md` and `docs/operations/profile-compatibility-audit.md`. Locking the layers explicitly prevents future cross-layer contamination.

## The four layers

### Layer 1 — Product North Star
Layer 1 defines what SoulBound is to the user. Owns: product identity, framing words such as trust-first, admission-first, social-bound, non-dating, and the user-facing meaning of "trust". Authoritative documents: `docs/product/north-star.md` (planned, not yet written). Does NOT own: surface implementation, governance procedure, or ledger mechanics.

### Layer 2 — Governance / Due Process
Layer 2 defines who decides what, by what procedure, and how decisions are reversed. Owns: freeze -> notice -> response -> adjudication -> execution flow, reversible enforcement, shadow evaluation, promotion gate, appeal queue, exception review, and authorization boundaries. Authoritative documents: `docs/governance/*` (planned for Phase 7.2). Does NOT own: token mechanics, hashing boundaries, or surface copy.

### Layer 3 — Ledger / Economic Security
Layer 3 defines what makes SoulBound's claims enforceable and auditable. Owns: append-only token ledger, immutable event model, evidence hashing boundary, Merkle-anchorable event shape, collateral and slashing policy interface, future L1 anchoring point, and future ZK proof boundary. Authoritative documents: `docs/ledger/*`, `docs/economics/*` (planned for Phase 7.1). Does NOT own: user-facing copy, surface design, or procedural decisions.

### Layer 4 — Surface / UX
Layer 4 defines how the system appears in screens and copy. Owns: landing, dashboard, match, chat, future profile, future introduction, and future counterpart routes; vocabulary, motion primitives, palette, typography, space rules, i18n, and fixture and manual fixture pages. Authoritative documents: `docs/design/tone.md`, `docs/design/direction-note.md`. Does NOT own: ledger mechanics, governance procedure, or product framing words, which belong to Layer 1.

## Cross-layer reference rules
- Documents in any layer MAY reference documents in other layers.
- Such references MUST name the target layer and the target document explicitly. Example: "This surface consumes the event shape defined in Layer 3 / `docs/ledger/event-model.md` §3."
- Documents MUST NOT silently borrow vocabulary from another layer. A Layer 4 document does not casually use the words "token ledger" or "slashing"; it references Layer 3 explicitly when it must.
- A Layer 1 document does not contain governance procedure or ledger mechanics inline.
- This rule is enforced operationally by `docs/operations/operating-principles.md` §8 (Layer Discipline).

## Stage 7 gate rule — Substrate Before Surface
- This gate rule exists only for the duration of Stage 7. It is not a permanent operating principle.
- While Layer 2 (Governance) and Layer 3 (Ledger) formalization is in progress within Stage 7, new Layer 4 Surface work does not open automatically.
- Re-entry into Surface work is performed by Phase 7.3 (Surface Re-entry Decision) only after Phase 7.0, 7.0a, 7.1, and 7.2 have all closed.
- This gate is a Stage 7 specialization of `docs/operations/operating-principles.md` §6 (Semantic Hard Gate).
- After Stage 7 closes, this gate rule is considered satisfied and is not carried forward as a permanent rule. If a future stage introduces new substrate work, a new stage-specific gate may be recorded here at that time.

## Existing documents — layer ownership
- `docs/design/tone.md` — Layer 4 (Surface / UX), authoritative
- `docs/design/direction-note.md` — Layer 4 (Surface / UX), historical memo
- `docs/operations/operating-principles.md` — operational contract, cross-layer (not a Layer document)
- `docs/operations/stage-5-retrospective.md` — operational record, cross-layer (not a Layer document)
- `docs/operations/profile-compatibility-audit.md` — operational record, cross-layer (not a Layer document)
- `docs/operations/stage-6-closeout.md` — operational record, cross-layer (not a Layer document)
- `docs/architecture/ARCHITECTURE.md` — this file, cross-layer structural canon (not a Layer document)
- `docs/product/north-star.md` — Layer 1, planned (not yet written)
- `docs/governance/*` — Layer 2, planned for Phase 7.2
- `docs/ledger/*`, `docs/economics/*` — Layer 3, planned for Phase 7.1
- `docs/legal/*` — read-only, out of scope for this architecture (existing repo convention)
