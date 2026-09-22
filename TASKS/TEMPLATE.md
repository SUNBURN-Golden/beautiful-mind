# TASK ENVELOPE v4

이 envelope는 새 runtime 파일이 아니라 canonical GitHub task에 저장한다.
기존 specification을 링크한다. 재작성하거나 중복하지 않는다.

## 필수 intake

TASK_ID:
PROJECT:
REPO:
CANONICAL_TASK_POINTER:
TASK_REVISION:
TASK_SPEC_POINTER:
TASK_SPEC_REVISION:
APPROVAL_POINTER:
AUTHORITATIVE_DOC_POINTERS:

고정(pinned)된 specification은 목표, 범위, 제외 사항, 제약/계약,
인수/검증 기준을 식별해야 한다. exact section pointer로 충분하며, 같은 issue가
모든 section을 제공할 수 있다. 이미 승인되고 범위가 명확한 task에는 별도의
Astra 승인이 필요하지 않다.
누락된 consequential 요구사항은 명확화가 필요하다. 저장소 조사와 일반 구현
선택은 배정 builder의 몫이다.

## RUNBOOKS/DISPATCH.md의 고정 기본값

EXECUTION_CLASS: BUILDER_STANDARD
BUILDER_ID: CONFIG_REQUIRED
DELIVERABLE_MODE: PR
AUDIT_FLOOR: A1
ASTRA_GATE: NONE
REVIEW_POLICY: REQUIRED_NON_A0
REVIEWER_LANE_ID: CONFIG_REQUIRED

BUILDER_STANDARD의 BUILDER_ID는 dispatch 전에 DEVIN, GROK_BUILD, GLM 등 configured
builder adapter 하나로 resolve되어야 한다. Grok은 task를 읽고 builder/reviewer를
선택하지 않는다.

REPO/PROJECT는 project map과 일치해야 한다. override에는 durable authorized
pointer가 필요하다. unavailable builder/reviewer lane은 ownership/review를
조용히 waive하거나 transfer할 수 없다.

A3는 항상 ASTRA_GATE=ARCHITECTURE를 의미한다.
그 외 ASTRA_GATE: NONE | MILESTONE | ARCHITECTURE | RELEASE.

## 조건부 pointer

CONTRACT_POINTERS:
INVARIANT_POINTERS:
LOCKED_AREAS_POINTERS:
PHASE_OR_LAYER_POINTER:

exact task-spec section 또는 기존 저장소 문서를 사용한다. N/A는 해당 요구사항이
전혀 적용되지 않을 때만 허용된다. 기존 프로젝트 고유 요구사항은 여전히
필수이며, 이 저장소의 authoritative task/specification 정책을 사용한다.

CHEAP_MECHANICAL/A0 전용:
A0_AUTHORIZATION_POINTER:
A0_CHANGE_KIND: TYPO | FORMAT_ONLY | DOC_MECHANICAL
A0_ALLOWED_PATHS:
A0_FORBIDDEN_PATHS:

그 외 허용되는 DELIVERABLE_MODE 값:
NO_CHANGE_ALLOWED | NON_CODE_EVIDENCE.
그 외 AUDIT_FLOOR 값: A0 | A2 | A3.
A0는 runbook의 최종 자격 검사를 요구한다.

## Dispatch 참조

CONTROL_RECORD_POINTER:
CANONICAL_SLACK_THREAD:

실행 전에 intake/User가 provisioning한다. Grok이 만들어내지 않는다.
mutable claim/session/HEAD/gate state는 task spec이 아니라 control record에 속한다.

builder/reviewer reassignment는 durable control action이며 second writer를 만들거나
unresolved SUBMITTING/UNKNOWN launch를 우회해서는 안 된다.

## Owner 지시

고정 task와 저장소 규칙을 따른다. 배정 builder로서 routine plan approval 없이
조사, 구현, 디버그, test/fix/retest를 수행하고 PR을 제출한다.

승인된 architecture, contract, authority/security boundary, consequential semantics를
조용히 변경하지 않는다. 그런 변경이 필요하면 해당 변경을 중단하고
DECISION_REQUIRED / architecture-exception evidence를 제출한다.

CI/review/Astra-gate feedback은 prior attempt가 durable하게 fencing된 authorized
reassignment가 없는 한 같은 active owner로 돌아간다.

## 완료 evidence index

- task revision; 관측한 base SHA; PR 및 exact 최종 HEAD/evidence SHA;
- 전체 변경 경로 및 인수 기준 -> test/CI evidence pointer;
- 실제 명령/결과 및 저장소가 요구하는 evidence;
- TOUCHED_AREAS 및 CONTRACT_CHANGE_REQUIRED: NO | YES (참고용);
- BUILDER_ID 및 가능한 경우 독립 review pointer;
- review 시 VERIFIED_REVIEW_DEPTH / touched area / contract-change result;
- ASTRA_GATE가 요구할 때만 Astra-gate pointer/result;
- 미검증 동작, 잔여 리스크, 해당 시 BLOCKED/STALLED.

routine A1/A2에서는 independent reviewer가 touched area와 contract-change를 검증한다. applicable Astra gate에서는 Astra가 이를 독립적으로 재검증한다. 이 index는 저장소 evidence 요건이나 독립 검토를 대체하지 않는다.
transcript, 반복 상태, 변경 가능한 실행 상태는 여기에 두지 않는다.

필수 필드 누락 시: BLOCKED / INCOMPLETE_TASK_ENVELOPE, 필드 이름만 기재.
