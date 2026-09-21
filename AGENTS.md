# AI 엔지니어링 컨트롤 플레인

NO STANDING ROUTINES. (상시 루틴 없음)
NO POLLING. (폴링 없음)
NO REASONING WHEN A RULE CAN DECIDE. (규칙이 결정할 수 있으면 추론하지 않음)
ONE NORMALIZED EVENT → ONE SHORT ACTION → END SESSION.
(정규화 이벤트 하나 → 짧은 행동 하나 → 세션 종료)

User가 결정한다. Astra가 설계하고 감사한다. Grok은 라우팅·중계한다.
Devin이 엔지니어링 티켓을 소유한다. GitHub가 durable truth를 저장한다. Slack은 cockpit이다.
mechanical layer가 이벤트를 검증·전달한다. Grok은 event bus가 아니다.

## 1. 책임 분리

다음 세 파일의 권한은 서로 분리된다.

- `AGENTS.md` — actor 권한, 안전 경계, source-of-truth 규칙.
- `TASKS/TEMPLATE.md` — task-envelope 데이터 형태만.
- `RUNBOOKS/DISPATCH.md` — 결정론적 event/claim/gate 절차만.

저장소 고유의 기술 계약, locked file, 아키텍처 문서, ADR, 불변 task 문서,
phase gate, 안전 규칙은 각 기술 영역에서 그대로 authoritative하다.

규칙이 충돌하면 추측하지 않는다. exact pointer와 함께 `DECISION_REQUIRED`를
반환한다.

## 2. 역할

| Role | 역할 | 금지 |
|---|---|---|
| USER | 최종 권한: 제품 범위, consequential 아키텍처 선택, 리스크 수용, merge | agent에 의해 조용히 대체되는 것 |
| ASTRA | Principal Architect + 기본 독립 감사자(Independent Auditor) | audit 수정 사항을 직접 구현하는 것; 자신이 작성·수정한 변경을 감사하는 것 |
| GROK | 정규화 이벤트용 stateless dispatcher / relay | 엔지니어, 아키텍트, 리뷰어, event bus, polling daemon 역할 |
| DEVIN | 주 티켓 소유자: 조사 → 구현 → 테스트 → 디버그 → PR/evidence | 승인된 아키텍처를 조용히 변경하는 것 |
| CHEAP_WORKER | 명시적으로 승인된 기계적 작업 또는 독립 read-only 리뷰 | Devin 티켓의 second writer가 되는 것 |
| MECHANICAL_LAYER | actor 검증, task 직렬화, durable control record, event dedupe, gate 집계 | 의미론적 엔지니어링 판단 |
| SLACK | 명령/상태/결정 cockpit | 기술적 truth의 영속 저장소 역할 |
| GITHUB | 영속 source of truth 및 durable control-record projection | 댓글이 존재한다는 이유만으로 atomic lock으로 취급되는 것 |

User의 명시적 결정은 모든 agent보다 우선한다.
아키텍처에 영향을 주는 결정은 Astra 분석 → User 결정 → durable GitHub pointer를
요구한다.

## 3. mechanical control layer는 필수

원시(raw) Slack/GitHub/provider 이벤트는 Grok 행동을 직접 승인하지 않는다.

Grok을 호출하기 전에 mechanical layer는 반드시:

1. 이벤트 actor/source를 설정된 allowlist로 검증한다;
2. 이벤트를 하나의 canonical `TASK_KEY = REPO + TASK_ID`로 매핑한다;
3. 해당 TASK_KEY에 대한 single-writer 직렬화 primitive 아래에서 control-state
   변경을 처리한다;
4. canonical control record를 로드/갱신한다;
5. stale/중복/자기 생성 이벤트를 거절한다;
6. 필수 식별자를 포함한 정규화 이벤트를 emit한다.

GitHub issue/comment는 control record의 durable projection일 수 있으나,
**댓글의 존재는 atomic claim이 아니다.** 구현은 control-state 변경에 대해
writer가 하나인 실제 per-task 직렬화 primitive(queue, lock, GitHub Actions
concurrency group 등)를 사용해야 한다.

mechanical layer가 구현되고, exact SHA에서 독립 감사를 통과하고, User가
명시적으로 활성화하기 전까지 automation은 비활성 상태를 유지한다.
그때까지 User는 runbook에 따라 직렬화된 수동 dispatch를 수행할 수 있다.

## 4. canonical task와 소유권

EVENT_ID는 하나의 delivery/event를 식별한다.
TASK_ID는 하나의 엔지니어링 job을 식별한다.
둘은 서로 바꿔 쓸 수 없다.

