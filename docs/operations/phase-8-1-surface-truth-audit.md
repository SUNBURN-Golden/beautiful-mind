# Phase 8.1 — Surface Truth Audit Report

## Status

- Project Stage 8/8
- Phase 8.1/7 — Surface Truth Audit (review-only)
- This document is an audit report. It does not authorize implementation.

## Audit coverage

This audit covers the primary Stage 8 surface-clarity routes: landing, login, signup, manual, the guarded apply flow, dashboard, and banned. It does not cover legacy public routes (`/chat`, `/consent`, `/contract`, `/review`, `/revoke`, `/report`, `/match`), debug/test routes (`/remote-test`, `/rls`, `/debug/realtime`), admin routes (`/admin/*`), or onboarding routes (`/onboarding/*`). Legacy route existence is noted where dashboard room links reference them.

## Charter alignment note — locale route model

The Stage 8 charter (Phase 8.1 scope) lists routes with `/ko/` path prefixes (e.g., `/ko/login`, `/ko/dashboard`). SoulBound does not use path-based locale routing. The actual locale model is query-parameter routing (`?lang=ko`). The `/ko/` paths in the charter do not exist as separate routes. This mismatch is a charter drafting artifact, not an implementation gap. Phase 8.2+ work should use the actual query-parameter model.

## Locale routing model

SoulBound does NOT use path-based locale routing (`/ko/dashboard`). It uses query-parameter routing (`/dashboard?lang=ko`). The `LocaleSwitch` component appends `?lang=en` or `?lang=ko` to the current pathname. Default locale is `en`.

This means `/ko/` paths referenced in the Stage 8 charter do not exist as separate routes. All routes serve both languages through `?lang=` query parameter.

## Route-by-route audit

### `/` — Landing

- Purpose: First impression, admission CTA
- Primary action: "Review admission terms" (signed out) or "View current status" (signed in)
- Secondary action: "Resume an existing record" → `/login`
- Language toggle: YES — `LocaleSwitch` in header
- Blocking confusion: Hero has excessive empty space above the fold. CTA button styling is subtle.
- Copy/system leakage:
  - Build identifier `soulbound-launch-ui-v3` displayed in footer
  - Commit SHA displayed in footer (e.g., `533BE8A`)
  - Receipt card shows: `INV-5.5-LANDING`, `0x8b29c4d917f4a8e1d55a62b3c7145f09`, `stage5.landing.invitation.v1`, `SoulBound registry`
- Korean typography: Title line-breaks split particles and word fragments across lines. `word-break: keep-all` is not applied to Korean display headings.

### `/login` — Login

- Purpose: Email/password authentication
- Primary action: Login form submission → redirects to `/apply/status`
- Language toggle: NO — not present on this page
- Copy language: Hardcoded Korean only ("로그인 중", "계정이 없으신가요?")
- Blocking confusion: None significant for Korean users. English users see Korean-only UI.

### `/signup` — Signup

- Purpose: Account creation
- Primary action: Signup form → redirects to `/login`
- Language toggle: NO — not present on this page
- Copy language: Hardcoded Korean only ("가입 중...", "회원가입")
- Blocking confusion: Same as login — English users see Korean-only UI.

### `/manual` — Admission Guide

- Purpose: Step-by-step admission flow documentation
- Primary action: Links to `/signup`, `/login`, `/apply`
- Language toggle: NO
- Copy language: Hardcoded English only
- Blocking confusion: Korean users arriving here see English-only content with no toggle.

### `/manual/trust-model` — Trust Model Documentation

- Purpose: Explain trust framework
- Language toggle: NO
- Copy language: Hardcoded English only

### `/apply` — Admission Start (guarded)

- Purpose: Step 0/5, start the admission process
- Primary action: "Start admission" button
- Language toggle: Locale-aware via query param (passable) but no visible toggle in UI
- Blocking confusion: If user is past this stage, shows `StageTransitionNotice` instead

### `/apply/status` — Application Status Dashboard (guarded)

- Purpose: Central status page showing current stage, blockers, decision, next actions
- Primary action: Stage-specific recommended actions (links to next step, appeal, or dashboard)
- Language toggle: Locale-aware but no visible toggle confirmed
- Copy/system leakage — HIGHEST RISK ROUTE:
  - "Reference Detail" card exposes raw internal values: stage code, admission status, review queue type, review state, reason code, appeal status, exception status, SOUL issued boolean
  - AI confidence displayed as raw decimal (e.g., `1.00`)
  - Document type codes displayed via `formatDocumentTypeLabel()` — mapped to Korean only
  - Consent type codes displayed via `formatConsentTypeLabel()` — mapped to Korean only
