# Wallet Surface Contract — SOUL Ledger UI

## 1. Status

- This is a surface contract, not an implementation.
- It defines how SOUL ledger state may be exposed to ordinary users through a future Wallet UI.
- It does not alter ledger schema, RLS, token economics, SBT credentials, or production data behavior.
- Stage 8/8 is closed. This document supports Stage 9 planning.
- Baseline commit: `fbd6668`.

## 2. Layer boundary

### Layer 3 — Ledger / economic / security foundation

Owns:
- `token_ledger` — canonical append-only economic ledger
- `user_wallets` — guarded balance projection (not authority)
- `token_holds` — escrow / pending / held state
- `soul_tx_type` enum — transaction classification
- `soul_hold_state` enum — hold lifecycle
- RLS policies — self-read on `user_wallets`, RLS enabled on `token_ledger` and `token_holds`
- Economic write boundaries — `append_soul_ledger_internal` and specialized flows
- All server-side aggregation logic

### Layer 4 — Surface / UI / UX

Owns:
- Wallet page component
- Wallet copy and labels (`i18n/wallet.ts`)
- Activity card rendering
- Balance display formatting
- Navigation affordance in guarded shell
- Human-readable mapping of tx types and hold states

### Boundary rules

- Wallet UI MUST NOT bypass Layer 3 rules.
- Wallet UI MUST NOT directly query raw `token_ledger` or `token_holds` from the client.
- Wallet UI MUST NOT infer or mutate ledger state.
- Wallet UI MUST consume only the `/api/me/wallet` server-side aggregation endpoint.
- Raw `token_ledger`, `token_holds`, `meta`, ids, and enum values MUST NOT be exposed to ordinary UI.

### Security clarification

- `user_wallets` self-read is confirmed via `auth.uid() = user_id`.
- `token_ledger` and `token_holds` have RLS enabled, but this contract MUST NOT assume ordinary direct client read unless exact SELECT policies are verified.
- Future Wallet implementation SHOULD prefer `/api/me/wallet` server-side aggregation over direct client browsing of raw ledger tables.

## 3. SOUL vs SBT distinction

### SOUL Credits

- SOUL is the spendable / holdable / earnable / burnable economic credit token.
- SOUL lives in `token_ledger` (canonical) and `user_wallets` (projection).
- SOUL balance = total credits available + held credits.
- SOUL activity = economic movement records (airdrop, reward, spend, slash, etc.).

### SBT (Soulbound Token)

- SBT is a trust credential / verification status, not a currency.
- SBT lives in `soul_credentials`, `sbt_claims`, and related trust-event tables.
- SBT status indicates verification level, not economic balance.

### Conflation guard

- Dashboard SBT fields (admission status, trust level) are NOT wallet balance.
- Wallet page MAY display SBT credential status only as a contextual badge (e.g., "Verified member"), but MUST NOT present it as SOUL balance or economic value.
- The terms "SOUL" and "SBT" must never be used interchangeably in Wallet UI.

## 4. Minimum ordinary Wallet fields

### Required fields

| Field | Source / derivation | EN label | KO label | Readiness |
|---|---|---|---|---|
| Total SOUL balance | `user_wallets.balance` | Total balance | 전체 잔액 | Safe now |
| Available SOUL | `user_wallets.balance` minus sum of PENDING holds | Available | 사용 가능 | Derivable now |
| Held / pending SOUL | `token_holds` WHERE `state = 'PENDING'` | Held SOUL | 보류 중인 SOUL | Derivable now |
| Recent activity list | `token_ledger` last N rows for user | SOUL activity | SOUL 사용내역 | Derivable now |

### Optional / later fields

