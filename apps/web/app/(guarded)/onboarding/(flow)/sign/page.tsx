'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, SecondaryButton, DocumentViewer, SignaturePad, SupportCTA, Toast, Skeleton, StageTransitionNotice } from '@/components/ui-kit';

export default function SignPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [signatureData, setSignatureData] = useState<string | null>(null);
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

    if (status?.step !== 'E_SIGN') {
        return (
            <StageTransitionNotice
                currentStep={status?.step}
                title="전자서명 단계로 이동 중입니다."
                description="계약서 상태를 확인하고 맞는 단계로 자동 이동합니다."
            />
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signatureData) return;

        setSubmitting(true);
        setToastMsg(null);
        try {
            const res = await fetch('/api/contract/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureData })
            });

            if (!res.ok) {
                if (res.status === 409) {
                    throw new Error('VERSION_MISMATCH');
                }
                throw new Error('SERVER_ERROR');
            }

            setToastMsg({ text: '전자 서명 영수증이 생성되었습니다.', type: 'success' });
            // SSOT evaluation enforces progression.
            setTimeout(() => refetch(), 1500);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'SERVER_ERROR';
            handleActionError(message);
            if (message === 'VERSION_MISMATCH') {
                setToastMsg({ text: '문서 버전이 갱신되었습니다. 상태를 다시 불러옵니다.', type: 'info' });
                await refetch();
            } else {
                setToastMsg({ text: '서명 제출 중 오류가 발생했습니다. 다시 시도해주십시오.', type: 'error' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleClearSignature = () => {
        setSignatureData(null);
    };

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="liquid-pane liquid-rise flex-1 rounded-3xl p-5 sm:p-8">
                <Stepper currentStep={5} totalSteps={7} />

                <h1 className="liquid-title mb-2 text-[24px] font-semibold">최종 계약 항목 및 서명 기입.</h1>
                <p className="liquid-copy mb-8 text-[15px]">문서 내용을 숙지하였으며 제출 시 법적 효력이 발생함에 상호 동의합니다. 지정된 영역에 서명하십시오.</p>

                <DocumentViewer text="제 1 조 (목적)\n본 계약은 SoulBound 서비스의 안정적인 제공과 회원의 권리 보호를 목적으로 합니다.\n\n제 2 조 (효력)\n회원이 본 문서 하단에 전자 서명을 기입하고 제출을 완료하는 즉시 계약의 효력이 발생합니다. 이 서명 내역은 영구 보존되는 감사 로그에 안전하게 격리되어 보관됩니다." />

                <form onSubmit={handleSubmit}>
                    <SignaturePad onSign={(data) => setSignatureData(data)} />

                    <div className="flex flex-col gap-3">
                        <PrimaryButton type="submit" submitting={submitting} disabled={!signatureData || submitting}>
                            서명 제출
                        </PrimaryButton>
                        {signatureData && (
                            <SecondaryButton type="button" onClick={handleClearSignature} disabled={submitting}>
                                서명 다시 쓰기
                            </SecondaryButton>
                        )}
                    </div>
                </form>
            </div>

            <SupportCTA />
        </main>
    );
}
