import type { AppLocale } from './config';

type ChallengeCopy = {
    title: string;
    targetLabel: string;
    targetPlaceholder: string;
    claimLabel: string;
    claimPlaceholder: string;
    evidenceLabel: string;
    evidencePlaceholder: string;
    noteLabel: string;
    notePlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    successTitle: string;
    successBody: string;
    error: string;
    challengeError: string;
    loading: string;
};

const CHALLENGE_COPY: Record<AppLocale, ChallengeCopy> = {
    en: {
        title: 'Challenge a claim',
        targetLabel: 'Target user ID',
        targetPlaceholder: 'Enter user ID',
        claimLabel: 'Claim ID',
        claimPlaceholder: 'Enter claim ID',
        evidenceLabel: 'Evidence reference',
        evidencePlaceholder: 'Describe your evidence',
        noteLabel: 'Note',
        notePlaceholder: 'Optional additional context',
        submitLabel: 'Submit challenge',
        submittingLabel: 'Submitting',
        successTitle: 'Challenge submitted',
        successBody: 'Your challenge has been recorded and will be reviewed.',
        error: 'We couldn\'t load this page.',
        challengeError: 'Challenge failed. Please try again.',
        loading: 'Loading',
    },
    ko: {
        title: '주장 이의제기',
        targetLabel: '대상 사용자 ID',
        targetPlaceholder: '사용자 ID를 입력하세요',
        claimLabel: '주장 ID',
        claimPlaceholder: '주장 ID를 입력하세요',
        evidenceLabel: '증거 참조',
        evidencePlaceholder: '증거를 설명하세요',
        noteLabel: '참고',
        notePlaceholder: '선택 사항 추가 정보',
        submitLabel: '이의제기 제출',
        submittingLabel: '제출 중',
        successTitle: '이의제기가 제출되었습니다',
        successBody: '이의제기가 기록되었으며 검토될 예정입니다.',
        error: '페이지를 불러오지 못했습니다.',
        challengeError: '이의제기에 실패했습니다. 다시 시도해 주세요.',
        loading: '불러오는 중',
    },
};

export function getChallengeCopy(locale: AppLocale): ChallengeCopy {
    return CHALLENGE_COPY[locale];
}
