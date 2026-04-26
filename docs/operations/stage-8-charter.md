# Stage 8 Charter — Surface Clarity & Alignment

## Status

- Project Stage 8/8
- Phase 8.0/7 — Charter / Scope Lock (this file)
- Alias: Frontend Renovation
- Entry condition: Stage 7 closed with Layer 2 and Layer 3 canon documents in place
- Layer 1 note: `docs/product/north-star.md` is referenced by ARCHITECTURE.md but does not yet exist; this is recorded as a known gap, not a blocker for Stage 8

## Stage 8 direction change

Stage 7.3 did not authorize Layer 4 work inside Stage 7. This charter explicitly opens a bounded Stage 8 surface-alignment scope while preserving the Stage 7 prohibitions against profile, introduction, circles, new trust-explanation routes, and substrate changes.

Stage 8 intentionally prioritizes bounded user-facing clarity over substrate conformance implementation. Substrate conformance gaps identified in prior phases — including independent unfreeze RPC, appeal reversal, RESPONDED transition, trust_ledger_events permission narrowing — are recorded in the Stage 8 closeout backlog as deferred items. They are not Stage 8 implementation scope unless they directly affect user-facing representation.

Because `docs/product/north-star.md` does not exist, Stage 8 must not invent a new Layer 1 product north star. It must use `ARCHITECTURE.md`, `tone.md`, and the Stage 7 decision records as the temporary operating baseline for surface decisions.

## Purpose

Stage 8 repairs the user-facing SoulBound surfaces so that a user — before and after login — can immediately understand their current standing, what actions are available, where to click next, what records support the standing, and how to switch language.

This is not a new feature stage. It does not change admission logic, ledger semantics, matching logic, runtime governance, or production data behavior. It makes the existing product understandable, actionable, and bilingual.

## Problems observed (browser-eye review evidence)

1. The logged-in dashboard does not make it clear what the user should click next. Action items, record items, and evidence items are visually indistinguishable.
2. Internal identifiers and enum values are exposed as user-facing copy: `GRADUATION_CERTIFICATE`, `AI_PASSED`, `ADMISSION_VERIFIED`, `identity.active`, `documents.4.verified`, `stage5.landing.invitation.v1`.
3. Build/packet/version metadata appears in user-facing surfaces: `BUILD: SOULBOUND-LAUNCH-UI-V3`, `COMMIT: 533BE8A`.
4. Korean/English language switching exists on landing but not on the logged-in dashboard.
5. Korean landing typography breaks words and particles incorrectly across lines.
6. Dashboard information hierarchy is flat; evidence and receipt records dominate over actionable items.
7. No navigation exists on the logged-in screen beyond "Close this session."

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
| 8.1 | Surface Truth Audit | Review-only: inspect every user-facing route for action clarity, copy leakage, language coverage, and interaction contract |
| 8.2 | Copy & Representation System | Internal enum to user copy mapping, status labels, action labels, document labels, identifier masking rules |
| 8.3 | Guarded Shell & Language Continuity | Dashboard language toggle, common guarded navigation, route-aware locale handling |
| 8.4 | Dashboard Interaction Renovation | Standing summary, action/record/evidence card separation, primary action visibility, collapsible evidence drawer |
| 8.5 | Landing Readability Renovation | Korean line-break fix, hero vertical rhythm, CTA affordance, build metadata hiding |
| 8.6 | Browser-eye QA & Closeout | Desktop/tablet/mobile, Korean/English, logged-out/logged-in, acceptance checklist, remaining debt log, canon-code conformance notes |

## Phase 8.1 — Surface Truth Audit

Scope: review-only. No file modifications. Phase 8.1 produces an audit report only. It does not authorize copy edits, route edits, component edits, or design changes.

Inspect all user-facing routes:

- `/` and `/ko`
- `/login` and `/ko/login`
- `/signup` and `/ko/signup`
- `/apply` and `/ko/apply`
- `/apply/status` and `/ko/apply/status`
- `/dashboard` and `/ko/dashboard`
- manual/trust-model routes if present

For each route, report:

- Purpose of the route
- Primary action available to the user
- Secondary actions
- Blocking confusion: what prevents the user from understanding what to do
- Copy/system leakage: internal identifiers, enum values, build metadata exposed
- Language toggle availability
- Internal identifiers exposed in user-facing UI

## Phase 8.2 — Copy & Representation System

Create or update a presentation layer that maps internal domain values to user-facing labels in Korean and English.

Required mappings include at minimum:

- Document types: `GRADUATION_CERTIFICATE`, `INCOME_CERTIFICATE`, `MARRIAGE_CERTIFICATE`, `FAMILY_RELATION_CERTIFICATE`
- Processing states: `AI_PASSED`, `VERIFIED`, `ACTIVE`, `ADMISSION_VERIFIED`
- Contract identifiers: `identity.active`, `documents.4.verified`, `consent.recorded`, `dashboard.access-board.v1`, `standing-active`
- Status labels for standing, admission, trust level
- Action labels for proposals, correspondence, attestation, reporting, participation

