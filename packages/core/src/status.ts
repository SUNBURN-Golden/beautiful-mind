export type UserProfile = {
    verified: boolean;
    reputation_score: number;
};

export type UserConsent = {
    osint_granted: boolean;
    location_granted: boolean;
    device_granted: boolean;
};

export type UserContract = {
    agreed_to_terms: boolean;
    signature_base64: string | null;
};

export type UserInterview = {
    decision: 'APPROVED' | 'PENDING' | 'REJECTED';
    score: number;
};

export type OnboardingStatus =
    | 'PENDING_CONSENT'
    | 'PENDING_CONTRACT'
    | 'PENDING_INTERVIEW'
    | 'PENDING_VERIFICATION'
    | 'COMPLETED'
    | 'REJECTED';

/**
 * 사용자 상태 판별 순수 함수 (Pure Function)
 * 프론트엔드가 아닌 서버에서만 로드하여 시스템 상태 무결성 보장.
 */
export function calculateUserStatus(
    profile: UserProfile,
    consent: UserConsent,
    contract: UserContract,
    interview: UserInterview | null
): OnboardingStatus {
    // 1. 필수 동의 확인
    if (!consent.osint_granted || !consent.location_granted || !consent.device_granted) {
        return 'PENDING_CONSENT';
    }

    // 2. 확약서 서명 확인
    if (!contract.agreed_to_terms || !contract.signature_base64) {
        return 'PENDING_CONTRACT';
    }

    // 3. 인터뷰(AI 판별) 내역 확인
    if (!interview || interview.decision === 'PENDING') {
        return 'PENDING_INTERVIEW';
    }

    if (interview.decision === 'REJECTED') {
        return 'REJECTED';
    }

    // 4. 본인 확인(외부 인증) 여부
    if (!profile.verified) {
        return 'PENDING_VERIFICATION';
    }

    // 모두 통과
    return 'COMPLETED';
}

/**
 * 상호 평가 기반 신뢰 티어 점수 계산 순수 함수
 * 기본 평판 점수에 인터뷰 평가 등 가중치를 합산
 */
export function calculateTierScore(
    baseReputation: number,
    interviewScore: number,
    abuseReportsCount: number
): number {
    if (abuseReportsCount > 3) {
        return Math.max(0, baseReputation - 50); // 심각한 페널티
    }

    // 인터뷰 점수를 0~100 사이 비율로 환산 후 가중치 부여 (Max 20점 보너스 추가)
    const interviewBonus = (interviewScore / 100) * 20;

    // 리포트 횟수 1회당 10점 차감
    const penalty = abuseReportsCount * 10;

    const finalScore = baseReputation + interviewBonus - penalty;

    // 점수 상/하한선 (0 ~ 120)
    return Math.min(Math.max(0, finalScore), 120);
}
