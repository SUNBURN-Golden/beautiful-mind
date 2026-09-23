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

DEFAULT_EXECUTION_CLASS: `BUILDER_STANDARD`
DEFAULT_BUILDER_ID: `CONFIG_REQUIRED`
DEFAULT_AUDIT_FLOOR: `A1`
DEFAULT_ASTRA_GATE: `NONE`
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
- 활성화된 각 builder provider(DEVIN / GROK_BUILD / GLM 중 해당 항목)의
  configured identity/adapter;
- 설정된 독립 reviewer identity/lane;
- TASK_KEY별 single-writer 직렬화;
- canonical-control-record 읽기/쓰기 지원;
- self-event 필터링;
- builder/reviewer provider launch reconciliation 또는 명시적 UNKNOWN 처리.

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

외부 action adapter는 정규화 이벤트만 호출할 수 있다. Grok은 event bus가 아니며
결정론적 workflow transition의 필수 경유지가 아니다.

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

해당하지 않는 field는 N/A로 명시한다.
code result/gate event는 HEAD_SHA를, decision event는 TASK_REVISION과 durable
decision pointer를 포함한다.

Grok은 인증된 명시적 User command 또는 normalized one-shot relay만 받을 수 있다.
builder/reviewer 선택은 canonical config에서 오며 Grok의 의미론적 판단이 아니다.

## 5. TASK_KEY와 canonical control record

TASK_KEY = REPO + TASK_ID

각 TASK_KEY는 정확히 하나의 canonical control record를 가지며, 이는 canonical
GitHub task/issue의 고정된 machine-owned record pointer에 durable하게
projection된다.

GitHub projection은 durable evidence이며 직렬화 primitive가 아니다.

control record 최소 fact:

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
- OWNER_WORKER / BUILDER_ID
- OWNER_SESSION_ID
- PR_POINTER
- CURRENT_HEAD_SHA
- verification 정책 및 current-head verification fact
- review policy, configured audit floor, REVIEW_REQUEST_ID, REVIEW_LAUNCH_STATE,
  reviewer lane/session, review attempt ID, VERIFIED_REVIEW_DEPTH,
  VERIFIED_REQUIRED_DEPTH, EFFECTIVE_AUDIT_FLOOR, verified touched areas,
  contract-change flag 및 current-head result
- ASTRA_GATE, AUDIT_REQUEST_ID, AUDIT_ATTEMPT_ID, AUDIT_REQUEST_STATE,
  ACCEPTED_AUDITOR_IDENTITY, AUDITOR_DESIGNATION_POINTER, verified audit depth,
  audited SHA/evidence SHA 및 Astra gate result
- unresolved blocker/decision pointer
- merge SHA
- post-merge result/follow-up pointer
- last accepted event ID

상태는 이 fact에서 도출된다. 도착 순서가 상태를 무조건 덮어쓰지 않는다.

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

activation gate 전에는 OPERATING_MODE=MANUAL_ONLY다. 자동 dispatcher는 모두
비활성이고 User가 유일한 launch executor/control-record writer다.

User → 지정 builder 직접 dispatch 전:
1. canonical task/revision, configured BUILDER_ID, 기존 owner/request 식별;
2. active owner 재사용; unresolved SUBMITTING/UNKNOWN이 있으면 차단;
3. CLAIM_ID/LAUNCH_REQUEST_ID를 durable하게 예약하고 launch 전 SUBMITTING 기록;
4. task pointer/revision만 configured builder adapter에 전달하고 provider/session ID 기록.

GitHub 예약을 기록할 수 없으면 launch하지 않는다. 응답 손실은 second session이
아니라 reconciliation을 요구한다.

자동 모드의 manual dispatch도 serialized MANUAL_CLAIM_ALLOWED와 같은 launch
protocol을 사용한다. 장애는 ownership을 우회하지 않는다.