| Field | Source / derivation | EN label | KO label | Readiness |
|---|---|---|---|---|
| Earned total | Sum of positive `token_ledger` amounts | Total earned | 총 획득 | Derivable now |
| Spent total | Sum of negative `token_ledger` amounts | Total used | 총 사용 | Derivable now |
| Locked total | `token_holds` WHERE `state IN ('PENDING','DISPUTED')` | Locked | 잠금 | Derivable now |
| Disputed amount | `token_holds` WHERE `state = 'DISPUTED'` | Under review | 검토 중 | Derivable now |
| Slashed/deducted amount | `token_ledger` WHERE `type` in slashing types | Deducted | 차감 | Derivable now |
| Support references | Generated from `token_holds.id` | Reference | 참조 번호 | Defer |
| SBT credential badge | `soul_credentials` / `sbt_claims` status | Verified | 인증 완료 | Later |

## 5. Ledger event display contract

### `soul_tx_type` mapping table

All 12 known enum values:

| Raw tx_type | Ordinary EN label | Ordinary KO label | Amount sign | Ordinary visibility | Support visibility | Notes / risk |
|---|---|---|---|---|---|---|
| `AIRDROP` | SOUL grant | SOUL 지급 | + (credit) | Show | Show | Covers welcome airdrops and cohort-based grants; not limited to new-user events |
| `GAS_FEE_BURN` | Processing fee | 처리 수수료 | − (debit) | Show | Show | May confuse if labeled "gas" — avoid crypto jargon |
| `GAS_FEE_TIP` | Service fee | 서비스 수수료 | − (debit) | Show | Show | Same caution as above |
| `REWARD_MINT` | Reward | 보상 | + (credit) | Show | Show | Positive event |
| `SLASHING_BURN` | Deduction | 차감 | − (debit) | Show with care | Show with code | Must not appear as unexplained disappearance |
| `SLASHING_COMPENSATE` | Trust compensation | 신뢰 보상 | + (credit) | Show | Show | Harmed-party restoration from slashing event |
| `TREASURY_GRANT` | Grant | 지원금 | + (credit) | Show | Show | Rare for ordinary users |
| `TREASURY_SPEND` | Used | 사용 | − (debit) | Show | Show | Treasury-initiated spend |
| `INSURANCE_CREDIT` | Insurance credit | 보험 보상 | + (credit) | Show | Show | Credit issued from insurance/protection pool |
| `COLLATERAL_DEPOSIT` | Deposit | 예치 | − (debit) | Show | Show | Must not be labeled "withdrawal" |
| `COLLATERAL_REFUND` | Refund | 환급 | + (credit) | Show | Show | Collateral returned |
| `COLLATERAL_SLASH` | Penalty deduction | 벌금 차감 | − (debit) | Show with care | Show with code | Must include human reason |

### Display rules

- Raw enum value MUST NEVER appear in ordinary UI.
- Raw `meta` JSONB MUST NEVER appear in ordinary UI.
- Activity item MUST show: human label, amount, timestamp, and safe reason.
- Amount sign MUST be visually indicated (e.g., +/− prefix, color coding).
- Unknown `tx_type` fallback:
  - EN: `Wallet activity`
  - KO: `월렛 활동`
- Support/diagnostic view MAY expose raw code behind appropriate affordance.

## 6. Hold status display contract

### `soul_hold_state` mapping table

All 5 known values:

| Raw hold status | Ordinary EN label | Ordinary KO label | Ordinary visibility | Counts as available | Counts as held | Notes / risk |
|---|---|---|---|---|---|---|
| `PENDING` | Held | 보류 중 | Show | No | Yes | Active hold, reduces available balance |
| `RELEASED` | Released | 해제됨 | Activity/history only | Yes (already released) | No | No longer held; show in history |
| `SLASHED` | Deducted | 차감됨 | Activity/history only | No (permanently removed) | No | Must show human reason, not raw code |
| `CANCELLED` | Cancelled | 취소됨 | Activity/history only | Yes (never deducted) | No | Hold was cancelled; show in history |
| `DISPUTED` | Under review | 검토 중 | Show with care | No | Yes | Must be clearly marked as under review |

### Display rules

