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