Grok 장애는 workflow 장애가 아니다. 동일 fixed mechanical command를 다른 인증
caller가 호출할 수 있다. 배정 builder provider 장애는 blocker로 기록하며 다른
builder를 조용히 선택하지 않는다. reassignment는 prior attempt fencing/reconciliation
후 durable authorized control update를 요구한다.

## 9. Task-envelope 사용

mechanical layer가 canonical task record의 TASKS/TEMPLATE.md field를 읽는다.
Grok은 pointer를 relay할 수 있지만 task를 의미론적으로 해석하지 않는다.

dispatch path의 어떤 actor도 두 번째 task spec을 만들거나, 목표를 새 authority로
paraphrase하거나, 누락 contract/invariant를 추론하거나, execution class,
builder, reviewer, audit depth, Astra gate를 의미론적으로 선택하지 않는다.

EXECUTION_CLASS가 없으면 BUILDER_STANDARD를 사용한다.
BUILDER_STANDARD인데 BUILDER_ID가 없으면 BLOCKED다.
A0/CHEAP는 명시 A0 승인을 요구한다.

## 10. Writer 자율성과 피드백

이미 승인된 task에는 routine Astra preflight, plan approval, progress review가
필요 없다. 배정 builder가 승인 contract 안에서 조사하고 일반 구현 세부사항을
선택한다. CI failure에 임의의 두 번 시도 cutoff는 없다.

일반 writer feedback은 항상 같은 OWNER_SESSION_ID로 돌아간다.
CI/review/Astra-gate finding은 새 writer를 만들지 않는다.
배정 builder가 승인 경계 안의 일반 구현/디버그/test 결정을 소유한다.

STALLED는 builder/provider가 명시적으로 보고해야 한다.
BUDGET_LIMIT_REACHED는 configured mechanical cost guard만 emit한다.
Grok은 둘 다 추론하지 않는다.

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

review launch는 writer와 같은 NOT_STARTED → SUBMITTING → CONFIRMED/UNKNOWN
idempotent protocol을 사용하고 REVIEW_REQUEST_ID/REVIEW_ATTEMPT_ID에 고정한다.

현재 task revision + HEAD/evidence SHA에 matching accepted result/request가 있으면
재사용한다. 없으면 stable IDs를 만들고 NOT_STARTED를 persist한 뒤 정확히 하나의
REVIEW_DISPATCH_ALLOWED를 emit한다.

configured adapter는 REVIEWER_LANE_ID를 read-only로 launch한다. reviewer는
reviewed change를 작성·수정하지 않았어야 한다. peer builder도 별도 non-author
read-only session이고 해당 task write role이 없을 때만 가능하다.

ambiguous launch는 REVIEW_LAUNCH_STATE=UNKNOWN이며 자동 relaunch를 금지한다.

비-A0 substantive work는 더 엄격한 저장소 규칙이 없는 한 독립 read-only review를
요구한다.

exact revision/head에 대해 reviewer는 다음을 반환한다:

REVIEW_RESULT: PASS | PASS_WITH_NOTES | FAIL | DECISION_REQUIRED
REVIEWER_IDENTITY_OR_SESSION:
REVIEWED_TASK_REVISION:
REVIEWED_HEAD_OR_EVIDENCE_SHA:
VERIFIED_REVIEW_DEPTH:
VERIFIED_REQUIRED_DEPTH: A1 | A2 | A3
VERIFIED_TOUCHED_AREAS:
VERIFIED_CONTRACT_CHANGE_REQUIRED:
FINDING_POINTERS:

VERIFIED_REQUIRED_DEPTH는 task에 미리 적힌 AUDIT_FLOOR와 별개로, 실제 diff와
authoritative 저장소 규칙이 요구하는 최소 review/audit depth를 reviewer가
의미론적으로 판정한 값이다.

current-head review를 수락한 뒤 mechanical layer는:

