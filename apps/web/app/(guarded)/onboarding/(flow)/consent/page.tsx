'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, ConsentItem, SupportCTA, Toast, Skeleton } from '@/components/ui-kit';

export default function ConsentPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedPrivacy, setAgreedPrivacy] = useState(false);

    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

    if (isLoading || status?.step !== 'CONSENT_HUB') {
        return <main className="max-w-md mx-auto pt-24 px-6"><Skeleton /></main>;
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
        } catch (err: any) {
            handleActionError(err.message);
            setToastMsg({ text: '동의 내역 처리 중 오류가 발생했습니다. 다시 시도하십시오.', type: 'error' });
            setSubmitting(false);
        }
    };

    return (
        <main className="max-w-md mx-auto pt-16 px-6 pb-12 flex flex-col min-h-screen">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="flex-1">
                <Stepper currentStep={4} totalSteps={7} />

                <h1 className="text-[24px] font-semibold tracking-tight text-[#111111] mb-2">이용 약관 및 정보 수집 동의.</h1>
                <p className="text-[15px] text-[#555555] mb-8">서비스 진행을 위해 필수 약관 사항을 숙지하고 동의해주십시오.</p>

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
