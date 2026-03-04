'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, Input, SupportCTA, Toast, Skeleton } from '@/components/ui-kit';

export default function VerifyPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

    if (isLoading || status?.step !== 'KYC') {
        return <main className="max-w-md mx-auto pt-24 px-6"><Skeleton /></main>;
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setToastMsg(null);

        try {
            const res = await fetch('/api/verify/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identityVerificationId: 'mock_success'
                })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error?.message || 'KYC_FAILED');
            }

            // SUCCESS: Show toast immediately upon 200 OK
            setToastMsg({ text: '해당 내용이 감사 로그로 안전하게 기록되었습니다.', type: 'success' });

            // Re-evaluate SSOT status to trigger stage progression
            await refetch();
        } catch (err: any) {
            handleActionError(err.message);
            setToastMsg({ text: '인증 기관의 무응답이거나 정보 불일치입니다. 다시 시도해주십시오.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const isBlocked = status?.blockers?.includes('IDENTITY_UNVERIFIED');

    return (
        <main className="max-w-md mx-auto pt-16 px-6 pb-12 flex flex-col min-h-screen">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="flex-1">
                <Stepper currentStep={2} totalSteps={7} />

                <h1 className="text-[24px] font-semibold tracking-tight text-[#111111] mb-2">본인 확인 절차를 진행합니다.</h1>
                <p className="text-[15px] text-[#555555] mb-12">명의 도용 방지를 위해 실명 인증이 요구됩니다. 인증 결과는 증적 로그로 남습니다.</p>

                <form onSubmit={handleVerify}>
                    <Input
                        label="성명"
                        placeholder="홍길동"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                        disabled={submitting}
                    />
                    <Input
                        label="통신사 휴대폰 번호"
                        placeholder="010-0000-0000"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        required
                        disabled={submitting}
                    />
                    <div className="mt-8">
                        <PrimaryButton type="submit" submitting={submitting} disabled={!isBlocked && submitting}>
                            인증 시작
                        </PrimaryButton>
                    </div>
                </form>
            </div>

            <SupportCTA />
        </main>
    );
}
