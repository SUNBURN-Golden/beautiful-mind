# RLS Policy Matrix

| table | select | insert | update | delete | who | how (조건) | policy_names | source_location |
|---|---|---|---|---|---|---|---|---|
| `profiles` | O | X | X | X | user | `id = auth.uid()` | "profiles_select_own" | `05_master_init.sql` |
| `verifications` | O | X | X | X | user | `user_id = auth.uid()` | "verifications select own" | `05_master_init.sql` |
| `identity_claims` | O | X | X | X | user | `user_id = auth.uid()` | "identity_claims select own" | `05_master_init.sql` |
| `event_receipts` | O | X | X | X | user/admin | `user_id = auth.uid()` 또는 admin | "receipts view" | `00_private_ledger.sql` |
| `audit_logs` | O | X | X | X | admin | `is_admin = true` | "Admins can view all audit_logs" | `01_admin_roles.sql` |
| `zk_event_receipts` | X | X | X | X | service_role | `USING (true) WITH CHECK (true)` 전용 | "zk_event_receipts_service_role" | `18_zk_spec_lock_v0.sql` |
| `zk_rollup_batches` | X | X | X | X | service_role | `USING (true) WITH CHECK (true)` 전용 | "zk_rollup_batches_service_role" | `18_zk_spec_lock_v0.sql` |

### 🚨 위험 플래그 분석
- **우회 불가능성 보장**: 클라이언트 단에서 RLS를 통해 `INSERT`, `UPDATE`, `DELETE` 권한이 전부 부여되지 않았습니다 (`WITH CHECK (false)` 등 명시). 이는 애플리케이션 보안 상 **아주 강력한 장점**입니다. 데이터 뮤테이션은 오로지 검증된 서버 API를 통해 수행됩니다.
- **Service Role 사용 사유**: 클라이언트 수정이 원천 차단되었기 때문에, 데이터 뮤테이션(예: 외부 AI 결과 주입, ZK 변환 등)은 Next.js Server Side Route(`app/api/*`)에서 고립된 상태로 `SUPABASE_SERVICE_ROLE_KEY`를 이용하여 수행됩니다. 이는 무결성 보장과 PII 안전 처리를 위한 의도적 설계이므로 안전합니다.

---

## ⚠️ Pending sync (2026-04-10 기준)
이 매트릭스는 `20260225` 마이그레이션 기준이다. 그 이후 아래 테이블들이 추가되었으나 RLS 정책 열이 채워지지 않았다. 다음 리뷰어는 각 마이그레이션의 `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` 및 `CREATE POLICY` 블록을 읽어 이 표를 갱신해야 한다.

| table | 추가 마이그레이션 | RLS 상태 (확인 필요) |
|---|---|---|
| `feature_flags` | `20260227000000_trust_sbt_pipeline` | TBD |
| `sbt_claims` | `20260227000000_trust_sbt_pipeline` | TBD |
| `audits` | `20260227000000_trust_sbt_pipeline` | TBD |
| `challenges` | `20260227000000_trust_sbt_pipeline` | TBD |
| `collateral_accounts` | `20260227000000_trust_sbt_pipeline` | TBD |
| `enforcement_actions` | `20260227000000_trust_sbt_pipeline` | TBD |
| `admission_applications` | `20260306010000_admission_refactor` | TBD |
| `admission_document_submissions` | `20260306010000_admission_refactor` | TBD |
| `consent_events` | `20260306010000_admission_refactor` | TBD |
| `verified_claims` | `20260306010000_admission_refactor` | TBD |
| `review_cases` | `20260306010000_admission_refactor` | TBD |
| `review_case_events` | `20260306010000_admission_refactor` | TBD |
| `soul_credentials` | `20260306010000_admission_refactor` | TBD |
| `trust_ledger_events` | `20260306010000_admission_refactor` | append-only, `block_trust_ledger_mutation` 트리거로 service_role 쓰기 차단 |
| `admission_decision_runs` | `20260307100000_ai_operated_trust_os` | `ENABLE ROW LEVEL SECURITY` 명시 — 정책 내용 확인 필요 |
| `policy_rules` | `20260307100000_ai_operated_trust_os` | TBD |
| `appeals` | `20260307100000_ai_operated_trust_os` | TBD |
| `exception_cases` | `20260307100000_ai_operated_trust_os` | TBD |
| `audit_samples` | `20260307100000_ai_operated_trust_os` | TBD |
| `admission_ops_metrics_daily` | `20260307100000_ai_operated_trust_os` | TBD |
| `admission_ops_anomalies` | `20260307100000_ai_operated_trust_os` | TBD |
| `policy_change_proposals` | `20260307100000_ai_operated_trust_os` | TBD |
| `policy_shadow_runs` | `20260307100000_ai_operated_trust_os` | TBD |

### 추가 SOUL write-path 하드닝 (2026-03-09)
`20260309130000_soul_write_hardening.sql` 로 도입된 변경사항:
- SOUL ledger 는 `append_soul_ledger_internal` RPC 를 통한 append-only 경로만 허용. service_role 도 직접 insert 불가.
- `user_wallets` projection 은 `guard_user_wallets_projection_write` 트리거로 잔액 조작 차단.
- ledger→wallet 일관성 뷰 및 `reconcile_user_wallet_balance` RPC 로 복구 경로 제공.

이 세 항목은 RLS 가 아닌 **트리거/함수 단의 강제** 이므로 기존 매트릭스의 RLS 컬럼이 아닌 별도 "write path" 섹션에 기재하는 것이 정확하다. 다음 리뷰어가 테이블 상단에 "Write path guard" 컬럼을 추가해 이를 표현할 것을 권한다.