- Blocking confusion: Dense information but action links are provided through blocker guidance

### `/apply/identity`, `/apply/liveness`, `/apply/consents`, `/apply/documents`, `/apply/review` — Admission Flow Steps (guarded)

- Purpose: Sequential admission steps (identity → liveness → consents → documents → AI review)
- Language toggle: No visible toggle; locale passed via query param
- Copy/system leakage:
  - Document types in `/apply/documents`: `GRADUATION_CERTIFICATE`, `INCOME_CERTIFICATE`, `MARRIAGE_CERTIFICATE`, `FAMILY_RELATION_CERTIFICATE` — mapped to Korean labels in the upload UI
  - Consent codes in `/apply/consents`: mapped to Korean labels
- Blocking confusion: Flow is sequential and guided

### `/apply/appeal` — Appeal Submission (guarded)

- Purpose: Appeal a rejection or exception decision
- Language toggle: No visible toggle confirmed
- Copy/system leakage: Minimal

### `/dashboard` — Access Board (guarded, ACTIVE only)

- Purpose: Post-admission dashboard for verified users
- Primary action: 5 room links — `/match`, `/chat`, `/review`, `/report`, `/revoke`
- Language toggle: Locale-aware copy YES (`getDashboardCopy(locale)`, CSS class `sb-locale-${locale}`); visible language toggle NO — `LocaleSwitch` component is not rendered in dashboard or guarded shell
- Copy/system leakage:
  - Receipt card shows: `standingReceiptId` (format: `standing-active`), `standingHash` (format: `standing:active:admission-verified:active`), contract version `dashboard.access-board.v1`
  - Document records show: `type` (raw enum), `status`, `processing_status` (e.g., `AI_PASSED`), `ai_confidence` (raw decimal), `purged_at` (ISO timestamp)
  - Signal trail shows: contract versions like `identity.active`, `documents.4.verified`, `consent.recorded`, `credential.active`
- Blocking confusion — CRITICAL:
  - 5 room links exist but they point to routes that may not have full implementations (`/match`, `/chat`, `/review`, `/report`, `/revoke`)
  - Room items look like text labels, not clickable cards or buttons
  - No visual distinction between action items and record/evidence items
  - "Close this session" is the only clearly actionable element besides room links
  - No guarded navigation shell — no header navigation, no persistent menu
  - Evidence/receipt/signal trail dominates the viewport; action items are secondary

### `/banned` — Account Frozen (guarded)

- Purpose: Access restriction notice
- Language toggle: Not confirmed
- Blocking confusion: Minimal — purpose is clear

### `/admin/*` — Admin Routes

- Purpose: Operations dashboard, case management, policy
- Language toggle: NO — English only
- Not user-facing; excluded from Surface Clarity scope

## Cross-route findings

### 1. Language toggle availability

| Route | Language toggle | Copy language |
| --- | --- | --- |
| `/` (landing) | YES | EN/KO via i18n |
| `/login` | NO | Korean only (hardcoded) |
| `/signup` | NO | Korean only (hardcoded) |
| `/manual` | NO | English only (hardcoded) |
| `/manual/trust-model` | NO | English only (hardcoded) |
| `/apply/*` flow | NO visible toggle | Korean labels via status-copy.ts |
| `/apply/status` | NO visible toggle | Korean labels via status-copy.ts |
| `/dashboard` | NO (locale-aware copy only) | EN/KO via getDashboardCopy() |

Gap: Visible language toggle (`LocaleSwitch`) exists only on the landing page. Dashboard has locale-aware copy (`getDashboardCopy(locale)`) but no visible toggle. Login, signup, manual, and the entire apply flow have neither visible toggle nor locale-aware copy. `status-copy.ts` provides Korean-only mappings with no English equivalent.

### 2. Internal identifier exposure

| Location | Identifier type | Example |
| --- | --- | --- |
| Landing footer | Build name | `soulbound-launch-ui-v3` |
| Landing footer | Commit SHA | `533BE8A` |
| Landing receipt | Receipt ID | `INV-5.5-LANDING` |
| Landing receipt | Hash | `0x8b29c4d917f4a8e1d55a62b3c7145f09` |
| Landing receipt | Contract version | `stage5.landing.invitation.v1` |
| Dashboard receipt | Receipt ID | `standing-active` |
| Dashboard receipt | Hash | `standing:active:admission-verified:active` |
| Dashboard receipt | Contract version | `dashboard.access-board.v1` |
| Dashboard documents | Processing status | `AI_PASSED` |
| Dashboard documents | Confidence | `1.00` |
| Dashboard documents | Purged timestamp | ISO format |
| Dashboard signals | Contract version | `identity.active`, `documents.4.verified`, `consent.recorded` |
| Apply/status reference | Stage code | Raw enum value |
| Apply/status reference | Reason code | Raw enum value |
| Apply/status reference | Queue type | Raw enum value |

