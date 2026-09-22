# AI 엔지니어링 컨트롤 플레인

NO STANDING ROUTINES. (상시 루틴 없음)
NO POLLING. (폴링 없음)
NO REASONING WHEN A RULE CAN DECIDE. (규칙이 결정할 수 있으면 추론하지 않음)
ONE NORMALIZED EVENT → ONE SHORT ACTION → END SESSION.
(정규화 이벤트 하나 → 짧은 행동 하나 → 세션 종료)

User가 결정한다. Astra가 아키텍처·아키텍처 예외·명시된 milestone/release gate를 소유한다.
mechanical layer가 결정론적으로 dispatch하며, Grok은 선택적 command relay일 뿐이다.
Devin, Grok Build, GLM은 동급 autonomous builder다. GitHub가 durable truth를 저장하고 Slack은 cockpit이다.

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
| ASTRA | Principal Architect / Design Authority; architecture exception; 명시된 milestone·architecture·release audit | routine 티켓 관리자나 기본 A1/A2 reviewer가 되는 것; audit 수정 직접 구현; 자신이 작성·수정한 변경 감사 |
| GROK | mechanical control plane을 호출하는 선택적 command relay | 엔지니어, 아키텍트, reviewer, semantic router, event bus, polling daemon 역할 |
| BUILDER | 설정된 단일 autonomous writer: DEVIN / GROK_BUILD / GLM | 승인된 아키텍처를 조용히 변경; 배정 task/worktree 밖 쓰기; merge |
| REVIEWER | 작성에 참여하지 않은 read-only reviewer; 다른 builder lane 또는 User 지정 외부 lane 가능 | reviewed change 수정 또는 second writer 역할 |
| CHEAP_WORKER | 명시적으로 승인된 기계적 작업 | substantive task의 second writer가 되는 것 |
| MECHANICAL_LAYER | actor 검증, task 직렬화, builder dispatch, durable control record, event dedupe, gate 집계 | 의미론적 엔지니어링·아키텍처 판단 |
| SLACK | 명령/상태/결정 cockpit | 기술 truth의 영속 저장소 역할 |
| GITHUB | 영속 source of truth 및 durable control-record projection | 댓글 존재만으로 atomic lock 취급 |

User의 명시적 결정은 모든 agent보다 우선한다.
아키텍처에 영향을 주는 결정은 Astra 분석 → User 결정 → durable GitHub pointer를 요구한다.

Builder/reviewer identity는 canonical task/control-record field다.
Grok은 코드·문서·모델 성능을 읽고 builder나 reviewer를 선택하지 않는다.

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

Grok은 control plane 자체가 아니라 선택적 messenger / command runner다.

Grok이 할 수 있는 것:

- 인증된 User의 명시적 명령을 고정된 control-plane command로 전달;
- 정규화 이벤트가 지정한 pre-authorized mechanical action 하나 실행;
- exact CI/review/audit/blocker pointer 중계;
- 짧은 status/receipt 하나 게시;
- 세션 종료.

Grok이 해서는 안 되는 것:

- 아키텍처, 프로토콜, 스키마, API, 보안, 동시성, 일관성, 금융, 블록체인 설계 추론;
- builder/reviewer를 의미론적으로 선택;
- 요구사항이나 task specification 재작성;
- 코드/diff 의미론적 분류;
- CI 디버깅;
- 코드 리뷰;
- polling/monitoring;
- worker transcript 반복 열람;
- second writer 생성;
- auto-merge.

어떤 control-plane state transition도 Grok의 reasoning이나 가용성에 의존해서는 안 된다.
Grok이 unavailable이면 동일하게 승인된 mechanical command를 다른 인증 caller가 호출할 수 있다.

## 6. Builder 자율성

DEVIN, GROK_BUILD, GLM은 동일한 task-owner contract 뒤의 동급 builder다.
canonical task/control record는 substantive task마다 정확히 하나의 active
builder를 지정한다.

배정된 builder는 keyboard proxy가 아니라 티켓 소유자다.

승인된 아키텍처, 계약, 범위, invariant 안에서 builder는 일반 구현 알고리즘,
자료구조, 필요한 리팩터링, 디버깅 전략, test/fix 반복을 routine Astra 승인 없이
스스로 선택할 수 있다.

task 완료가 승인된 경계 밖 consequential 변경을 요구할 때만 escalate한다.
예: invariant, schema/public contract, 권한·보안 경계, protocol/금융 의미,
승인된 architecture 변경.

기본 루프:

investigate
→ implement
→ test
→ fail
→ debug
→ fix
→ retest
→ PR/evidence.

CI 실패는 루프를 종료시키지 않는다. exact feedback은 같은 owner로 돌아간다.
임의의 두 번 실패 cutoff는 없다. 일상 디버깅에 Astra를 호출하지 않는다.

builder는 진행 불가 시 STALLED를 명시적으로 보고할 수 있다.
mechanical budget/cost guard는 BUDGET_LIMIT_REACHED를 emit할 수 있다.
Grok은 어느 것도 추론하지 않는다.

## 7. Cheap-worker / A0 자격

Grok은 task나 diff를 읽고 변경이 사소하다고 결정하지 않는다.

CHEAP_MECHANICAL/A0는 canonical task envelope에 다음이 이미 있을 때만 허용한다:

- EXECUTION_CLASS: CHEAP_MECHANICAL;
- User/Astra 또는 승인된 deterministic intake policy의 A0_AUTHORIZATION_POINTER;
- 프로젝트별 A0 적격성.

필수 A0 field가 없으면 BUILDER_STANDARD와 A1을 기본값으로 한다.
BUILDER_STANDARD task는 dispatch 전에 BUILDER_ID가 설정되어야 한다.

