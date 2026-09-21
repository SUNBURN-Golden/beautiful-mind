# TASK ENVELOPE v3

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
선택은 Devin의 몫이다.

## RUNBOOKS/DISPATCH.md의 고정 기본값

EXECUTION_CLASS: DEVIN_STANDARD
DELIVERABLE_MODE: PR
AUDIT_FLOOR: A1
REVIEW_POLICY: REQUIRED_NON_A0
REVIEWER_LANE_ID: CONFIG_REQUIRED

REPO/PROJECT는 project map과 일치해야 한다. verification/post-merge 정책은 그
map과 저장소 규칙에서 온다. override에는 durable하게 승인된 pointer가 필요하다.
Grok은 task를 분류하거나 누락 요구사항을 만들어내지 않는다.
dispatch 전에 필수 reviewer identity를 확정한다. lane이 사용 불가하다는 이유로
review를 조용히 면제할 수 없다.

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

이 값은 실행 전에 intake/User가 provisioning한다. Grok이 만들어내지 않는다.
Slack을 사용하면 task와 thread는 서로 링크한다. 변경 가능한
claim/session/HEAD/gate 상태는 task spec이 아니라 control record에 속한다.

## Owner 지시

고정된 task와 저장소 규칙을 따른다. routine plan approval 없이 조사, 구현,
디버그, test/fix/retest를 수행하고 PR을 제출한다.
보존된 승인 A3 계약은 구현 후 A3 audit을 허용한다.
필수 consequential 계약 변경은 그 변경을 구현하기 전에 exact 질문과 evidence를
포함한 DECISION_REQUIRED를 요구한다.
CI/review/audit 피드백은 같은 active owner로 돌아간다.

## 완료 evidence index

- task revision; 관측한 base SHA; PR 및 exact 최종 HEAD/evidence SHA;
- 전체 변경 경로 및 인수 기준 -> test/CI evidence pointer;
- 실제 명령/결과 및 저장소가 요구하는 evidence;
- TOUCHED_AREAS 및 CONTRACT_CHANGE_REQUIRED: NO | YES (참고용);
- 가능한 경우 독립 review pointer;
- 미검증 동작, 잔여 리스크, 해당 시 BLOCKED/STALLED.

Astra는 touched area와 계약 변경을 독립적으로 검증한다. 이 index는 저장소
evidence 요건이나 독립 검토를 대체하지 않는다.
transcript, 반복 상태, 변경 가능한 실행 상태는 여기에 두지 않는다.

필수 필드 누락 시: BLOCKED / INCOMPLETE_TASK_ENVELOPE, 필드 이름만 기재.
