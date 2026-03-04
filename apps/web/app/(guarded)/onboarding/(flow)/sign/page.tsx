'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, SecondaryButton, DocumentViewer, SignaturePad, SupportCTA, Toast, Skeleton } from '@/components/ui-kit';

export default function SignPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [signatureData, setSignatureData] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

    if (isLoading || status?.step !== 'E_SIGN') {
        return <main className="max-w-md mx-auto pt-24 px-6"><Skeleton /></main>;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!signatureData) return;

        setSubmitting(true);
        setToastMsg(null);
        let isVersionMismatch = false;

        try {
            const res = await fetch('/api/contract/sign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signatureData })
            });

            if (!res.ok) {
                if (res.status === 409) {
                    isVersionMismatch = true;
                    throw new Error('VERSION_MISMATCH');
                }
                throw new Error('SERVER_ERROR');
            }

            setToastMsg({ text: '전자 서명 영수증이 생성되었습니다.', type: 'success' });
            // SSOT evaluation enforces progression.
            setTimeout(() => refetch(), 1500);
        } catch (err: any) {
            handleActionError(err.message);
            if (!isVersionMismatch) {
                setToastMsg({ text: '서명 제출 중 오류가 발생했습니다. 다시 시도해주십시오.', type: 'error' });
            }
        } finally {
            if (!isVersionMismatch) {
                setSubmitting(false);
            }
        }
    };

    const handleClearSignature = () => {
        setSignatureData(null);
    };

    // Ensure user cannot proceed if blockers exist
    const isBlocked = status.blockers.includes('SIGNATURE_MISSING');

    return (
        <main className="max-w-md mx-auto pt-16 px-6 pb-12 flex flex-col min-h-screen">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="flex-1">
                <Stepper currentStep={5} totalSteps={7} />

                <h1 className="text-[24px] font-semibold tracking-tight text-[#111111] mb-2">최종 계약 항목 및 서명 기입.</h1>
                <p className="text-[15px] text-[#555555] mb-8">문서 내용을 숙지하였으며 제출 시 법적 효력이 발생함에 상호 동의합니다. 지정된 영역에 서명하십시오.</p>

                <DocumentViewer text="제 1 조 (목적)\n본 계약은 Beautiful Mind 서비스의 안정적인 제공과 회원의 권리 보호를 목적으로 합니다.\n\n제 2 조 (효력)\n회원이 본 문서 하단에 전자 서명을 기입하고 제출을 완료하는 즉시 계약의 효력이 발생합니다. 이 서명 내역은 영구 보존되는 감사 로그에 안전하게 격리되어 보관됩니다." />

                <form onSubmit={handleSubmit}>
                    <SignaturePad onSign={(data) => setSignatureData(data)} />

                    <div className="flex flex-col gap-3">
                        <PrimaryButton type="submit" submitting={submitting} disabled={!signatureData || submitting || (!isBlocked && submitting)}>
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
