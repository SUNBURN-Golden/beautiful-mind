# DISPATCH RUNBOOK v3

이 문서는 결정론적 실행 계약이다.
Grok은 세션 중에 이 문서를 확장하지 않는다.

NO STANDING ROUTINES. (상시 루틴 없음)
NO POLLING. (폴링 없음)
NO BACKGROUND MONITORING. (백그라운드 모니터링 없음)
NO SECOND SEMANTIC REASONING PASS. (2차 의미론적 추론 없음)

## 1. Project map

PROJECT: SOULBOUND
REPO: `BeautifulMind-JT/beautiful-mind`
DEFAULT_BRANCH: `main`
SLACK_PROJECT: `#soulbound`
SLACK_CONTROL: `#ai-control`
SLACK_DECISIONS: `#ai-decisions`
SLACK_AUDIT: `#ai-audit`

OPERATING_MODE: `MANUAL_ONLY`
AUTOMATED_ACTION_ADAPTER: `MECHANICAL`
GROK_EVENT_OVERRIDES: `NONE`

DEFAULT_EXECUTION_CLASS: `DEVIN_STANDARD`
DEFAULT_AUDIT_FLOOR: `A1`
REVIEW_POLICY: `REQUIRED_NON_A0`
REVIEWER_LANE_ID: `CONFIG_REQUIRED`

TASK_SPEC_POLICY: `REPO_CANON_AND_CANONICAL_ISSUE`
A0_POLICY: `EXPLICIT_AUTHORIZATION_ONLY`
POST_MERGE_POLICY: `NONE_UNLESS_REPO_RULE_REQUIRES`

모든 실질 task는 해당하는 운영/아키텍처 canon을 가리켜야 한다. 관련되는 경우
다음을 포함한다:

- `docs/operations/operating-principles.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/governance/GOVERNANCE_CANON.md`
- `docs/ledger/LEDGER_CANON.md`
- `docs/rls_policy_matrix.md`
- `docs/soulbound_soul_whitepaper_mvp.md`

실질 작업에는 PHASE_OR_LAYER_POINTER가 필수다. 기존 HOLD/re-entry 또는 사람
재승인 요건은 그대로 authoritative하며, dispatch 전에 durable approval
pointer가 있어야 한다.

`docs/legal/terms.md`와 `docs/legal/privacy.md`는 기본적으로 읽기 전용이다.
일반 task만으로 편집 가능해지지 않는다. 법무 텍스트의 의미 변경은 Astra 분석,
명시적 User 결정, 전용 task revision/authority pointer, 그리고 해당
A3/법무 검토 경로를 요구한다.

core/server 격리, RLS/보안, 동의, ledger, reserve/redemption/token, 금융
의미는 보호되는 계약으로 유지된다.

PROJECT MAP 또는 필수 actor/reviewer 설정이 없으면:
`[BLOCKED] Reason: CONTROL_PLANE_NOT_CONFIGURED`

추측하지 않는다.

## 2. 활성화 전제조건

automation을 활성화하기 전에 mechanical layer는 다음을 갖추어야 한다:

- 설정된 USER actor identity;
- 설정된 ASTRA actor identity;
- 설정된 action-adapter identity(Grok은 명시적 override에만 해당);
- 설정된 Devin/provider identity;
- 설정된 독립 reviewer identity/lane;
- TASK_KEY별 single-writer 직렬화;
- canonical-control-record 읽기/쓰기 지원;
- self-event 필터링;
- provider launch reconciliation 또는 명시적 UNKNOWN 처리.

구현은 위 검사 후 독립 exact-SHA audit과 명시적 User 활성화를 받아야 한다.
문서 승인은 automation을 활성화하지 않는다.
그때까지 8절의 수동 프로토콜이 적용된다.

## 3. Raw event intake

허용되는 raw source:

1. 명시적으로 인증된 USER 명령;
2. 설정된 Slack workflow/command;
3. GitHub webhook / GitHub Actions 이벤트;
4. 설정된 worker/reviewer/provider callback;
5. 설정된 ASTRA audit 결과 채널/action.