- Pending/held SOUL MUST NOT be counted as available.
- Disputed amount MUST be clearly marked as under review if shown.
- Slashed/deducted amount MUST be shown with human reason, not as unexplained disappearance.
- Cancelled/released holds SHOULD appear in activity/history, not in active held balance.
- Raw `soul_hold_state` enum value MUST NEVER appear in ordinary UI.

## 7. Ordinary / support / diagnostic boundary

### Ordinary audience

- Balance summary (total, available, held)
- Safe human labels for all transaction types
- Safe recent activity list with labels, amounts, timestamps
- Hold status with human labels
- NO raw ids (ledger id, hold id, idempotency key)
- NO raw enum values (`soul_tx_type`, `soul_hold_state`)
- NO raw meta JSONB
- NO internal reason codes

### Support audience

- Truncated reference ids (e.g., last 8 characters)
- Support reference label (e.g., "Reference: ABCD1234")
- Expanded reason text if safe for support context
- Hold resolution hints

### Diagnostic audience

- Raw enum values and meta allowed ONLY in internal/debug contexts
- NOT on ordinary app surfaces
- NOT in customer-facing support chat without explicit diagnostic mode

## 8. API contract recommendation

### Endpoint

```
GET /api/me/wallet
```

### Authentication

- Authenticated user only.
- Self-read only.
- No cross-user records.
- No service-role key leakage to client.

### Recommended response shape

```json
{
  "wallet": {
    "totalBalance": 1000,
    "availableBalance": 800,
    "heldBalance": 200,
    "currency": "SOUL"
  },
  "activity": [
    {
      "safeReference": "ref-a1b2c3d4",
      "label": "SOUL grant",
      "amount": 500,
      "direction": "credit",
      "occurredAt": "2026-04-28T12:00:00Z",
      "status": "Completed",
      "reason": null,
      "cursor": "opaque-pagination-token"
    }
  ],
  "holds": [
    {
      "safeReference": "holdRef123",
      "amount": 200,
      "statusLabel": "Held",
      "createdAt": "2026-04-28T10:00:00Z",
      "releaseOrResolutionHint": "Scheduled release"
    }
  ]
}
```

### Security requirements

- Authenticated user only — reject unauthenticated requests.
- Self-read only — return data for `auth.uid()` only.
- No cross-user records — server enforces `user_id` filter.
- No service-role key leakage to client — server-side aggregation only.
- Server-side aggregation preferred — client MUST NOT browse raw ledger tables.
- No client-side raw ledger table browsing — all data served through API.
- Activity items MUST NOT expose raw ledger UUIDs as display identifiers. `safeReference` is a truncated or hashed value safe for support display. `cursor` is opaque and non-display, used only for pagination.

## 9. Navigation / IA contract

### Information architecture

- **My space** = dashboard/home (current `My space` / `내 스페이스`).
- **Wallet** = SOUL balance and SOUL activity.
- **Review status** = admission/review status for candidate or non-active users (`/apply/status`).

### Naming rules

- Use "Wallet" / "월렛" for the SOUL balance page.
- Do NOT use "My access" as a proxy for Wallet.
- Do NOT use "My status" as a proxy for Wallet.
- `/apply/status` remains review/admission status, not Wallet.

### Navigation behavior

- Wallet nav SHOULD be enabled only when real balance data can be shown.
- If backend/API is not ready, Wallet MAY be disabled with:
  - EN: `SOUL balance coming soon`
  - KO: `SOUL 잔액 기능은 준비 중입니다.`
- Disabled reason in guarded shell nav:
  - EN: `Coming soon`
  - KO: `준비 중`

## 10. Copy and terminology guardrails

### Prefer

| EN | KO | Context |
|---|---|---|
| Wallet | 월렛 | Page title, nav label |
| SOUL balance | SOUL 잔액 | Balance heading |
| Available SOUL | 사용 가능 SOUL | Available balance |
| Held SOUL | 보류 중인 SOUL | Held balance |
| SOUL activity | SOUL 사용내역 | Activity list |
| Earned | 획득 | Positive event |
| Used | 사용 | Negative event (spend) |
| Deducted | 차감 | Negative event (slash/penalty) |
| Under review | 검토 중 | Disputed status |
| Reward | 보상 | Reward mint |
| SOUL grant | SOUL 지급 | Airdrop |