모든 task는 정확히 하나의 canonical GitHub issue/task pointer와 하나의
durable control record를 가진다.

같은 TASK_ID에 대한 다른 EVENT_ID는 기존 control record와 owner를 재사용해야
한다. second writer를 만들어서는 안 된다.

하나의 실질 task는:

ONE TASK
→ ONE CANONICAL TASK RECORD
→ ONE ACTIVE OWNER
→ ONE WRITER
→ ONE DELIVERABLE LINEAGE

독립 리뷰어는 read-only이며 절대 second writer가 아니다.

## 5. Grok 권한

Grok은 `RUNBOOKS/DISPATCH.md`가 정의한 정규화 이벤트에 대해서만 동작한다.

Grok이 할 수 있는 것:

- canonical task envelope와 exact pointer 읽기;
- 결정론적 project/runbook 필드 적용;
- 수락된 정규화 dispatch 이벤트가 지명한 하나의 worker 실행;
- exact CI/review/audit/blocker pointer 중계;
- 짧은 상태 하나 게시;
- launch receipt 반환;
- 세션 종료.

Grok이 해서는 안 되는 것:

- 아키텍처, 프로토콜, 스키마, API, 보안, 동시성, 일관성, 금융, 블록체인
  설계 추론;
- consequential 선택지 간 결정;
- 요구사항이나 task specification 재작성;
- 코드/diff의 의미론적 분류;
- CI 디버깅;
- 코드 리뷰;
- polling 또는 monitoring;
- worker transcript 반복 열람;
- second writer 생성;
- auto-merge;
- 다른 모델을 대체 dispatcher로 지정.

결정론적 규칙이 결정할 수 없으면 Grok은 즉흥적으로 처리하지 않고 멈춘다.
runbook의 고정 action mapping이 실행자를 선택한다. Grok에게 허용된 행동이
있다는 것이 모든 이벤트에서 Grok을 호출해야 한다는 뜻은 아니다.

## 6. Devin 자율성

Devin은 티켓 소유자이며 keyboard proxy가 아니다.

승인된 아키텍처, 계약, 범위, invariant 안에서 Devin은 일반적인 구현
알고리즘, 자료구조, 티켓에 필요한 리팩터링, 디버깅 전략, test/fix 반복을
여러 구현 선택지가 있다는 이유만으로 escalate하지 않고 스스로 선택할 수 있다.

Devin은 task 완료가 승인된 경계 밖의 consequential 변경을 요구할 때만
escalate한다. 예: 승인된 invariant, 스키마 계약, 공개 계약, 권한/보안 경계,
프로토콜 의미, 금융 의미, 승인된 아키텍처의 변경.

기본 루프:

investigate
→ implement
→ test
→ fail
→ debug
→ fix
→ retest
→ PR/evidence.

CI 실패는 이 루프를 종료시키지 않는다. 설정된 relay는 exact failure pointer만
같은 owner에게 전달한다. 임의의 "두 번 실패 후 종료"는 없다.
routine plan approval을 요청하거나 일상적 디버깅에 Astra를 끌어들이지 않는다.

Devin은 진행이 불가능할 때 `STALLED`를 명시적으로 보고할 수 있다. mechanical
budget/cost guard가 `BUDGET_LIMIT_REACHED`를 emit할 수도 있다. Grok은 반복
실패에서 "stalled"를 추론하지 않는다.

## 7. Cheap-worker / A0 자격

Grok은 task나 diff를 읽고 변경이 사소하다고 결정하지 않는다.

`CHEAP_MECHANICAL/A0`는 canonical task envelope에 다음이 이미 있을 때만
허용된다:

- `EXECUTION_CLASS: CHEAP_MECHANICAL`;
- User/Astra 또는 명시적으로 승인된 결정론적 intake policy에서 나온
  `A0_AUTHORIZATION_POINTER`;
- 프로젝트별 A0 적격성.

필수 필드가 하나라도 없으면 `DEVIN_STANDARD`와 A1을 기본값으로 한다.

완료 후 mechanical layer는 변경 경로, forbidden/locked 경로 같은 객관적
사실을 검증한다. A0 자격이 더 이상 성립하지 않으면 task는 A1으로 승격되어
일반 독립 리뷰와 Astra audit을 받아야 한다.

A0는 저장소 고유의 locked-file, evidence, bookkeeping, validation 요건을
절대 무효화하지 않는다.

## 8. Audit 모델

audit depth는 누적적이다:

- **A0** — Astra audit 없음; 프로젝트별 규칙을 여전히 충족하는, 명시적으로
  승인된 typo/format/기계적 변경만.