mechanical layer는 다음을 거절한다:

- 설정되지 않은 actor;
- PASS/DECISION으로 위장한 일반 채팅 텍스트;
- router 자신의 상태 메시지를 새 task trigger로 쓰는 것;
- 하나의 canonical task에 매핑할 수 없는 이벤트;
- 같은 효과로 이미 기록된 중복 delivery ID.

canonical task record가 없는 자유 형식 User 요청은 dispatch 이벤트가 아니라
intake 요청이다. 저비용의 결정론적 intake form/workflow가 먼저 canonical
GitHub task와 task revision을 생성하거나 식별해야 한다.

## 4. 정규화 이벤트 계약

정규화 이벤트만 Grok을 호출할 수 있다.

모든 정규화 이벤트는 다음을 포함한다:

EVENT_ID:
EVENT_TYPE:
SOURCE_ACTOR_ID:
SOURCE_POINTER:
REPO:
TASK_ID:
TASK_REVISION:
CANONICAL_TASK_POINTER:
CONTROL_RECORD_POINTER:
ATTEMPT_ID:
PR_POINTER:
HEAD_SHA:
RUN_OR_RESULT_ID:

해당하지 않는 필드는 명시적 `N/A`로 표기한다. 조용히 생략하지 않는다.

코드를 참조하는 result/gate 이벤트는 HEAD_SHA를 반드시 포함한다.
decision 이벤트는 TASK_REVISION과 durable decision pointer를 반드시 포함한다.

## 5. TASK_KEY와 canonical control record

`TASK_KEY = REPO + TASK_ID`

각 TASK_KEY는 정확히 하나의 canonical control record를 가지며, 이는 canonical
GitHub task/issue의 고정된 machine-owned record pointer에 durable하게
projection된다.

GitHub projection은 durable evidence이며 직렬화 primitive가 아니다.

control record 최소 사실(fact):

- TASK_KEY
- TASK_REVISION
- canonical task/spec pointer
- CANONICAL_SLACK_THREAD (링크 전까지 N/A)
- CONTROL_RECORD_VERSION 및 pending action/delivery ID
- CLAIM_ID
- CLAIM_STATE
- LAUNCH_REQUEST_ID
- LAUNCH_STATE
- ATTEMPT_ID
- OWNER_WORKER
- OWNER_SESSION_ID
- PR_POINTER
- CURRENT_HEAD_SHA
- verification 정책 및 current-head verification fact
- review 정책, REVIEW_REQUEST_ID, REVIEW_LAUNCH_STATE, reviewer lane/session,
  review attempt ID 및 current-head 결과
- audit floor, AUDIT_REQUEST_ID, AUDIT_REQUEST_STATE, 검증된 audit depth,
  감사한 SHA/evidence SHA 및 결과
- 미해결 blocker/decision pointer
- merge SHA
- post-merge 결과/후속 pointer
- 마지막으로 수락한 event ID

상태는 이 사실들에서 도출된다. 도착 순서가 상태를 무조건 덮어쓰지 않는다.

## 6. Task별 직렬화

하나의 control record에 대한 모든 변경은 TASK_KEY를 키로 하는 single-writer
직렬화 primitive 아래에서 일어난다.

같은 task에 대한 두 개의 동시 이벤트가 둘 다 "unowned"를 관측하고 두 writer를
launch해서는 안 된다.

EVENT_ID는 delivery를 dedupe한다.
TASK_KEY 직렬화는 job 소유권을 보호한다.

둘 모두 필수다.

## 7. Claim 및 launch 프로토콜

TASK_KEY 직렬화 아래에서:
- 기존 active owner가 있음: 적격 피드백을 그 owner에게 중계한다. 다른 writer를
  절대 launch하지 않는다.
- 기존 미해결 claim/request가 있음: 그것을 재사용한다. 경쟁 claim을 절대
  만들지 않는다.
