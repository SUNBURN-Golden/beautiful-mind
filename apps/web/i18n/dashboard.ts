import type { AppLocale } from './config';

const dashboardCopy = {
    en: {
        loading: {
            badge: 'Access board',
            title: 'We are reading the current standing.',
            description: 'The board opens once the present record, the eligibility marks, and the verified signals are on file.',
        },
        gate: {
            badge: 'Access withheld',
            title: 'The access board is not yet open.',
            description: 'This room opens only after the active standing is recorded. Until then, the current admission step remains the controlling record.',
            currentStageLabel: 'Current stage',
            primaryLabel: 'Open the current record',
            secondaryLabel: 'Open the guide',
        },
        intro: {
            badge: 'Access board',
            title: 'The present standing remains on file.',
            description: 'This room gathers the current trust state, the satisfied thresholds, and the documentary traces that keep the next rooms open.',
            note: 'Original source documents do not remain here. What stays is the minimal record required for standing, credential issuance, and audit.',
        },
        access: {
            badge: 'Recorded thresholds',
            title: 'Eligibility and open rooms',
            description: 'Only thresholds already satisfied on record appear here. The rooms below remain tied to the current standing.',
        },
        rooms: {
            title: 'Rooms on the current standing',
            counterpart: {
                title: 'Counterpart proposals',
                description: 'Review the current counterpart proposals attached to this standing.',
            },
            correspondence: {
                title: 'Correspondence room',
                description: 'Continue a room that is already open on the present record.',
            },
            attestation: {
                title: 'Trust attestation register',
                description: 'Record a trust statement against the present standing.',
            },
            report: {
                title: 'Trust report register',
                description: 'Submit a factual report tied to the current standing.',
            },
            revoke: {
                title: 'Participation record',
                description: 'Review or revise the current participation controls.',
            },
        },
        actions: {
            disabledReason: 'Not available yet',
        },
        evidence: {
            badge: 'Audit trail',
            summaryLabel: 'Receipt records and signal traces that support the current standing.',
        },
        documentRecord: {
            title: 'Document record',
            fallbackTitle: 'Document',
            emptyDescription: 'No document reference row is attached to this board.',
        },
        receipt: {
            title: 'Current standing receipt',
            issuedPending: 'Issue pending',
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
            badge: '접근 보드',
            title: '현재 상태 기록을 읽고 있습니다.',
            description: '현재 기록, 자격 표식, 검증 신호가 정리되면 이 보드가 열립니다.',
        },
        gate: {
            badge: '접근 보류',
            title: '접근 보드가 아직 열리지 않았습니다.',
            description: '이 방은 활성 상태가 기록된 뒤에만 열립니다. 그 전까지는 현재 심사 단계가 기준 기록으로 남아 있습니다.',
            currentStageLabel: '현재 단계',
            primaryLabel: '현재 기록을 엽니다',
            secondaryLabel: '가이드를 엽니다',
        },
        intro: {
            badge: '접근 보드',
            title: '현재 상태가 기록상 유지되고 있습니다.',
            description: '이 방은 현재의 신뢰 상태, 이미 충족된 문턱, 다음 방을 열어 두는 문서 흔적을 함께 모아 둡니다.',
            note: '원본 서류는 이곳에 남지 않습니다. 남는 것은 상태, 크리덴셜 발급, 감사에 필요한 최소 기록뿐입니다.',
        },
        access: {
            badge: '기록된 문턱',
            title: '자격과 열려 있는 방',
            description: '기록상 이미 충족된 문턱만 여기에 나타납니다. 아래의 방들은 현재 상태 기록에 계속 연결되어 있습니다.',
        },
        rooms: {
            title: '현재 상태에서 열려 있는 방',
            counterpart: {
                title: '상대 제안 기록',
                description: '현재 상태에 연결된 상대 제안을 검토합니다.',
            },
            correspondence: {
                title: '서신 방',
                description: '현재 기록에서 이미 열린 대화를 이어갑니다.',
            },
            attestation: {
                title: '신뢰 확인 기록부',
                description: '현재 상태를 기준으로 신뢰 진술을 기록합니다.',
            },
            report: {
                title: '신뢰 신고 기록부',
                description: '현재 상태에 연결된 사실 보고를 제출합니다.',
            },
            revoke: {
                title: '참여 기록',
                description: '현재 참여 제어 상태를 검토하거나 조정합니다.',
            },
        },
        actions: {
            disabledReason: '아직 열리지 않았습니다',
        },
        evidence: {
            badge: '감사 추적',
            summaryLabel: '현재 상태를 뒷받침하는 영수증 기록과 신호 추적입니다.',
        },
        documentRecord: {
            title: '문서 기록',
            fallbackTitle: '문서',
            emptyDescription: '이 보드에 연결된 문서 참조 행이 아직 없습니다.',
        },
        receipt: {
            title: '현재 상태 영수증',
            issuedPending: '발급 대기',
            signatory: 'SoulBound 등록부',
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
