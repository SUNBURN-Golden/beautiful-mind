# 신뢰할 workflow 경계 설치·검증

적용 task: https://github.com/BeautifulMind-JT/kix-protocol/issues/40 .
원본: KIX `f179be8fc3c0c590b3194c26663aecdfe7a4a679` / CP-BOUNDARY-003.
원본 격리 probe 증거는 이 저장소의 production 설치 증거가 아니다.
`runtime_enabled=false`와 production runner 미연결을 별도 gate 완료까지 유지한다.

## 거절 경계

원본 probe의 runner v2.337.0은 `ACTIONS_RUNNER_HOOK_JOB_STARTED`를 container
설정·action pre-step 앞에 실행한다. 단순 nonzero 반환 뒤에는 `always()` 단계가
실행될 수 있었으므로 hook은 거절 기록을 남긴 뒤 해당 `Runner.Worker`를 종료한다.
`ASTRA_BOUNDARY_KILL=0`은 우회 재현용이며 운영에 쓰지 않는다.
hook이 없는 상태도 허용 상태가 아니다.

## 보호된 파일과 환경

```text
/opt/astra/boundary/control_plane_boundary_hook.sh   root:astra-control 0755
/opt/astra/boundary/control_plane_boundary.py        root:astra-control 0644
/opt/astra/boundary/policy.json                      root:astra-control 0644
/var/lib/astra/boundary-evidence/                    astra-runner 0700
```

hook/evaluator/policy와 상위 경로는 runner·builder 쓰기를 금지하고 runner work
directory 밖에 둔다. 검토한 source의 설치 hash를 기록한다. 관리자 소유 listener
시작 환경에 다음을 고정한다:

```text
ACTIONS_RUNNER_HOOK_JOB_STARTED=/opt/astra/boundary/control_plane_boundary_hook.sh
ASTRA_BOUNDARY_POLICY=/opt/astra/boundary/policy.json
ASTRA_BOUNDARY_POLICY_SHA256=<실제 policy SHA-256>
ASTRA_BOUNDARY_EVIDENCE_DIR=/var/lib/astra/boundary-evidence
```

job이 쓸 수 있는 runner `.env`에 경계 설정을 두지 않는다. 경계 key를 덮어쓰면
listener 시작을 거절하며 매 시작 시 실제 검사한다.

## 정책과 시작 전 검사

예시의 placeholder를 실제 repository/owner/actor ID, 승인 ref·event·job,
`GITHUB_WORKFLOW_REF`, `GITHUB_WORKFLOW_SHA`, event payload의 repository/owner/sender
ID로 고정한다. `GITHUB_WORKFLOW_SHA`는 workflow 파일의 **commit SHA**이며 파일 blob
SHA가 아니다: https://docs.github.com/en/actions/reference/workflows-and-actions/variables .
병합·activation으로 commit이 바뀌면 검토된 source/내용과 실제 workflow commit의 대응
근거를 남기고 pin을 재검증한다. 임의 최신 SHA를 자동 승인하지 않는다.

실제 runner 계정 권한에서 다음을 실행한다:

```sh
python3 -I /opt/astra/boundary/control_plane_boundary.py verify-install \
  --hook /opt/astra/boundary/control_plane_boundary_hook.sh \
  --policy /opt/astra/boundary/policy.json \
  --hook-sha256 <hook-sha256> --policy-sha256 <policy-sha256> \
  --owner-uid 0 --forbid-prefix /runner/work/dir \
  --writable-check --env-file /path/to/runner/.env

python3 -I /opt/astra/boundary/control_plane_boundary.py check-env \
  --hook /opt/astra/boundary/control_plane_boundary_hook.sh \
  --policy /opt/astra/boundary/policy.json --policy-sha256 <policy-sha256>
```

두 검사 성공 후에만 listener를 시작한다. 운영 unit/launcher가 매 시작 시
검사를 실행해야 한다. 파일 설치만으로 PASS를 만들지 않는다.

## probe와 남은 gate

`scripts/control_plane_boundary_probe.sh`는 user/mount namespace·chroot의 별도
probe다. runner·evidence만 쓰기 가능, 경계·시스템은 읽기 전용이며 builder credential과
실제 `/etc/astra`는 노출하지 않는다. 실제 배포 환경에서 허용 event 및 잘못된
workflow/ref/event/actor/source, policy 부재·변조, `.env` 변조, action pre-step,
`always()` 거절을 증명한다. KIX host 경로를 이 repo의 증거로 쓰지 않는다.

원본 job/service container 시험은 docker 부재로 `NOT_TESTED`였다.
실행 순서만으로 실측 PASS를 만들지 않는다. 새 환경의 container 경로는 시험하거나
명시적으로 차단한 범위를 증명해야 한다. policy에 없는 claim은 검증한 것이 아니다.
반복 hostile event마다 거절하는 것은 polling 또는 상주 AI를 뜻하지 않는다.

## 중지·복구

문제가 있으면 runner service를 중지한다. hook을 제거한 상태로 재연결하지 않는다.
검증된 경계 복구 전 disconnected를 유지한다. ledger/session을 초기화하거나
UNKNOWN을 자동 해제하지 않는다. 설치·권한·부정 시험·기본 branch preflight를 exact
source와 GitHub 근거에 연결한 뒤 독립 검증한다. 이 문서는 merge/activation PASS가 아니다.