- 그 외: CLAIM_ID, 지정 executor, 안정적인 LAUNCH_REQUEST_ID,
  LAUNCH_STATE=NOT_STARTED, durable pending dispatch action을 함께 persist한다.

외부 launch 전에 그 action을 원자적으로 소비하고 LAUNCH_STATE=SUBMITTING을
persist한다. 그 권한을 보유한 executor만 전송할 수 있다.
따라서 NOT_STARTED는 어떤 전송도 승인되지 않았음을 증명한다. 같은 request만
재개한다.
crash 후의 SUBMITTING은 전송되었을 가능성이 있다: reconcile하거나 UNKNOWN으로
표시한다. 절대 자동으로 다시 launch하지 않는다. timeout/claim 만료만으로
takeover가 승인되지 않는다.

provider가 지원하면 LAUNCH_REQUEST_ID를 idempotency key로 사용한다.
확인된 수신은 CONFIRMED + OWNER_SESSION_ID + worker/attempt를 기록한다.
provider가 세션 없음을 증명하면 FAILED_PRESTART가 허용된다. 설정된 retry
이벤트는 이전 executor가 fence된 후에만 같은 task를 재승인할 수 있다.
모호한 결과는 UNKNOWN을 기록하고, provider evidence 또는 명시적 User 해결이
안전한 다음 단계를 증명할 때까지 relaunch를 차단한다. Slack 응답 손실은
확인된 GitHub owner record를 절대 되돌리지 않는다.

상태 변경과 pending-action persist는 직렬화 저장소에서 원자적이어야 한다.
GitHub는 durable projection을 보유한다. projection 실패는 reconcile될 때까지
추가 launch를 차단한다. pending NOT_STARTED action은 polling이 아니라 명시적
recovery 이벤트로 재개할 수 있다. 이는 외부 실행의 exactly-once를 주장하는
것이 아니다.

## 8. 수동 dispatch 및 장애

활성화 gate를 통과하기 전까지 OPERATING_MODE=MANUAL_ONLY다. 모든 자동
dispatcher는 비활성이다. 이 모드에서 User가 유일한 launch executor이자
control-record writer다. 댓글만으로는 동시성 lock이 아니다.

User -> Devin 직접 dispatch 전:
1. canonical task/revision과 기존 owner/request를 식별한다;
2. active owner가 있으면 재사용한다. 미해결 SUBMITTING/UNKNOWN request가 하나라도
   있으면 차단한다;
3. CLAIM_ID/LAUNCH_REQUEST_ID를 durable하게 예약하고 launch 전에 SUBMITTING을
   기록한다;
4. task pointer/revision만 전송하고 결과 session ID를 기록한다.
GitHub 예약을 기록할 수 없으면 launch하지 않는다. 응답 손실은 두 번째 세션이
아니라 reconciliation을 요구한다. 수동 claim/전송이 미해결인 동안 automation을
활성화하지 않는다.

자동 모드에서 수동 dispatch는 직렬화된 MANUAL_CLAIM_ALLOWED action과 같은
launch 프로토콜을 요구한다. 장애는 소유권을 우회하지 않는다.
caller가 Grok 쿼터 실패를 직접 기록·projection한다. 대체 AI dispatcher는
지정되지 않는다. 복구에는 명시적 이벤트/User 행동이 필요하다.

## 9. Task-envelope 사용

Grok은 canonical task record에서 `TASKS/TEMPLATE.md` 필드를 읽는다.

Grok은 다음을 하지 않는다:

- 두 번째 task specification 작성;
- 목표의 paraphrase;
- 누락된 계약/invariant 추론;
- 의미론적 읽기로 execution class 선택;
- 의미론적 읽기로 audit depth 선택.

canonical task에 EXECUTION_CLASS가 없으면:
`DEVIN_STANDARD`를 사용한다.

A0/CHEAP는 명시적 A0 승인을 요구한다.

## 10. Writer 자율성과 피드백

이미 승인된 task에는 routine Astra preflight, plan approval, 진행 리뷰가
필요하지 않다. Devin은 승인된 계약 안에서 조사하고 구현을 선택한다. CI
실패에 임의의 2회 시도 제한은 없다.

