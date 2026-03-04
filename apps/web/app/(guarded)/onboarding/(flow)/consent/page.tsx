'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, ConsentItem, SupportCTA, Toast, Skeleton, StageTransitionNotice } from '@/components/ui-kit';

export default function ConsentPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

    if (isLoading) {
        return (
            <main className="mx-auto max-w-md px-4 pt-20 sm:px-6 sm:pt-24">
                <div className="liquid-pane rounded-3xl p-6">
                    <Skeleton />
                </div>
            </main>
        );
    }

    if (status?.step !== 'CONSENT_HUB') {
        return (
            <StageTransitionNotice
                currentStep={status?.step}
                title="동의 단계로 이동 중입니다."
                description="현재 온보딩 진행도 기준으로 올바른 화면을 열어드립니다."
            />
        );
    }

    const isAllRequiredChecked = agreedTerms && agreedPrivacy;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAllRequiredChecked) return;

        setSubmitting(true);
        setToastMsg(null);

        try {
            const res = await fetch('/api/consent/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreedTerms, agreedPrivacy })
            });

            if (!res.ok) {
                throw new Error('CONSENT_REQUIRED');
            }

            setToastMsg({ text: '해당 내용이 감사 로그로 안전하게 기록되었습니다.', type: 'success' });
            // SSOT re-evaluation enforces progression
            await refetch();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'CONSENT_REQUIRED';
            handleActionError(message);
            setToastMsg({ text: '동의 내역 처리 중 오류가 발생했습니다. 다시 시도하십시오.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="liquid-pane liquid-rise flex-1 rounded-3xl p-5 sm:p-8">
                <Stepper currentStep={4} totalSteps={7} />

                <h1 className="liquid-title mb-2 text-[24px] font-semibold">이용 약관 및 정보 수집 동의.</h1>
                <p className="liquid-copy mb-8 text-[15px]">서비스 진행을 위해 필수 약관 사항을 숙지하고 동의해주십시오.</p>

                <form onSubmit={handleSubmit}>
                    <div className="mb-8">
                        <ConsentItem
                            label="[필수] SoulBound 서비스 이용 약관"
                            link="/terms"
                            checked={agreedTerms}
                            onChange={() => setAgreedTerms(!agreedTerms)}
                        />
                        <ConsentItem
                            label="[필수] 개인정보 수집 및 이용 동의"
                            link="/privacy"
                            checked={agreedPrivacy}
                            onChange={() => setAgreedPrivacy(!agreedPrivacy)}
                        />
                    </div>

                    <PrimaryButton type="submit" submitting={submitting} disabled={!isAllRequiredChecked || submitting}>
                        동의하고 넘어가기
                    </PrimaryButton>
                </form>
            </div>

            <SupportCTA />
        </main>
    );
}