### 3. Navigation and action clarity

| Route | Navigation available | Action clarity |
| --- | --- | --- |
| Landing | Logo, CTA, language toggle | Adequate but CTA styling is subtle |
| Login | Back link, signup link, manual link | Adequate |
| Signup | Cancel, manual link | Adequate |
| Apply flow | Step indicator, back/forward | Adequate — guided sequential flow |
| Apply/status | Blocker-specific action links | Good — recommended actions shown |
| Dashboard | 5 room labels, "Close this session" | POOR — rooms look like text, not buttons; no persistent nav; evidence dominates |

### 4. Guarded shell structure

The guarded layout (`(guarded)/layout.tsx`) is a minimal 13-line wrapper:
- Applies `SsotRouteGuard` for auth protection
- Applies `liquid-shell` CSS class
- Contains NO navigation header, NO language toggle, NO persistent menu

Each guarded route must provide its own navigation. This means there is no consistent guarded experience — landing has a header with locale switch, dashboard has its own header with "Close this session", and apply flow pages have their own step indicators.

### 5. Enum-to-copy mapping coverage

`status-copy.ts` provides mappings for:
- 14 blocker codes → Korean labels with action links
- 9 stage codes → Korean labels with descriptions
- 12 decision reason codes → Korean explanations
- 4 document types → Korean labels
- 8 consent types → Korean labels
- 5 error codes → Korean messages

All mappings are Korean only. There is no English equivalent mapping file. The `getDashboardCopy(locale)` function provides EN/KO for dashboard-specific copy, but status/blocker/decision copy has no English path.

### 6. Legacy and debug routes

The following routes exist but are not part of the main user flow:
- `/chat`, `/consent`, `/contract`, `/review`, `/revoke`, `/report`, `/match` — legacy public routes
- `/osint` — undocumented
- `/remote-test`, `/rls`, `/debug/realtime` — testing/debug routes
- `/manual/fixtures/*` — design system fixtures
- `/onboarding/*` — onboarding flow (parallel to apply flow?)
- `/interview` — questionnaire route

Dashboard room links point to `/match`, `/chat`, `/review`, `/report`, `/revoke` — these appear to be legacy routes that may not provide a complete user experience.

## Priority summary

### P0 — Dashboard action clarity
Dashboard rooms are text labels without clear clickable affordance. No persistent navigation. Evidence/receipt/signal dominates viewport over actions.

### P0 — Language toggle consistency
Visible language toggle exists only on the landing page. Dashboard has locale-aware copy but no visible toggle. Login and signup are hardcoded Korean with no toggle. Manual pages are hardcoded English with no toggle. Apply flow has no visible toggle. Status copy is Korean-only with no English mapping.

### P1 — Internal identifier masking
Build metadata, commit hash, receipt IDs, contract versions, processing statuses, and AI confidence scores are displayed in user-facing UI across landing and dashboard.

### P1 — Guarded shell absence
No common navigation header for guarded routes. Each page provides its own navigation, creating inconsistent experience.

### P2 — Korean typography
Landing headline breaks Korean particles across lines. `word-break: keep-all` not applied to Korean display headings.

### P2 — Landing hero spacing
Excessive empty space above the fold creates "still loading?" impression.

## Files inspected

- `apps/web/app/layout.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/login/page.tsx`
- `apps/web/app/signup/page.tsx`
- `apps/web/app/manual/page.tsx`
- `apps/web/app/manual/trust-model/page.tsx`
- `apps/web/app/(guarded)/layout.tsx`
- `apps/web/app/(guarded)/apply/page.tsx`
- `apps/web/app/(guarded)/apply/status/page.tsx`
- `apps/web/app/(guarded)/apply/identity/page.tsx`
- `apps/web/app/(guarded)/apply/liveness/page.tsx`
- `apps/web/app/(guarded)/apply/consents/page.tsx`
- `apps/web/app/(guarded)/apply/documents/page.tsx`
- `apps/web/app/(guarded)/apply/review/page.tsx`
- `apps/web/app/(guarded)/apply/appeal/page.tsx`
- `apps/web/app/(guarded)/dashboard/page.tsx`
- `apps/web/components/surfaces/landing-surface.tsx`
- `apps/web/components/surfaces/dashboard-surface.tsx`
- `apps/web/components/surfaces/locale-switch.tsx`
- `apps/web/i18n/config.ts`
- `apps/web/i18n/landing.ts`
- `apps/web/lib/contracts/status-copy.ts`
- `apps/web/lib/contracts/status-stages.ts`