일반 writer 피드백은 항상 같은 OWNER_SESSION_ID로 돌아간다.

CI/review/audit finding은 새 writer를 만들지 않는다.

Devin은 승인된 경계 안의 일반 구현/디버그/테스트 결정을 소유한다.

`STALLED`는 Devin/provider가 명시적으로 보고해야 한다.
`BUDGET_LIMIT_REACHED`는 설정된 mechanical cost guard만 emit할 수 있다.

Grok은 두 조건 중 어느 것도 추론하지 않는다.

## 11. HEAD 및 task-revision guard

code-result 이벤트는 그 HEAD_SHA가 해당 task/PR의 CURRENT_HEAD_SHA와 같을
때만 수락된다. 예외는 CURRENT_HEAD_SHA를 전진시키는 수락된 `HEAD_CHANGED`
이벤트다.

HEAD_CHANGED 수락 시:

- CURRENT_HEAD_SHA를 새 head로 설정;
- current-head CI/verification fact 삭제;
- current-head review fact 삭제;
- current-head audit fact 삭제;
- 과거 evidence는 이력으로만 보존.

이전 HEAD에 대한 늦은 결과는 stale evidence로 기록되며 gate를 전진시키지
않는다.

consequential User 결정이 task 범위/계약을 변경하면:
- 결정을 persist;
- TASK_REVISION 증가;
- 저장소 정책이 요구하는 대로 authoritative task/spec pointer 갱신;
- 해당하는 경우 이전 task revision에 묶인 승인 무효화;
- 그 후에만 같은 owner를 재개하거나 명시적으로 승인된 새 attempt를 시작.

HEAD_CHANGED는 task 직렬화 아래에서 live PR head를 읽은 뒤에만 수락된다.
지연된 이벤트는 이전 head를 복원할 수 없다. PR_OPEN은 DEVIN_DONE이 도착하기
전에 인증된 owner의 PR을 바인딩할 수 있다. 모든 result 이벤트는 SHA뿐 아니라
TASK_REVISION과 현재 request/run attempt에도 일치해야 한다.
merge된/종결된 task는 늦은 pre-merge 이벤트로 writer를 재개할 수 없다.
post-merge verification은 PR HEAD가 아니라 MERGE_SHA와 post-merge phase를
사용한다.

## 12. Verification gate

단일 check 성공은 절대 CI_GATE_PASS와 동등하지 않다.

mechanical layer는 CURRENT_HEAD_SHA에 대한 전체 프로젝트 정책을 집계한다.

SOULBOUND verification 정책은 `CI_REQUIRED`다.

각 CURRENT_HEAD_SHA에 대해 GitHub Actions workflow
`Remote E2E Stability`가 성공적으로 완료되어야 한다.

이전 SHA의 성공은 stale이다. CI 성공은 기존의 의미론적 HOLD/phase/re-entry
gate를 무효화하지 않는다.

수락되는 verification fact는 exact HEAD/evidence SHA와 run ID 또는 로컬
evidence pointer를 포함해야 한다.

CI/verification 실패:
- current-head verification fact 갱신;
- 새 gate 상태에 대한 정규화 실패 이벤트 하나 emit;
- 설정된 adapter가 exact failure pointer를 같은 owner에게 중계;
- Grok은 디버깅하지 않음;
- 동일한 raw check 이벤트의 반복은 gate 상태가 실질적으로 바뀌지 않는 한
  Grok을 반복 호출하지 않음.

## 13. 독립 review gate

reviewer 전송은 writer launch와 같은 NOT_STARTED -> SUBMITTING ->
CONFIRMED/UNKNOWN 프로토콜을 사용하며, REVIEW_REQUEST_ID/REVIEW_ATTEMPT_ID를
키로 한다. pending action을 request와 함께 persist한다. crash는 재전송
허가가 아니다.

review dispatch 자체도 idempotent하고 직렬화된다.

TASK_KEY 직렬화 아래에서, 현재 task revision + HEAD/evidence SHA에 대한
review request를 emit하기 전에:

