import type { AppLocale } from './config';

const dashboardCopy = {
    en: {
        loading: {
            badge: 'My space',
            title: 'Opening your space.',
            description: 'Reviewing your proof for access.',
        },
        gate: {
            badge: 'Proof review required',
            title: 'Proof review is in progress.',
            description: 'Once review is complete, your space opens.',
            currentStageLabel: 'Current step',
            primaryLabel: 'Check review status',
            secondaryLabel: 'View the guide',
        },
        intro: {
            badge: 'My space',
            title: 'Your space is open.',
            description: 'Your proof grants access. Your trust opens what comes next.',
            note: 'Original documents are deleted after review. Only the fact of verification remains.',
        },
        access: {
            badge: 'Proof verified',
            title: 'Verified items',
            description: 'These are the checks already completed.',
        },
        rooms: {
            title: 'Available after proof review',
            counterpart: {
                title: 'Friend recommendations',
                description: 'Review recommended people and decide whether to connect.',
            },
            correspondence: {
                title: 'Direct messages',
                description: 'Continue an existing conversation.',
            },
            attestation: {
                title: 'Trust note',
                description: 'Leave a note of trust.',
            },
            report: {
                title: 'Report misconduct',
                description: 'Submit a report about conduct that breaks trust.',
            },
            revoke: {
                title: 'Participation control',
                description: 'Manage whether you take part in matching, conversations, and community features. You may also pause participation or request withdrawal.',
            },
        },
        actions: {
            disabledReason: 'Not open yet',
        },
        evidence: {
            badge: 'Proof on file',
            summaryLabel: 'Proof that backs your access.',
        },
        documentRecord: {
            title: 'Proof',
            fallbackTitle: 'Document',
            emptyDescription: 'No proof on file.',
        },
        receipt: {
            title: 'Verification record',
            issuedPending: 'Pending',
            signatory: 'SoulBound registry',
            contractVersion: 'dashboard.access-board.v1',
        },
        rows: {
            admissionStatus: 'Admission status',
            trustLevel: 'Trust level',
            issuedAt: 'Issued at',
            status: 'Status',
            processing: 'Processing',
            confidence: 'Confidence',
            purgedAt: 'Purged at',
            notAvailable: 'Not available',
            pending: 'Pending',
            notPurged: 'Not purged',
        },
    },
    ko: {
        loading: {
            badge: '내 스페이스',
            title: '스페이스를 여는 중입니다.',
            description: '제출하신 증빙으로 입장 자격을 확인하는 중입니다.',
        },
        gate: {
            badge: '증빙 검토 필요',
            title: '증빙 검토가 진행 중입니다.',
            description: '검토가 완료되면 스페이스가 열립니다.',
            currentStageLabel: '현재 단계',
            primaryLabel: '검토 진행 상황 확인',
            secondaryLabel: '가이드 보기',
        },
        intro: {
            badge: '내 스페이스',
            title: '스페이스가 열렸습니다.',
            description: '증빙을 기반으로 입장 자격이 부여됩니다. 신뢰가 다음 문을 엽니다.',
            note: '원본 서류는 검토 후 삭제됩니다. 검증 완료 사실만 남습니다.',
        },
        access: {
            badge: '증빙 검토 완료',
            title: '검증된 항목',
            description: '증빙 검토가 완료된 항목입니다.',
        },
        rooms: {
            title: '증빙 검토가 완료되면 이 기능을 사용할 수 있습니다.',
            counterpart: {
                title: '친구 추천 목록',
                description: '추천 친구를 확인하고 관계를 이어나갈지 결정하세요.',
            },
            correspondence: {
                title: '다이렉트 메시지',
                description: '기존 대화를 이어갑니다.',
            },
            attestation: {
                title: '신뢰 노트 작성',
                description: '신뢰에 대한 기록을 남깁니다.',
            },
            report: {
                title: '부정행위 신고',
                description: '신뢰를 해치는 행위를 신고합니다.',
            },
            revoke: {
                title: '참여 상태 관리',
                description: '매칭, 대화, 커뮤니티 기능에 참여할지 관리합니다. 필요하면 참여를 중단하거나 철회를 요청할 수 있습니다.',
            },
        },
        actions: {
            disabledReason: '아직 열리지 않음',
        },
        evidence: {
            badge: '검증 기록',
            summaryLabel: '입장을 뒷받침하는 증빙 기록입니다.',
        },
        documentRecord: {
            title: '증빙',
            fallbackTitle: '문서',
            emptyDescription: '제출된 증빙이 없습니다.',
        },
        receipt: {
            title: '검증 기록',
            issuedPending: '발급 대기',
            signatory: 'SoulBound 레지스트리',
            contractVersion: 'dashboard.access-board.v1',
        },
        rows: {
            admissionStatus: '심사 상태',
            trustLevel: '신뢰 단계',
            issuedAt: '발급 시각',
            status: '상태',
            processing: '처리 상태',
            confidence: '신뢰도',
            purgedAt: '삭제 시각',
            notAvailable: '정보 없음',
            pending: '대기 중',
            notPurged: '삭제 전',
        },
    },
} as const;

export function getDashboardCopy(locale: AppLocale) {
    return dashboardCopy[locale];
}