Rules:

- Do not expose raw enum values, snake_case identifiers, contract IDs, build IDs, packet IDs, or commit hashes in ordinary user-facing UI
- If any internal identifier is needed for support or debugging, place it behind a developer-only or diagnostics-only affordance
- This is product language design, not translation

## Phase 8.3 — Guarded Shell & Language Continuity

Add consistent navigation and language switching to logged-in guarded surfaces.

Required elements in the guarded header:

- SoulBound brand
- Primary navigation destinations (proposals, correspondence, trust records, account) — if a route is not implemented, show a disabled state with a human-readable reason
- Language switcher (Korean / English)
- Sign out action

`Close this session` alone is insufficient. The logged-in user needs both "where to go" and "how to leave."

## Phase 8.4 — Dashboard Interaction Renovation

Restructure the dashboard viewport priority:

1. Current standing summary: status, trust level, required records confirmation
2. Primary available actions: action cards that are clickable and lead somewhere
3. Secondary actions: additional options
4. Recent record summary
5. Collapsible evidence / signal trail

Separate card types visually:

- Action cards: clickable navigation to a destination
- Record cards: read-only status display
- Evidence cards: receipt/audit/signal trail records

The first viewport of the dashboard must answer:

- What is my current status?
- What can I do now?
- Where do I click next?
- What is unavailable and why?

`Verified signal trail`, `Current standing receipt`, and document records are important but must not dominate the first viewport. Move them below the action area or into a collapsible drawer.

## Phase 8.5 — Landing Readability Renovation

Korean typography:

- No broken particles or word fragments across line breaks
- Use phrase-based line breaks for Korean display headings
- Apply `word-break: keep-all` and `line-break: strict` for Korean text

Landing layout:

- Reduce excessive empty hero space on common viewport sizes
- Make CTA buttons visually distinct as clickable elements
- Remove user-facing build/packet/version metadata or move to developer-only diagnostics

Landing copy:

- Korean and English headlines do not need to be literal translations of each other; each should read naturally in its own language
- The philosophy is preserved; the presentation is fixed

## Phase 8.6 — Browser-eye QA & Closeout

Browser review matrix:

- Viewport widths: 375px mobile, 768px tablet, 1440px desktop
- Languages: Korean, English
- States: logged-out, logged-in

Acceptance criteria:

- Dashboard has visible primary action cards in the first viewport
- Dashboard has language switcher
- Korean landing headline does not break words or particles
- No raw enum, snake_case, or internal identifiers appear in ordinary user-facing UI
- Build/commit/packet metadata is not visible in ordinary user-facing UI
- Action cards, record cards, and evidence cards are visually distinct
- Disabled or unavailable actions explain why they are unavailable
- No DB schema or substrate logic was changed
- `pnpm --filter web build` passes
- Relevant tests pass or failures are documented with exact cause

Canon-code conformance notes:

- Record any surface-relevant canon-code gaps discovered during QA
- Record any substrate-side gaps (unfreeze RPC, appeal reversal, RESPONDED transition, etc.) as deferred items in the closeout backlog — these are not Stage 8 scope
- Record `docs/db_schema_overview.md` staleness status

Closeout deliverables:

- Acceptance checklist
- Before/after summary
- Screenshots for Korean/English landing and dashboard
- Remaining debt log for next cycle
- Canon-code conformance notes for deferred substrate gaps

## Scope

### In scope

- Landing page (Korean and English)
- Dashboard / Access Board
- Guarded app shell and navigation
- Language switcher behavior across all guarded routes
- User-facing copy for status, document types, actions, and evidence
- Internal identifier masking on user-facing surfaces
- Korean typography and line-break behavior
- CTA affordance and action card clarity

### Out of scope

- Matching algorithm changes
- Admission state machine changes
- Ledger canon changes (LEDGER_CANON.md content)
- Governance canon changes (GOVERNANCE_CANON.md content)
- SOUL token economics changes
- Runtime governance consumer additions
- Variable governance promotion logic changes
- DB schema changes or new migrations
- Production data mutation
- Autonomous enforcement or penalty logic changes
- Profile live route creation
- Introduction live promotion
- Circles live route creation
- Independent unfreeze RPC implementation
- Appeal decision / reversal path implementation
- RESPONDED transition implementation
- trust_ledger_events permission narrowing
- docs/db_schema_overview.md schema rewrite (unless separately opened in a docs hygiene pass)

## Operating rules

- Stage 7 operating principles remain in force
- Layer discipline from operating-principles.md §8 applies
- Canon documents are reference authorities for surface representation, not implementation orders for substrate changes
- Surface changes must not contradict canon; they must represent canon-defined state accurately in user-facing language
- Worktree must be clean between phases