1. 일치하는 review PASS/FAIL이 이미 있으면 다른 reviewer를 launch하지 않는다;
2. 일치하는 REVIEW_REQUEST_ID/session이 이미 있으면 재사용한다;
3. 그 외에는 안정적인 REVIEW_REQUEST_ID와 REVIEW_ATTEMPT_ID를 생성한다;
4. REVIEW_LAUNCH_STATE=`NOT_STARTED`로 설정한다;
5. control record를 persist한다;
6. 정확히 하나의 `REVIEW_DISPATCH_ALLOWED`를 emit한다.

설정된 adapter는 REVIEW_REQUEST_ID를 키로 하는 review-launch receipt를
반환한다.

확인된 reviewer launch는 reviewer session과 REVIEW_LAUNCH_STATE=`CONFIRMED`를
기록한다.

reviewer launch가 성공했을 수 있으나 결과가 모호하면:
REVIEW_LAUNCH_STATE=`UNKNOWN`.
다른 reviewer를 자동 launch하지 않는다. 기존 request를 reconcile하거나 User
해결을 요구한다.

이 컨트롤 플레인의 모든 비-A0 실질 작업은 Astra audit 전에 독립 read-only
review를 요구한다.

verification gate 성공 후, current-head review가 없으면 mechanical layer가
`REVIEW_DISPATCH_ALLOWED`를 emit한다.

설정된 adapter는 설정된 REVIEWER_LANE_ID를 read-only 모드로 launch하고
종료한다.

reviewer lane이 사용 불가하면:

derived state = `BLOCKED_REVIEW_LANE`

review를 조용히 건너뛰지 않는다.
User는 다른 독립 read-only reviewer를 설정/지정할 수 있다. reviewer는 writer가
되어서는 안 된다.

review 결과는 다음이 모두 충족될 때만 수락된다:

- source actor가 설정된 reviewer;
- TASK_REVISION 일치;
- HEAD_SHA/evidence SHA가 현재 revision과 일치;
- reviewer session/attempt ID가 dispatch된 review와 일치.

Review FAIL:
exact finding을 같은 writer에게 중계한다.
새 HEAD는 이전 review를 무효화한다.

Review PASS:
mechanical layer가 current-head pass를 기록하고 `AUDIT_REQUIRED`를 emit한다.

## 14. Astra audit gate

audit-request 전달도 task revision + 현재 HEAD/evidence SHA로 직렬화된다.

`AUDIT_REQUIRED`를 emit하기 전에 mechanical layer는:

1. 그 exact revision/SHA에 대한 기존 수락 audit 결과만 재사용한다;
2. 일치하는 AUDIT_REQUEST_ID가 이미 REQUESTED/DELIVERED/UNKNOWN이면 두 번째
   request를 만들지 않는다;
3. 그 외에는 안정적인 AUDIT_REQUEST_ID를 생성하고
   AUDIT_REQUEST_STATE=`REQUESTED`로 설정하고, pending delivery를 원자적으로
   persist한 뒤 request 하나를 emit한다. 전송 전에 SUBMITTING을 persist한다.
   crash나 응답 손실은 reconcile될 때까지 재전송을 차단한다. SUBMITTING을
   dedupe에 포함한다.

audit-request 전달 결과가 모호하면:
AUDIT_REQUEST_STATE=`UNKNOWN`.
무턱대고 다시 게시하지 않는다. 기존 request를 reconcile하거나 User 행동을
요구한다.

설정된 adapter는 정규화된 `AUDIT_REQUIRED`에만 audit packet을 `#ai-audit`에
보낸다.

Packet 필드:

AUDIT_REQUEST_ID:
Project:
Task:
Task revision:
Repository:
PR/evidence pointer:
Base SHA:
Current HEAD/evidence SHA:
Objective/task-spec pointers:
Authoritative document pointers:
Verification facts:
Independent review facts:
Worker-reported touched areas:
Worker-reported contract-change flag:
Audit floor:

Astra는 실제 diff/evidence와 authoritative 문서를 독립적으로 읽는다.

수락 auditor(기본은 Astra)는 다음을 반환해야 한다:

AUDIT_REQUEST_ID:
AUDIT_RESULT: PASS | PASS_WITH_NOTES | FAIL | DECISION_REQUIRED
AUDITOR_IDENTITY_OR_SESSION:
AUDITOR_DESIGNATION_POINTER: (auditor가 Astra가 아닐 때 필수)
AUDITED_TASK_REVISION:
AUDITED_HEAD_OR_EVIDENCE_SHA:
VERIFIED_AUDIT_DEPTH:
VERIFIED_TOUCHED_AREAS:
VERIFIED_CONTRACT_CHANGE_REQUIRED:
FINDING_POINTERS:

mechanical layer는 수락 auditor로부터의 audit 결과만, 그리고 현재 task
revision과 현재 head/evidence SHA에 대한 것만 수락한다.

수락 auditor는:

- 설정된 ASTRA actor. 단, Astra가 그 변경을 작성·수정한 경우(author
  conflict)는 제외; 또는
- author conflict 하에서, 설정된 User decision 이벤트가 지정한 독립 auditor.
  그 durable GitHub 지정 pointer는 이 task/PR, TASK_REVISION, 감사 범위를
  명시해야 하며, 지정 auditor는 작성에 참여하지 않았어야 한다.

변경에 참여한 writer/session의 self-review는 거절된다.
Grok이나 작성자는 auditor를 지정하거나 audit floor를 낮출 수 없다.
지정 auditor의 결과는 AUDITOR_IDENTITY_OR_SESSION과
AUDITOR_DESIGNATION_POINTER와 함께 기록되며, Astra 결과로 기록되지 않는다.
HEAD 변경은 누가 발급했든 이전 PASS를 무효화한다.

Astra FAIL:
finding을 변경 없이 같은 writer에게 중계한다.

Astra DECISION_REQUIRED:
blocker를 기록하고 정규화 decision request를 emit한다.

audit 결과는 미결 AUDIT_REQUEST_ID와도 일치해야 한다.
re-audit은 이전 감사 SHA와의 delta 및 미해결 finding에서 시작해, 영향 받는
의존성/계약을 확인한 뒤 현재 SHA에 대한 새 결과를 발급한다.
writer의 evidence index는 navigation이며 절대 독립 증명이 아니다.

## 15. Consequential decision gate

decision request는 다음을 포함한다:

- TASK_ID / TASK_REVISION;
- 차단 질문;
- 현재 authoritative 규칙;
- exact evidence pointer;
- worker/Astra가 식별한 선택지(있는 경우).

Grok은 선호 선택지를 추가하지 않는다.

설정된 User decision 이벤트만 선택을 승인할 수 있다.

mechanical layer가 `DECISION_RECORDED`를 emit하기 전에 결정은
GitHub/ADR/task authority에 persist되어야 한다.

일반 Slack 텍스트는 decision 이벤트가 아니다.

## 16. A0 최종 자격 검사

A0가 완료되기 전에 mechanical layer는 task envelope의 명시적 A0 승인과 경로
계약을 검사한다:

- A0_AUTHORIZATION_POINTER 존재;
- A0_CHANGE_KIND가 허용된 A0 enum 값 중 하나;
- 실제 변경 경로가 A0_ALLOWED_PATHS의 부분집합;
- A0_FORBIDDEN_PATHS와 일치하는 실제 변경 경로 없음;
- 저장소 locked/sensitive 규칙이 여전히 충족됨.

Grok은 이 경로 목록을 생성하거나 확대하지 않는다.

A0 자격 검사 실패 시:
A1으로 승격 → 독립 review → Astra audit.

A0는 저장소 고유의 evidence/bookkeeping 규칙을 절대 우회하지 않는다.

