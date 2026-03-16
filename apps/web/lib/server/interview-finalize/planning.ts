import type { DevelopmentAction, MatchAdjustmentHints } from './types.ts';

export function buildDevelopmentActionPlan(params: {
    focusTopics: string[];
    riskFlags: string[];
    receivedReviewAvg: number | null;
    scoreDelta: number | null;
    vibeOverlap: number | null;
}): DevelopmentAction[] {
    const actions: DevelopmentAction[] = [];
    const seen = new Set<string>();

    const pushAction = (next: DevelopmentAction) => {
        if (seen.has(next.action_id)) return;
        seen.add(next.action_id);
        actions.push(next);
    };

    const topicActionMap: Record<string, DevelopmentAction> = {
        BOUNDARIES_AND_SIGNALING: {
            action_id: 'BOUNDARY_SIGNAL_SCRIPT',
            title: '경계 신호 스크립트 정리',
            reason: '불편 신호를 빠르게 전달하는 문장을 고정하면 초기 마찰을 줄일 수 있습니다.',
            metric: '초기 대화 불편 이벤트 발생률',
            target: '2주 내 20% 감소',
            horizon_days: 14,
            priority: 'P1',
        },
        EXPECTATION_ALIGNMENT: {
            action_id: 'EXPECTATION_ALIGNMENT_CHECK',
            title: '초기 기대치 체크 질문 고정',
            reason: '상대와 기준 불일치가 누적되기 전에 기대치를 명시적으로 조율합니다.',
            metric: '첫 3회 대화 내 기준 합의 여부',
            target: '매칭의 80% 이상 합의 확인',
            horizon_days: 14,
            priority: 'P1',
        },
        CONFLICT_TRIGGERS: {
            action_id: 'TRIGGER_LOG',
            title: '갈등 트리거 로그 작성',
            reason: '갈등 유발 상황을 기록하면 반복되는 패턴을 빠르게 차단할 수 있습니다.',
            metric: '반복 트리거 재발률',
            target: '30일 내 30% 감소',
            horizon_days: 30,
            priority: 'P1',
        },
        STRENGTH_SIGNAL_CLARITY: {
            action_id: 'STRENGTH_SIGNAL_REWRITE',
            title: '강점 시그널 문장 재작성',
            reason: '본인 강점이 구체적으로 드러나면 상호 호감 초기 형성률이 상승합니다.',
            metric: '긍정 태그 비율',
            target: '다음 10건 리뷰에서 +15%',
            horizon_days: 21,
            priority: 'P2',
        },
        SELF_MODEL_RELIABILITY: {
            action_id: 'SELF_MODEL_EVIDENCE',
            title: '자기인식 근거 보강',
            reason: '자기 진단 근거가 약하면 인터뷰 결과와 실제 상호작용 간 편차가 커집니다.',
            metric: '인터뷰-리뷰 일치도',
            target: '다음 인터뷰에서 일치도 0.2p 상승',
            horizon_days: 21,
            priority: 'P0',
        },
    };

    for (const topic of params.focusTopics) {
        const mapped = topicActionMap[topic];
        if (mapped) pushAction(mapped);
    }

    if (params.riskFlags.includes('LOW_RECIPROCITY_FEEDBACK') || (params.receivedReviewAvg !== null && params.receivedReviewAvg < 2.6)) {
        pushAction({
            action_id: 'RECIPROCITY_REPAIR',
            title: '상호성 피드백 복구',
            reason: '상대 만족도 하락 신호가 누적되어 high-trust 승급 경로에서 리스크가 커진 상태입니다.',
            metric: '받은 리뷰 평균 점수',
            target: '다음 8건에서 3.2 이상 회복',
            horizon_days: 30,
            priority: 'P0',
        });
    }

    if (params.riskFlags.includes('LOW_BEHAVIORAL_CONFIDENCE')) {
        pushAction({
            action_id: 'LOW_CONFIDENCE_DATA_BOOTSTRAP',
            title: '행동 데이터 샘플 확보',
            reason: '샘플 수와 최신성이 부족해 예측 신뢰도가 낮습니다.',
            metric: 'self-development confidence',
            target: '0.55 이상',
            horizon_days: 21,
            priority: 'P0',
        });
    }

    if (params.scoreDelta !== null && params.scoreDelta <= -8) {
        pushAction({
            action_id: 'SCORE_DRIFT_REVIEW',
            title: '인터뷰 점수 드리프트 점검',
            reason: '직전 인터뷰 대비 절대 점수가 큰 폭으로 하락했습니다.',
            metric: 'score delta',
            target: '다음 인터뷰에서 -3 이내',
            horizon_days: 14,
            priority: 'P1',
        });
    }

    if (params.vibeOverlap !== null && params.vibeOverlap < 0.2) {
        pushAction({
            action_id: 'VIBE_CONSISTENCY',
            title: '바이브 태그 일관성 점검',
            reason: '연속 인터뷰의 vibe tag 겹침이 낮아 자기 모델 일관성이 떨어집니다.',
            metric: 'vibe overlap',
            target: '다음 인터뷰 0.35 이상',
            horizon_days: 21,
            priority: 'P2',
        });
    }

    const priorityRank: Record<DevelopmentAction['priority'], number> = { P0: 0, P1: 1, P2: 2 };
    return actions
        .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
        .slice(0, 5);
}

export function buildMatchAdjustmentHints(params: {
    confidence: number;
    sampleSize: number;
    positiveTags: string[];
    frictionTags: string[];
    focusTopics: string[];
    riskFlags: string[];
    groundingCoverage: number;
}): MatchAdjustmentHints {
    const severeFlags = ['LOW_RECIPROCITY_FEEDBACK', 'LOW_BEHAVIORAL_CONFIDENCE'];
    const hasSevereFlag = params.riskFlags.some((flag) => severeFlags.includes(flag));

    let explorationBias: MatchAdjustmentHints['exploration_bias'] = 'NORMAL';
    if (hasSevereFlag || params.confidence < 0.45 || params.sampleSize < 6 || params.groundingCoverage < 0.65) {
        explorationBias = 'HIGH';
    } else if (params.confidence > 0.78 && params.sampleSize >= 16 && params.groundingCoverage >= 0.8) {
        explorationBias = 'LOW';
    }

    const confidenceWeightOverride = Number(
        Math.max(
            0.75,
            Math.min(
                1.15,
                (0.85 + (params.confidence * 0.3)) -
                (hasSevereFlag ? 0.08 : 0) -
                (params.groundingCoverage < 0.65 ? 0.1 : 0),
            ),
        ).toFixed(3),
    );

    return {
        exploration_bias: explorationBias,
        confidence_weight_override: confidenceWeightOverride,
        avoid_tags: params.frictionTags.slice(0, 6),
        prefer_tags: params.positiveTags.slice(0, 6),
        focus_topics: params.focusTopics.slice(0, 4),
        risk_flags: params.riskFlags.filter((flag) => severeFlags.includes(flag)),
    };
}
