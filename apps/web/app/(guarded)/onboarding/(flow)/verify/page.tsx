'use client';

import { useState } from 'react';
import * as PortOne from '@portone/browser-sdk/v2';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, Input, SupportCTA, Toast, Skeleton } from '@/components/ui-kit';

export default function VerifyPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

    if (isLoading || status?.step !== 'KYC') {
        return (
            <main className="mx-auto max-w-md px-4 pt-20 sm:px-6 sm:pt-24">
                <div className="liquid-pane rounded-3xl p-6">
                    <Skeleton />
                </div>
            </main>
        );
    }

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setToastMsg(null);

        try {
            const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
            const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
            if (!storeId || !channelKey) {
                throw new Error('PORTONE_ENV_MISSING');
            }

            const verificationId = `verify-${crypto.randomUUID()}`;
            const portOneResponse = await PortOne.requestIdentityVerification({
                storeId,
                channelKey,
                identityVerificationId: verificationId,
            });

            if (portOneResponse?.code !== undefined) {
                setToastMsg({ text: `인증 실패: ${portOneResponse.message}`, type: 'error' });
                return;
            }

            const identityVerificationId = portOneResponse?.identityVerificationId;
            if (!identityVerificationId) {
                setToastMsg({ text: '인증이 취소되었거나 완료되지 않았습니다.', type: 'info' });
                return;
            }

            const res = await fetch('/api/verify/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identityVerificationId,
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
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'KYC_FAILED';
            handleActionError(message);
            if (message === 'PORTONE_ENV_MISSING') {
                setToastMsg({ text: '운영 환경설정(PORTONE)이 누락되어 인증을 진행할 수 없습니다.', type: 'error' });
                return;
            }
            setToastMsg({ text: '인증 기관의 무응답이거나 정보 불일치입니다. 다시 시도해주십시오.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="liquid-pane liquid-rise flex-1 rounded-3xl p-5 sm:p-8">
                <Stepper currentStep={2} totalSteps={7} />

                <h1 className="liquid-title mb-2 text-[24px] font-semibold">본인 확인 절차를 진행합니다.</h1>
                <p className="liquid-copy mb-12 text-[15px]">명의 도용 방지를 위해 실명 인증이 요구됩니다. 인증 결과는 증적 로그로 남습니다.</p>

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
                        <PrimaryButton type="submit" submitting={submitting} disabled={submitting}>
                            인증 시작
                        </PrimaryButton>
                    </div>
                </form>
            </div>

            <SupportCTA />
        </main>
    );
}