경로 검사만으로 A0 의미가 입증되지는 않는다. 최종 A0 자격은 exact
revision/HEAD에 대한 typo/format-only 변경의 인증된 User attestation, 또는
승인된 결정론적 transform verifier도 요구한다. 그렇지 않으면 A1으로
승격한다. 자격을 갖춘 A0에 한해, 저장소 규칙이 요구하지 않는 한 Astra
audit과 별도 review는 N/A다. 18절의 audit/depth predicate는 A1+에
적용된다. 모든 verification/blocker/merge gate는 여전히 적용된다.

## 17. Derived state

상태는 도착 순서가 아니라 control-record fact에서 계산된다.

허용되는 derived state:

RECEIVED
CLAIMED
LAUNCH_UNKNOWN
RUNNING
BLOCKED
STALLED
BUDGET_BLOCKED
PR_OPEN
VERIFICATION_FAILED
READY_FOR_REVIEW
REVIEW_RUNNING
REVIEW_FAILED
BLOCKED_REVIEW_LANE
READY_FOR_AUDIT
AUDIT_RUNNING
AUDIT_FAILED
DECISION_REQUIRED
READY_FOR_MERGE
MERGED_POST_VERIFY
POST_MERGE_FAILED
DONE
DONE_NO_CHANGE

주요 도출 규칙:

- 미해결 decision/blocker는 진행 상태보다 우선한다;
- LAUNCH_UNKNOWN은 새 launch를 차단한다;
- verification/review/audit fact는 현재 task revision과 head에 일치해야 한다;
- READY_FOR_MERGE는 계산되며, 임의의 텍스트로 절대 수락되지 않는다.

## 18. READY_FOR_MERGE predicate

PR deliverable의 경우 READY_FOR_MERGE는 다음이 모두 참일 때만 참이다:

- PR이 존재하고 open 상태;
- CURRENT_HEAD_SHA가 PR 현재 head와 동일;
- task revision이 현재 것;
- 미해결 blocker/decision 없음;
- CURRENT_HEAD_SHA에 대해 verification gate 충족;
- 필수 독립 review PASS가 CURRENT_HEAD_SHA와 일치;
- 수락 auditor(14절; Astra, 또는 author conflict 시 User가 지정한 독립
  auditor)의 PASS 또는 PASS_WITH_NOTES가 현재 task revision과 HEAD에 일치;
- VERIFIED_AUDIT_DEPTH가 프로젝트/audit floor와 실제 검증된 touched area를
  충족;
- VERIFIED_CONTRACT_CHANGE_REQUIRED가 NO이거나, 필요한 User 결정이 durable하게
  기록되고 현재 task revision에 반영됨;
- 프로젝트 고유 merge 전제조건 충족.

merge 결정은 여전히 User가 한다.

## 19. No-change / 비코드 완료

writer는 DELIVERABLE_MODE가 허용할 때만 NO_CHANGE를 반환할 수 있다.

A1+ NO_CHANGE의 경우:
- exact evidence/base SHA 제공;
- finding/evidence에 대한 필수 독립 review 수행;
- Astra가 그 evidence SHA에 대해 no-change 결론을 audit;
- PASS는 `DONE_NO_CHANGE`를 도출할 수 있음;
- merge를 만들어내지 않음.

NON_CODE_EVIDENCE는 프로젝트 고유의 승인/evidence gate를 따른다. 엔지니어링
PR gate는 production/법무/콘텐츠 승인을 대체하지 않는다.

## 20. Merge 및 DONE

인증된 `PR_MERGED` 시:

이 컨트롤 플레인은 일반적인 post-merge verification을 추가하지 않는다.
기존 phase/closeout/re-entry 요건은 그대로 authoritative하다. 해당 요건이
없으면 인증된 PR_MERGED가 DONE을 도출할 수 있다.

post-merge verification이 없는 프로젝트에서는 올바르게 기록된 merge가 DONE을
도출할 수 있다.

Grok은 절대 merge하지 않는다.

## 21. 고정 action 소유권

