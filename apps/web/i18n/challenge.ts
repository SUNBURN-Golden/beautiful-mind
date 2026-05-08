import type { AppLocale } from './config';

type ChallengeCopy = {
    title: string;
    eyebrow: string;
    description: string;
    targetLabel: string;
    targetHelper: string;
    targetPlaceholder: string;
    claimLabel: string;
    claimHelper: string;
    claimPlaceholder: string;
    evidenceLabel: string;
    evidenceHelper: string;
    evidencePlaceholder: string;
    noteLabel: string;
    noteHelper: string;
    notePlaceholder: string;
    warningTitle: string;
    warningBody: string;
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
        title: 'Challenge a trust claim.',
        eyebrow: 'Structured trust review',
        description: 'Use this when a claim needs review. A challenge should be specific, grounded, and serious.',
        targetLabel: 'Person or account reference',
        targetHelper: 'Early flow: paste the operational user reference for the person connected to this claim.',
        targetPlaceholder: 'Paste account reference',
        claimLabel: 'Trust claim reference',
        claimHelper: 'Early flow: paste the claim reference that should be reviewed.',
        claimPlaceholder: 'Paste claim reference',
        evidenceLabel: 'Evidence for review',
        evidenceHelper: 'Summarize what makes this claim questionable. Keep it factual.',
        evidencePlaceholder: 'Describe the proof or context',
        noteLabel: 'Additional context',
        noteHelper: 'Optional. Add only details that help reviewers understand the challenge.',
        notePlaceholder: 'Optional context',
        warningTitle: 'Challenges are not casual reports.',
        warningBody: 'Opening one may freeze or audit trust claims while reviewers inspect the evidence.',
        submitLabel: 'Open trust challenge',
        submittingLabel: 'Submitting',
        successTitle: 'Trust challenge submitted',
        successBody: 'Your challenge has been recorded for review.',
        error: 'We couldn\'t load this page.',
        challengeError: 'Challenge failed. Please try again.',
        loading: 'Loading',
    },
    ko: {
        title: '신뢰 주장을 이의제기합니다.',
        eyebrow: '구조화된 신뢰 검토',
        description: '검토가 필요한 주장에만 사용하세요. 이의제기는 구체적이고 근거가 있어야 합니다.',
        targetLabel: '대상 계정 식별자',
        targetHelper: '초기 흐름입니다. 이 주장과 연결된 사람의 운영용 식별자를 붙여 넣으세요.',
        targetPlaceholder: '계정 식별자 붙여넣기',
        claimLabel: '신뢰 주장 식별자',
        claimHelper: '초기 흐름입니다. 검토가 필요한 주장 식별자를 붙여 넣으세요.',
        claimPlaceholder: '주장 식별자 붙여넣기',
        evidenceLabel: '검토할 근거',
        evidenceHelper: '무엇이 문제인지 사실 중심으로 설명하세요.',
        evidencePlaceholder: '증빙이나 맥락을 설명하세요',
        noteLabel: '추가 맥락',
        noteHelper: '선택 사항입니다. 검토에 도움이 되는 내용만 적어 주세요.',
        notePlaceholder: '선택 사항 맥락',
        warningTitle: '이의제기는 가벼운 신고가 아닙니다.',
        warningBody: '검토자가 근거를 확인하는 동안 신뢰 주장이 동결되거나 감사될 수 있습니다.',
        submitLabel: '신뢰 이의제기 열기',
        submittingLabel: '제출 중',
        successTitle: '신뢰 이의제기가 제출되었습니다',
        successBody: '이의제기가 검토 대상으로 기록되었습니다.',
        error: '페이지를 불러오지 못했습니다.',
        challengeError: '이의제기에 실패했습니다. 다시 시도해 주세요.',
        loading: '불러오는 중',
    },
};

export function getChallengeCopy(locale: AppLocale): ChallengeCopy {
    return CHALLENGE_COPY[locale];
}
