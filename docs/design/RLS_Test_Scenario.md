# SoulBound RLS 격리 & Audit Log 테스트 시나리오

Agent B (Security/DB) 산출물로서, 계정 간 데이터 격리 및 Audit Log의 무결성을 검증하기 위한 테스트 시나리오입니다.

## 1. 계정 간 RLS 데이터 격리 (Data Isolation) 테스트
**목표:** 계정 A가 계정 B의 데이터를 조회, 수정, 삭제할 수 없는지 검증합니다.

### 시나리오 1.1: 프로필(profiles) 조회 보안 테스트
1. **준비:** User A (UID: `uuid-a`) 와 User B (UID: `uuid-b`) 로 로그인하여 각각 세션을 발급받습니다.
2. **실행 (User A):** `SELECT * FROM profiles;` 요청 호출
3. **기대 결과:** User A의 데이터만 반환되며, `uuid-b` 레코드는 반환되지 않음.
4. **실행 (User A):** `SELECT * FROM profiles WHERE id = 'uuid-b';` 명시적 요청
5. **기대 결과:** 빈 배열(`[]`) 또는 레코드 없음 에러 반환 (RLS 차단).

### 시나리오 1.2: 민감 정보(contracts, consents) 변조 테스트
1. **실행 (User A):** 
   ```sql
   UPDATE consents SET is_granted = true WHERE user_id = 'uuid-b';
   ```
2. **기대 결과:** RLS 정책(`USING (auth.uid() = user_id)`)에 막혀 0 rows updated.
3. **실행 (User A):**
   ```sql
   INSERT INTO contracts (user_id, signature_base64) VALUES ('uuid-b', 'dummy_base64');
   ```
4. **기대 결과:** RLS 정책(`WITH CHECK (auth.uid() = user_id)`) 위반으로 403 Forbidden Error (new row violates row-level security policy).

---

## 2. Audit Log (INSERT-ONLY) 무결성 테스트
**목표:** 주요 테이블의 C/U/D 트랜잭션 시 원본 데이터가 조작 없이 안전하게 로깅되며, 유저가 로그를 임의로 조작/조회할 수 없는지 검증합니다.

### 시나리오 2.1: Audit 추적 (C/U/D 자동 기록)
1. **실행 (User A):** `consents` 테이블에 'OSINT' 권한 동의(`is_granted: true`) Insert.
2. **검증 (Admin Role):** `audit_logs` 테이블 조회 시, `action = 'INSERT'`, `table_name = 'consents'`, `changed_by = 'uuid-a'` 로깅 확인.
3. **실행 (User A):** 'OSINT' 권한 동의를 `false` 로 Update.
4. **검증 (Admin Role):** `audit_logs` 테이블 조회 시, `action = 'UPDATE'`, `old_data.is_granted = true`, `new_data.is_granted = false` 로깅 확인.

### 시나리오 2.2: 로그 위변조 차단 (Immutability)
1. **실행 (User A):** 본인의 로그 탈취 목적 `SELECT * FROM audit_logs;` 수행.
2. **기대 결과:** 빈 배열 반환. (SELECT 정책 미수립으로 기본 Deny All).
3. **실행 (User A):** 본인의 흔적 인멸 목적 `DELETE FROM audit_logs WHERE changed_by = 'uuid-a';` 수행.
4. **기대 결과:** RLS DELETE 거부 (0 rows deleted).