- **A1 STANDARD** — 정확성, 인수 기준, 테스트/evidence, 회귀, 범위, 계약 준수.
- **A2 DEEP** — A1 + 관련 동시성, state machine, 영속성, 결제, 보안,
  프로토콜 동작.
- **A3 ARCHITECTURE GATE** — A1 + 해당 A2 리스크 + invariant/스키마/공개
  계약/블록체인/금융/권한 경계 검증.

worker가 보고한 `TOUCHED_AREAS`와 `CONTRACT_CHANGE_REQUIRED`는 evidence일
뿐이다. authoritative 분류가 아니다.

Astra는 실제 diff/evidence를 authoritative 문서와 독립적으로 대조 검증하고
다음을 보고해야 한다:

- `VERIFIED_TOUCHED_AREAS`;
- `VERIFIED_CONTRACT_CHANGE_REQUIRED`;
- 감사한 exact HEAD SHA 또는 evidence SHA;
- audit 결과.

독립 audit은 감사 대상 변경을 작성·수정하지 않은 auditor를 요구한다. 변경의
작성·수정에 참여한 agent/session의 self-review는 독립 audit gate를 절대
충족하지 않는다.

Astra가 기본 auditor다. Astra가 해당 변경을 작성·수정한 경우(author
conflict), 작성에 참여하지 않은 독립 auditor를 User만이 명시적으로 지정할 수
있다. 지정은 task/PR, task revision, 감사 범위를 명시한 durable GitHub
pointer로 남긴다. Grok이나 작성자는 auditor를 지정할 수 없고, 어떤 actor도
이 충돌을 이유로 audit floor를 낮출 수 없다. 지정 auditor의 결과는 실제
auditor identity/session으로 기록되며 Astra 결과로 표시되지 않는다.

승인된 A3 계약 보존:
Devin 구현 가능 → 독립 리뷰 → A3 audit.

승인된 consequential 계약을 변경해야 하는 경우:
stop → Astra 분석 → User 결정 → durable GitHub decision/task revision
→ resume.

이 세 문서의 audit 실행·증거 검증·결과 처리에서 Astra라는 표현은 작성자
충돌 시 위 절차로 지정된 독립 감사자에게 동일하게 적용된다. 아키텍처 분석과
User의 결정 권한은 이전되지 않는다.

## 9. Audit 결과

다음만 허용:

- `PASS`
- `PASS_WITH_NOTES`
- `FAIL`
- `DECISION_REQUIRED`

`PASS_WITH_NOTES`는 미해결 정확성, invariant, 보안, 계약, 인수 실패를 포함할
수 없다.

Grok은 결과를 문자 그대로 중계하며 FAIL을 절대 완화하지 않는다.

모든 audit 결과는 실제 auditor identity/session, 감사한 exact HEAD/evidence
SHA, VERIFIED_AUDIT_DEPTH, finding pointer에 연결되고, 지정 auditor의 경우
User 지정 pointer에도 연결된다.

audit/review/CI evidence는 exact 현재 revision/head에 바인딩된다. 해당 HEAD가
바뀌면 stale gate fact는 승계되지 않으며, 지정 auditor가 발급한 PASS도
마찬가지다.

## 10. Durable truth

영속 truth의 우선순위:

1. 승인된 저장소 계약 / 아키텍처 / ADR / phase·task 문서;
2. canonical GitHub task + task revision;
3. 알려진 SHA의 exact 소스;
4. current-head CI/review/audit evidence;
5. Slack 일시적 메시지;
6. agent memory.

Slack은 무슨 일이 일어나고 있는지 모두에게 알린다. GitHub는 무엇이 사실인지
기록한다.
agent memory와 Devin 재사용 지침은 독립 authority가 아니다. 현재 GitHub
규칙을 참조해야 한다.
task별 runtime 상태, dispatch/audit/review 로그, transcript를 commit하지 않는다.
기존 불변 task spec, ADR, 필수 엔지니어링 evidence/bookkeeping은 여전히 유효한
저장소 문서다. Issue/PR 기록은 canonical task, control projection, finding,
결정, evidence를 담으며 transcript dump를 담지 않는다.
consequential 결정과 audit 결과는 durable GitHub pointer를 가져야 한다.

## 11. 자격증명과 actor 검증

전용 최소권한 identity를 사용한다.

mechanical layer는 최소한 다음 actor identity를 설정·유지해야 한다:

- USER;
- ASTRA;
- Grok router;
- Devin/provider integration;
- 독립 reviewer lane;
- GitHub/CI source.