ACTION_ADAPTER는 아래 이벤트별로 설정되며 Grok이 선택하지 않는다.
automation은 모든 행에서 MECHANICAL을 기본값으로 한다. User가 승인한 명시적
매핑은 제한된 launch/relay action에 GROK을 선택할 수 있다. 둘 다는 불가하다.
어떤 설정도 오류 시 다른 AI로 조용히 fallback하지 않는다.

| 정규화 이벤트 | Action | 기본 adapter |
|---|---|---|
| DISPATCH_ALLOWED | 7절에 따라 지정 owner launch; receipt 기록 | MECHANICAL |
| WRITER_FEEDBACK_REQUIRED | 기존 owner에게 exact pointer | MECHANICAL |
| REVIEW_DISPATCH_ALLOWED | 설정된 read-only reviewer launch | MECHANICAL |
| AUDIT_REQUIRED | #ai-audit에 exact audit packet | MECHANICAL |
| DECISION_REQUIRED | #ai-decisions에 exact decision packet | MECHANICAL |
| BLOCKED_STATUS | durable blocker + 짧은 상태/사람 행동 | MECHANICAL |
| READY_FOR_MERGE | project-thread 알림만 | MECHANICAL |
| DONE / DONE_NO_CHANGE | project-thread 최종 pointer | MECHANICAL |

GROK으로 명시적으로 매핑된 경우: 정규화 이벤트 하나, 승인된 action 하나,
receipt 하나, 세션 종료. 상태 변경/집계는 mechanical에 남는다.
MANUAL_ONLY 모드에서는 User가 같은 durable fact로 전달을 수행한다.

## 22. Slack

`#ai-control` — 명시적 컨트롤 플레인 명령/상태
`#ai-decisions` — 인증된 User/Astra 결정 작업
`#ai-audit` — 인증된 Astra audit 요청/결과
`#soulbound` — 프로젝트 task/상태 cockpit

task 하나 → canonical thread 하나. GitHub task와 Slack thread는 양방향으로
링크한다.
프로젝트 상태는 CONTROL_RECORD_VERSION을 키로 하는 durable control record의
projection이다. 오래된/반복된 projection은 억제된다.
필드: task/revision, state, owner/session, PR/HEAD, verification/review/audit,
blocker pointer, 필요한 사람 행동. 긴 맥락은 GitHub pointer 뒤에 둔다.
Astra의 주의는 #ai-decisions/#ai-audit에 있으며, 프로젝트 채널 firehose가
아니다.

Grok을 모든 Slack 메시지에 구독시키지 않는다.
명시적 명령이나 정규화 workflow 이벤트만 Grok을 호출한다.

Slack의 결정/audit은 해당 GitHub control record/decision/audit pointer가
기록되기 전까지 durable하지 않다.

## 23. 자격증명

목표 논리 권한:

- Grok router: repo/PR/check 읽기 + 좁게 한정된 task comment/status 중계;
  source write, PR 생성, admin, secrets, delete, merge 불가.
- Devin owner: 배정된 repo + task branch/PR만; merge/admin 불가.
- Cheap writer: 명시적으로 배정된 branch/task만.
- Reviewer: repo/PR 읽기 + finding comment만; source write 불가.
- Astra: repo/PR 읽기 + audit/decision evidence 쓰기만; source write/merge 불가.
- Mechanical layer: 이벤트 검증 + control-record/claim/status 변경만;
  source write/merge 불가.
- User: 최종 권한.

기술적 강제는 이 문서와 별개이며, 최소권한이 강제된다고 주장하기 전에 검증해야
한다.

## 24. 비용 규율

AI 호출 전에 raw 이벤트를 dedupe하고 CI matrix를 집계한다.
변경되지 않은 상태는 또 다른 상태, review, audit 요청을 만들지 않는다.
Astra는 결정 질문이나 gate-ready evidence를 받으며, 진행 잡담을 받지 않는다.
Devin은 저장소 조사와 전체 test/fix 루프를 소유한다.
polling, 상시 세션, transcript 감시는 없다.
완료 task별 agent 비용, Astra 사용량, User 개입, audit 재작업을 측정한다.
사용 불가한 사용량 지표는 unknown으로 보고한다.