EFFECTIVE_AUDIT_FLOOR =
  max(configured AUDIT_FLOOR, VERIFIED_REQUIRED_DEPTH)

를 A0 < A1 < A2 < A3 순서로 계산한다.

EFFECTIVE_AUDIT_FLOOR=A3이면 merge predicate를 다시 계산하기 전에 current
task revision/current HEAD의 ASTRA_GATE를 ARCHITECTURE로 강제한다. predeclared
NONE/MILESTONE가 이 승격을 막을 수 없다. 저장소 규칙이 더 강한 gate를 요구하면
그 gate를 유지한다.

새 relevant HEAD는 prior review와 그 review에서 도출된 EFFECTIVE_AUDIT_FLOOR를
무효화한다.

FAIL은 exact finding을 같은 writer에게 돌려보낸다.
DECISION_REQUIRED 또는 VERIFIED_CONTRACT_CHANGE_REQUIRED=YES면 merge를 막고
required Astra/decision path로 진입한다.

PASS/PASS_WITH_NOTES이고 consequential contract change가 없으면:
- EFFECTIVE_AUDIT_FLOOR=A3 또는 다른 Astra gate가 필요하면 AUDIT_REQUIRED emit;
- 아니면 Astra 호출 없이 READY_FOR_MERGE predicate를 다시 계산한다.

## 14. Astra gate

Astra는 routine A1/A2의 기본 reviewer가 아니다.

이 section은 다음 중 하나일 때만 적용한다:

- EFFECTIVE_AUDIT_FLOOR=A3;
- ASTRA_GATE=MILESTONE | ARCHITECTURE | RELEASE;
- architecture exception/consequential contract change가 Astra 분석을 요구;
- 저장소 authoritative rule이 Astra를 명시적으로 요구.

EFFECTIVE_AUDIT_FLOOR=A3는 current task revision/current HEAD의
ASTRA_GATE=ARCHITECTURE를 의미한다.

Astra request delivery는 writer/reviewer launch와 같은 fail-closed send discipline을
사용하며 task revision + current HEAD/evidence SHA 또는 명시된 milestone/release
evidence identity로 직렬화한다.

각 request는 생성 시 다음에 고정된다:

AUDIT_REQUEST_ID
AUDIT_ATTEMPT_ID
ACCEPTED_AUDITOR_IDENTITY
AUDITOR_DESIGNATION_POINTER (configured Astra면 N/A)
AUDITED_TASK_REVISION_OR_MILESTONE
AUDITED_HEAD_OR_EVIDENCE_SHA

AUDIT_REQUIRED emit 전 mechanical layer는:

1. request identity, accepted auditor/designation, task/milestone identity,
   exact HEAD/evidence SHA가 모두 일치하는 accepted result만 재사용;
2. matching AUDIT_REQUEST_ID/AUDIT_ATTEMPT_ID가
   NOT_STARTED/SUBMITTING/CONFIRMED/UNKNOWN이면 새 request를 만들지 않고 기존
   request를 reuse/reconcile;
   NOT_STARTED이면 기존 pending action만 resume한다. 다른 request/attempt를
   만들거나 다른 delivery를 enqueue하지 않는다;
3. 그 외에는 stable AUDIT_REQUEST_ID/AUDIT_ATTEMPT_ID를 만들고 accepted auditor
   identity/designation을 bind하고 AUDIT_REQUEST_STATE=NOT_STARTED로 설정한 뒤
   pending action을 atomic persist;
4. 외부 send 직전에 pending action을 atomic consume하고
   AUDIT_REQUEST_STATE=SUBMITTING을 persist;
5. 그 consumed action을 가진 executor만 request를 send;
6. confirmed receipt는 AUDIT_REQUEST_STATE=CONFIRMED로 기록.

SUBMITTING 이후 crash/response loss가 발생하면 potentially sent로 취급한다.
receipt가 없다는 이유만으로 새 request를 만들거나 resend하지 않는다. 결과를
증명할 수 없으면 UNKNOWN으로 두고 reconciliation 또는 explicit User resolution을
요구한다.