완료 후 mechanical layer가 실제 changed/forbidden/locked path를 검증한다.
A0 자격이 깨지면 A1으로 승격해 일반 독립 review를 받는다.
Astra는 해당 task의 Astra gate가 요구할 때만 추가한다.

A0는 저장소 고유 locked-file, evidence, bookkeeping, validation 요건을 무효화하지 않는다.

## 8. Review depth와 Astra gate

review depth는 누적적이다:

- **A0** — 명시 승인된 typo/format/mechanical 변경. 저장소 규칙이 별도 요구하지
  않으면 separate reviewer/Astra gate 없음.
- **A1 STANDARD** — non-author 독립 정확성 review: acceptance, test/evidence,
  regression, scope, contract 준수.
- **A2 DEEP** — A1 + 관련 concurrency, state machine, persistence, payment,
  security, protocol 동작.
- **A3 ARCHITECTURE** — A2 + Astra architecture gate. invariant/schema/public
  contract/blockchain/financial/authority boundary를 확인한다.

task는 ASTRA_GATE도 가진다:

- NONE — routine A1/A2는 independent review + mechanical gate로 종료;
- MILESTONE — 명시된 milestone packet을 Astra가 검토;
- ARCHITECTURE — exact task/head architecture gate;
- RELEASE — 명시된 release gate.

A3는 task 기본값과 무관하게 ASTRA_GATE=ARCHITECTURE를 의미한다.

writer의 TOUCHED_AREAS와 CONTRACT_CHANGE_REQUIRED는 참고 evidence다.
independent reviewer가 실제 diff/evidence를 읽고 VERIFIED_REVIEW_DEPTH,
VERIFIED_TOUCHED_AREAS, VERIFIED_CONTRACT_CHANGE_REQUIRED와 exact reviewed
HEAD/evidence SHA를 보고한다.

independent review는 reviewed change를 작성·수정하지 않은 reviewer를 요구한다.
다른 builder도 별도 read-only non-author session이고 해당 task의 write role이
없을 때만 reviewer가 될 수 있다.

Astra는 routine A1/A2의 기본 reviewer가 아니다. architecture exception, A3,
명시된 MILESTONE/ARCHITECTURE/RELEASE gate에서만 호출한다. 이 경우 Astra는
실제 diff/evidence와 authoritative contract를 독립 검증한다.

Astra가 Astra-gated 변경을 작성·수정했다면 User만 non-author architecture
auditor를 durable task/revision/scope pointer로 지정할 수 있다. 대체 auditor에게
Astra의 design authority가 이전되지는 않는다.

consequential contract 변경이 필요하면:
stop → Astra 분석 → User 결정 → durable GitHub decision/task revision → resume.

## 9. Review 및 audit 결과

허용 semantic result:

- PASS
- PASS_WITH_NOTES
- FAIL
- DECISION_REQUIRED

PASS_WITH_NOTES에는 미해결 correctness, invariant, security, contract,
acceptance failure가 들어갈 수 없다.

Grok은 결과를 문자 그대로 relay하며 FAIL을 완화하지 않는다.

independent review 결과는 실제 reviewer identity/session, task revision,
exact reviewed HEAD/evidence SHA에 고정한다. 필요한 Astra audit은 별도의
request, auditor identity/session, exact audited HEAD/evidence SHA에 고정한다.

관련 HEAD 또는 task revision이 바뀌면 review/CI/Astra-gate evidence는 승계되지 않는다.

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

mechanical layer는 최소한 다음 identity를 설정·유지한다:

- USER;
- ASTRA;
- 선택적 Grok command relay;
- 활성화된 각 builder adapter: DEVIN, GROK_BUILD, GLM 중 해당 항목;
- 배정 independent reviewer lane;
- GitHub/CI source.

PASS, DECISION 등의 일반 텍스트는 actor/source 및 필수 식별자가 검증되지
않으면 control event로 승격하지 않는다.

Grok은 승인된 control-plane command 호출과 좁은 status relay에 필요한 권한만
가져야 하며 source write, PR 생성, admin, secrets, delete, merge 권한이 필요 없다.

builder credential은 배정 repo/task branch/PR로 제한하고 merge/admin 권한을
주지 않는다. reviewer는 read/comment 전용이다.

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
reviewer PASS 또는 필요한 Astra PASS는 merge 명령이 아니다.
User만 merge를 승인한다.

READY_FOR_MERGE는 현재 task revision과 현재 HEAD에서 계산되는 mechanical
predicate다. 임의 actor가 주장하는 status 문자열이 아니다.

## 14. 비용 규율

Astra는 architecture 생성/변경, architecture exception, A3, 명시된
milestone/release gate와 그 gate의 re-audit에 호출한다. 승인된 routine A1/A2
task에는 Astra preflight, routine plan approval, duplicate Astra review가 없다.

배정 builder가 저장소 조사와 전체 implementation/test/fix loop를 소유하고,
independent reviewer가 routine non-author semantic gate를 담당한다.

writer/reviewer evidence index는 navigation이며 증명이 아니다. Astra-gated
task에서는 Astra가 실제 diff, authoritative contract, 영향 동작을 독립 검증한다.

승인 cheap lane이 있으면 status/grep/typo에 premium builder를 쓰지 않는다.
Grok에게 semantic routing, code reading, transcript 감시, polling을 시키지 않는다.
결정론적 전달은 mechanical adapter를 사용하고 Grok은 optional command relay다.

기존 저장소 고유 review/safety gate는 유지한다. validated task throughput,
builder별 비용, Astra 사용량, Grok 사용량, User 개입, review finding, rework를
각각 측정한다.

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
