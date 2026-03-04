'use server'

import {
    calculateUserStatus,
    calculateTierScore,
    UserProfile,
    UserConsent,
    UserContract,
    UserInterview
} from '@soulbound/core';

/**
 * Server Action Bridge
 * 클라이언트(브라우저)에서 핵심 로직 다이렉트 호출/우회를 막기 위해 
 * Server Actions를 통해서만 상태 계산 및 DB 저장을 수행합니다.
 */

export async function updateUserStatus(
    userId: string,
    profile: UserProfile,
    consent: UserConsent,
    contract: UserContract,
    interview: UserInterview | null
) {
    // 1. 코어 논리 패키지에서 순수 함수 실행
    const newStatus = calculateUserStatus(profile, consent, contract, interview);

    // 2. [가상 DB 연동 로직] 실제로는 Supabase 클라이언트를 통해 DB UPDATE 진행
    // const supabase = createClient();
    // await supabase.from('profiles').update({ status: newStatus }).eq('id', userId);

    console.log(`[Server Action] User ${userId} status updated to: ${newStatus}`);

    return { success: true, status: newStatus };
}

export async function updateTierScore(
    userId: string,
    baseReputation: number,
    interviewScore: number,
    abuseReportsCount: number
) {
    // 1. 코어 패키지에서 신뢰도 티어 계산
    const tierScore = calculateTierScore(baseReputation, interviewScore, abuseReportsCount);

    // 2. DB 업데이트 로직 (생략)
    // await supabase.from('profiles').update({ reputation_score: tierScore }).eq('id', userId);

    console.log(`[Server Action] User ${userId} tier score updated to: ${tierScore}`);

    return { success: true, tierScore };
}