packet은 exact task/milestone identity, revision, repo, PR/evidence pointer,
해당 시 base/head SHA, authoritative docs, verification/review facts,
VERIFIED_REQUIRED_DEPTH, EFFECTIVE_AUDIT_FLOOR, touched area/contract-change,
ASTRA_GATE를 포함한다.

Astra는 실제 relevant diff/evidence와 authoritative contract를 독립적으로 읽고:

AUDIT_REQUEST_ID:
AUDIT_ATTEMPT_ID:
AUDIT_RESULT: PASS | PASS_WITH_NOTES | FAIL | DECISION_REQUIRED
AUDITOR_IDENTITY_OR_SESSION:
AUDITOR_DESIGNATION_POINTER: (Astra가 아닐 때 필수)
AUDITED_TASK_REVISION_OR_MILESTONE:
AUDITED_HEAD_OR_EVIDENCE_SHA:
VERIFIED_AUDIT_DEPTH:
VERIFIED_TOUCHED_AREAS:
VERIFIED_CONTRACT_CHANGE_REQUIRED:
FINDING_POINTERS:

를 반환한다.

audit result는 authenticated auditor identity/session이 exact outstanding request의
ACCEPTED_AUDITOR_IDENTITY와 일치하고, designation pointer가 있으면 request에
bind된 active User designation과 동일할 때만 수락한다.

Astra가 audited change를 작성·수정했다면 User가 durable scope pointer로 non-author
architecture auditor를 지정한다. 대체 auditor에게 Astra design authority는 이전되지 않는다.
Grok, author, mechanical layer는 semantic judgment로 replacement architecture
auditor를 고르거나 gate를 낮출 수 없다.

accepted auditor designation이 revoke/replace되거나 scope가 바뀌면:

- old designation에 bind된 outstanding request는 invalid;
- old designation으로 발급된 prior gate result는 current READY_FOR_MERGE를 충족하지 못함;
- prior SUBMITTING/UNKNOWN delivery를 안전하게 reconcile한 뒤에만 새 designation으로
  새 request를 만들 수 있음.

관련 HEAD/revision 변경은 prior result를 무효화한다.
FAIL은 exact finding을 전달하고 DECISION_REQUIRED는 User decision path로 간다.
architecture decision은 Astra 분석 → User 결정 → durable pointer다.

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

A0 완료 전 mechanical layer는 task envelope의 명시적 A0 승인과 경로 계약을 검사한다:

- A0_AUTHORIZATION_POINTER 존재;
- A0_CHANGE_KIND가 허용된 A0 enum 값;
- 실제 변경 경로가 A0_ALLOWED_PATHS의 부분집합;
- A0_FORBIDDEN_PATHS와 일치하는 변경 경로 없음;
- 저장소 locked/sensitive 규칙 충족.

Grok은 이 경로 목록을 생성하거나 확대하지 않는다.

A0 자격 검사 실패 시:
A1으로 승격 → independent review.
그 review가 도출한 EFFECTIVE_AUDIT_FLOOR 또는 다른 repository rule이 Astra gate를
요구할 때만 Astra를 호출한다.

A0는 저장소 고유 evidence/bookkeeping 규칙을 우회하지 않는다.

경로 검사만으로 A0 의미가 입증되지는 않는다. final A0 qualification은 exact
revision/HEAD에 대한 typo/format-only 변경의 authenticated User attestation 또는
승인된 deterministic transform verifier도 요구한다. 그렇지 않으면 A1으로 승격한다.

qualified A0는 저장소 규칙이 별도 요구하지 않는 한 separate review/Astra gate가
N/A다. 모든 verification/blocker/merge gate는 계속 적용한다.

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

PR deliverable의 READY_FOR_MERGE는 다음이 모두 참일 때만 참이다:

- PR open;
- CURRENT_HEAD_SHA가 PR current head와 일치;
- task revision current;
- unresolved blocker/decision 없음;
- current HEAD verification gate 충족;
- 비-A0 substantive work는 current HEAD independent review PASS/PASS_WITH_NOTES;
- A3 이외 review obligation에 대해 VERIFIED_REVIEW_DEPTH가 EFFECTIVE_AUDIT_FLOOR를
  충족. A3 requirement는 reviewer depth만으로 충족되지 않고 Astra architecture
  gate를 추가로 요구;
- accepted current-head review의 VERIFIED_CONTRACT_CHANGE_REQUIRED가 NO이거나
  필요한 Astra/User decision이 durable하게 기록되어 current task revision에 반영;
- EFFECTIVE_AUDIT_FLOOR=A3이면 ASTRA_GATE=ARCHITECTURE이고, applicable
  revision/head/evidence와 일치하는 accepted Astra-gate PASS/PASS_WITH_NOTES 및
  VERIFIED_AUDIT_DEPTH=A3 충족;
- 다른 explicit Astra gate가 있으면 그 accepted PASS/PASS_WITH_NOTES가 applicable
  identity와 required depth를 충족;
- Astra gate가 필요 없고 EFFECTIVE_AUDIT_FLOOR가 A3 미만이면 Astra result 부재는
  merge blocker가 아님;
- accepted Astra result에 auditor designation이 bind되어 있다면 그 designation이
  여전히 active이고 unchanged;
- 프로젝트 고유 merge 전제조건 충족.

merge 결정은 User가 한다.

## 19. No-change / 비코드 완료

writer는 DELIVERABLE_MODE가 허용할 때만 NO_CHANGE를 반환할 수 있다.

A1+ NO_CHANGE는 exact evidence/base SHA와 required independent review를 제공한다.
Astra gate가 필요한 task는 같은 evidence identity에 대해 그 gate도 받아야 한다.
그 후에만 DONE_NO_CHANGE가 도출될 수 있다.

merge를 만들어내지 않는다.
NON_CODE_EVIDENCE는 project-specific approval/evidence gate를 따르며 engineering
review/Astra gate가 production/legal/content approval을 대체하지 않는다.

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

- Grok command relay: 승인 control-plane command 호출 + 좁은 status relay만;
  source write, PR 생성, admin, secrets, delete, merge 불가.
- DEVIN / GROK_BUILD / GLM builder adapter: 배정 repo + task branch/PR만;
  merge/admin 불가.
- Cheap writer: 명시 배정 branch/task만.
- Reviewer: repo/PR read + finding comment만; source write 불가.
- Astra: repo/PR read + architecture/audit/decision evidence write만; source write/merge 불가.
- Mechanical layer: control-record/claim/status 변경과 configured builder/reviewer
  launch만; source write/merge 불가.
- User: 최종 권한.

shared build host는 하나의 security domain이다. worktree/process 분리는 credential
격리가 아니다. builder별 worktree를 쓴다는 이유만으로 production/root/payment
secret을 그 host에 두지 않는다.

## 24. 비용 규율

AI 호출 전에 raw event를 dedupe하고 CI matrix를 집계한다.
unchanged state는 또 다른 status, review, Astra request를 만들지 않는다.

Astra는 architecture exception, explicit milestone/release packet, A3 gate-ready
evidence를 받으며 routine progress chatter나 모든 A1/A2 PR을 받지 않는다.
배정 builder가 전체 test/fix/retest loop를 소유하고 independent reviewer가 routine
non-author review를 소유한다.

polling, standing session, transcript surveillance는 없다.
Grok은 project context를 읽는 대신 짧은 deterministic command를 실행/relay한다.

validated completed-task throughput, builder별 비용, Astra/Grok 사용량, User 개입,
review finding, rework, integration conflict를 측정한다.