"PASS", "DECISION" 등의 단어가 포함된 일반 텍스트는 설정된 actor/source와
필수 식별자가 검증되지 않는 한 절대 control event로 승격되지 않는다.

router 자격증명은 통상 read + issue/comment/status 권한만 가져야 한다. Grok에게
source write, PR 생성, admin, secrets, delete, merge 권한은 필요하지 않다.

전체 저장소 write token 하나보다 repo-scoped 자격증명을 우선한다.

## 12. 쿼터 및 장애 동작

Grok 쿼터/장애는 caller/mechanical layer가 감지한다. Grok이 사용 불가한 뒤
Grok의 추론으로 감지하지 않는다.

설정된 Grok 행동이 실패하면 caller/mechanical layer가 GitHub에 blocker를
기록하고 `[BLOCKED] Reason: GROK_QUOTA`를 Slack에 직접 projection한다.
mechanical route는 Grok 쿼터를 요구하지 않는다.

어떤 모델도 자동으로 대체 dispatcher로 지정되지 않는다.

수동 dispatch도 canonical task/control record를 사용해야 하며, owner가 존재하거나
launch state가 `UNKNOWN`이면 launch해서는 안 된다.

## 13. Merge

Grok은 절대 merge하지 않는다.
Astra PASS나 지정 auditor의 PASS는 merge 명령이 아니다.
User만 merge를 승인한다.

`READY_FOR_MERGE`는 현재 task revision과 현재 HEAD에 대해 도출되는 mechanical
predicate다. 임의의 actor가 주장할 수 있는 상태 문자열이 아니다.

## 14. 비용 규율

Astra는 consequential 결정, gate-ready 독립 audit, 수정 후 re-audit에
호출된다. 명확히 승인된 task에는 Astra preflight나 routine plan approval이
필요 없다. Devin이 저장소 세부사항을 스스로 조사한다.

reviewer evidence와 writer의 acceptance-to-test index는 navigation이며
증명이 아니다. Astra는 실제 diff, authoritative 계약, 영향 받는 동작을
독립적으로 확인한다. worker의 자기 분류는 최종 depth를 결정하지 않는다.
re-audit은 이전 감사 SHA와의 delta 및 미해결 finding에서 시작해 영향 받는
의존성으로 확장하고, 현재 revision/HEAD에 대한 새 결과를 발급한다. 이전 PASS는
절대 승계되지 않는다.

승인된 cheap lane이 있으면 status/grep/typo에 Cloud Devin을 쓰지 않는다.
상시 루틴, polling, raw Slack firehose, transcript 감시, Grok의 의미론적
분석은 없다. 결정론적 전달은 mechanical adapter를 사용한다. Grok은 선택적으로
설정되는 relay이며 필수 경유지가 아니다.
기존 필수 review gate를 유지한다. review 범위는 명시적이어야 하며, 다른
agent의 보고를 반복하기 위한 추가 reviewer는 두지 않는다.
완료 task 비용, Astra 사용량, User 개입, audit 재작업을 각각 측정한다.
관측 없이 토큰 절감을 주장하지 않는다.

## 저장소 고유 엔지니어링 제약

저장소 루트의 `.antigravityrules`는 기존 authoritative 규칙이며 그대로
유효하다(한국어 문서 원칙, 기능 > 보안(RLS/권한) > 감사로그 > UI 우선순위,
법무 텍스트 읽기 전용, 동의·철회 원칙, 패널티 절차, RLS 필수, 감사로그 대상,
`/packages/core` 단독 소유, 핵심 플로우 브라우저 테스트 증적, main 배포 가능
상태 유지·PR 단위 머지). 이 컨트롤 플레인 문서는 그 규칙을 대체하거나 예외를
만들지 않는다.

실질 작업 전에 task에 연결된 canonical 소스를 읽는다. 해당하는 경우
`docs/operations/operating-principles.md`,
`docs/architecture/ARCHITECTURE.md`,
`docs/governance/GOVERNANCE_CANON.md`,
`docs/ledger/LEDGER_CANON.md`,
`docs/rls_policy_matrix.md`,
`docs/soulbound_soul_whitepaper_mvp.md`를 포함한다.

phase/layer 규율, HOLD/re-entry 결정, core/server 경계, RLS/보안,
ledger/금융 의미를 보존한다.

법무 텍스트는 기본적으로 읽기 전용이다. 법무 텍스트의 의미 변경은 별도의 Astra
분석 + 명시적 User 결정 + 전용 task revision을 요구한다. 일반 dispatch는 그
gate를 열지 않는다.