### Avoid unless implemented

Do NOT use these terms unless the corresponding feature is fully implemented and approved:

| Do not use (EN) | Do not use (KO) |
|---|---|
| crypto wallet | 크립토 월렛 |
| on-chain wallet | 온체인 월렛 |
| withdrawal | 출금 |
| deposit (as funding) | 입금 |
| exchange | 거래소 |
| transfer | 이체 |
| token custody | 토큰 보관 |
| investment | 투자 |
| yield | 수익 |
| send | 보내기 |

Note: "Deposit" in the context of collateral (`COLLATERAL_DEPOSIT`) should be labeled "예치" not "입금".

## 11. Risk register

| Risk | Severity | Mitigation |
|---|---|---|
| Wrong balance display | Critical | Server-side aggregation; never derive on client; test with known fixtures |
| Double-counting held SOUL as available | Critical | Available = total minus PENDING holds; test boundary cases |
| Pending/available ambiguity | High | Clear visual separation; labels distinguish "held" from "available" |
| Slashing/reversal confusion | High | Show human reason for deductions; never show unexplained negative amounts |
| Cross-user wallet exposure | Critical | API enforces `auth.uid()` = `user_id`; RLS test proves user A cannot see user B |
| RLS bypass | Critical | Do not assume direct client read is safe; use server-side endpoint |
| Service-role key leakage to client | Critical | API route must never expose service-role key; server-side only |
| SOUL/SBT conflation | High | Clear section separation; SBT shown as credential badge, never as balance |
| Financial/crypto overpromise | Medium | Follow copy guardrails; avoid investment/yield/custody language |
| Ordinary UI exposing raw ledger internals | High | Mapping layer enforced; raw enum/meta never reaches ordinary UI |

## 12. Implementation acceptance criteria

For future implementation phases:

- `/api/me/wallet` returns only the authenticated user's wallet data.
- Ordinary UI never displays raw `soul_tx_type` enum values.
- Ordinary UI never displays raw `soul_hold_state` enum values.
- Ordinary UI never displays raw `meta` JSONB content.
- Ordinary UI never displays raw ledger ids or idempotency keys.
- Unit tests cover all 12 `soul_tx_type` mappings to human labels.
- Unit tests cover all 5 `soul_hold_state` mappings to human labels.
- Unit tests cover unknown `tx_type` fallback labels.
- Integration/RLS test proves user A cannot see user B's wallet.
- Wallet page displays total, available, and held SOUL balance.
- Wallet page includes recent activity with human labels, not raw codes.
- Guarded shell nav uses "Wallet" / "월렛", not "My access" or "My status".
- `/apply/status` remains review/admission status, not Wallet.
- Held SOUL is subtracted from total to compute available.
- Disputed amounts are clearly marked as under review.

## 13. Deferred decisions

- Full activity history pagination (beyond recent N items)
- Detailed disputed/slashed event UX (appeal flow, timeline)
- On-chain bridge / external wallet connection
- Transfer/send/receive between users
- Withdrawal/deposit language and flow
- Public profile SOUL display
- Staking/collateral management UI (beyond balance display)
- SBT badge placement within Wallet page
- Real-time wallet update mechanism (websocket vs polling)
- Multi-currency or token conversion display
- Wallet notification/alert system

## 14. Next recommended phases

| Phase | Scope | Dependencies |
|---|---|---|
| 9.1a | `/api/me/wallet` backend read route | This contract, server-side aggregation |
| 9.1b | Wallet representation/mapping tests | `soul_tx_type` and `soul_hold_state` mapping tables |
| 9.1c | Wallet page + guarded shell nav | 9.1a API route, `i18n/wallet.ts` copy |
| 9.1d | RLS isolation / browser QA | 9.1a endpoint, cross-user test fixtures |