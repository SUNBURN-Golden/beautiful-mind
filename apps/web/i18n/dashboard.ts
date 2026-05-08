import type { AppLocale } from './config';

const dashboardCopy = {
    en: {
        loading: {
            badge: 'My space',
            title: 'Opening your space.',
            description: 'Gathering verified trust for your private space.',
        },
        gate: {
            badge: 'Proof review required',
            title: 'Proof review is in progress.',
            description: 'Once trust is verified, your SoulBound space opens.',
            currentStageLabel: 'Current step',
            primaryLabel: 'Check review status',
            secondaryLabel: 'View the guide',
        },
        intro: {
            badge: 'My space',
            title: 'Your space is open.',
            description: 'Your verified trust lives here. SOUL carries that trust into access, conversation, and what comes next.',
            note: 'Original documents are deleted after review. Only the verification facts needed for trust remain.',
        },
        access: {
            badge: 'Proof verified',
            title: 'What supports your access',
            description: 'These completed checks keep your space open without exposing more than needed.',
        },
        rooms: {
            title: 'Trust opens what comes next',
            counterpart: {
                title: 'Friend recommendations',
                description: 'Meet people through verified trust, then decide whether to connect.',
            },
            correspondence: {
                title: 'Direct messages',
                description: 'Continue conversations once both sides are inside the trusted space.',
            },
            attestation: {
                title: 'Trust note',
                description: 'Record trust after a real interaction.',
            },
            report: {
                title: 'Report misconduct',
                description: 'Submit a report about conduct that breaks trust.',
            },
            revoke: {
                title: 'Participation control',
                description: 'Pause participation or request withdrawal without opening the rest of your record.',
            },
        },
        actions: {
            disabledReason: 'Not open yet',
        },
        evidence: {
            badge: 'Verified trust',
            summaryLabel: 'Support details for the trust that opens your space.',
        },
        documentRecord: {
            title: 'Proof supporting your access',
            fallbackTitle: 'Document',
            emptyDescription: 'No supporting proof is visible yet.',
        },
        receipt: {
            title: 'Verified trust record',
            issuedPending: 'Pending',
            signatory: 'SoulBound registry',
            contractVersion: 'credential.active',
        },
        rows: {
            admissionStatus: 'Access status',
            trustLevel: 'Trust level',
            issuedAt: 'Issued at',
            status: 'Status',
            processing: 'Review state',
            confidence: 'Signal strength',
            purgedAt: 'Originals removed',
            notAvailable: 'Not available',
            pending: 'Pending',
            notPurged: 'Removal pending',
        },
    },
    ko: {
        loading: {
            badge: '내 스페이스',
            title: '스페이스를 여는 중입니다.',
            description: '검증된 신뢰를 불러오고 있습니다.',
        },
        gate: {
            badge: '증빙 검토 필요',
            title: '증빙 검토가 진행 중입니다.',
            description: '신뢰가 검증되면 SoulBound 스페이스가 열립니다.',
            currentStageLabel: '현재 단계',
            primaryLabel: '검토 진행 상황 확인',
            secondaryLabel: '가이드 보기',
        },
        intro: {
            badge: '내 스페이스',
            title: '스페이스가 열렸습니다.',
            description: '검증된 신뢰가 이곳에 남습니다. SOUL은 그 신뢰를 입장, 대화, 다음 연결로 이어줍니다.',
            note: '원본 서류는 검토 후 삭제됩니다. 신뢰에 필요한 검증 사실만 남습니다.',
        },
        access: {
            badge: '증빙 검토 완료',
            title: '입장을 뒷받침하는 증빙',
            description: '필요한 만큼만 남긴 검증 사실이 스페이스를 열어 둡니다.',
        },
        rooms: {
            title: '신뢰가 다음 문을 엽니다',
            counterpart: {
                title: '친구 추천 목록',
                description: '검증된 신뢰를 바탕으로 새로운 연결을 살펴봅니다.',
            },
            correspondence: {
                title: '다이렉트 메시지',
                description: '서로의 신뢰가 확인된 공간에서 대화를 이어갑니다.',
            },
            attestation: {
                title: '신뢰 노트',
                description: '실제 만남 이후 신뢰를 남깁니다.',
            },
            report: {
                title: '부정행위 신고',
                description: '신뢰를 해치는 행위를 신고합니다.',
            },
            revoke: {
                title: '참여 상태 관리',
                description: '참여를 멈추거나 철회를 요청할 수 있습니다. 필요한 정보만 확인합니다.',
            },
        },
        actions: {
            disabledReason: '아직 열리지 않음',
        },
        evidence: {
            badge: '검증된 신뢰',
            summaryLabel: '스페이스를 여는 신뢰의 보조 정보입니다.',
        },
        documentRecord: {
            title: '입장을 뒷받침하는 증빙',
            fallbackTitle: '문서',
            emptyDescription: '표시할 증빙이 아직 없습니다.',
        },
        receipt: {
            title: '검증된 신뢰 기록',
            issuedPending: '발급 대기',
            signatory: 'SoulBound 레지스트리',
            contractVersion: 'credential.active',
        },
        rows: {
            admissionStatus: '입장 상태',
            trustLevel: '신뢰 단계',
            issuedAt: '발급 시각',
            status: '상태',
            processing: '검토 상태',
            confidence: '신뢰 신호',
            purgedAt: '원본 삭제',
            notAvailable: '정보 없음',
            pending: '대기 중',
            notPurged: '삭제 대기',
        },
    },
} as const;

export function getDashboardCopy(locale: AppLocale) {
    return dashboardCopy[locale];
}
