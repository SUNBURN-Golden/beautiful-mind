'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, SecondaryButton, SupportCTA, Toast, Skeleton } from '@/components/ui-kit';

const VERIFICATION_TYPES = ['RESIDENCE', 'PHYSICAL', 'CAREER', 'EDUCATION'] as const;
type VerificationType = (typeof VERIFICATION_TYPES)[number];

export default function QualificationPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

    if (isLoading || status?.step !== 'QUALIFICATION') {
        return (
            <main className="mx-auto max-w-md px-4 pt-20 sm:px-6 sm:pt-24">
                <div className="liquid-pane rounded-3xl p-6">
                    <Skeleton />
                </div>
            </main>
        );
    }

    const missingTypeValue = status?.details?.missing_types;
    const missingTypes: string[] = Array.isArray(missingTypeValue)
        ? missingTypeValue.filter((type): type is string => typeof type === 'string')
        : [];

    const requiredTypes: VerificationType[] = (missingTypes.length > 0 ? missingTypes : ['RESIDENCE', 'PHYSICAL', 'CAREER_OR_EDUCATION'])
        .flatMap((type) => (type === 'CAREER_OR_EDUCATION' ? ['CAREER'] : [type]))
        .filter((type, idx, arr): type is VerificationType => (
            VERIFICATION_TYPES.includes(type as VerificationType) &&
            arr.indexOf(type) === idx
        ));

    const submitQualifications = async (isMock: boolean = false) => {
        if (!file && !isMock) return;

        setSubmitting(true);
        setToastMsg(null);

        try {
            const targetTypes = requiredTypes.length > 0 ? requiredTypes : ['RESIDENCE', 'PHYSICAL', 'CAREER'];

            for (const type of targetTypes) {
                const formData = new FormData();
                if (file) formData.append('file', file);
                if (isMock) formData.append('skip_file', 'true');
                formData.append('type', type);

                const res = await fetch('/api/verify/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!res.ok) {
                    throw new Error('UPLOAD_ERROR');
                }

                if (!isMock) {
                    const uploadPayload = await res.json().catch(() => ({} as { verification_id?: unknown }));
                    const verificationId = typeof uploadPayload?.verification_id === 'string'
                        ? uploadPayload.verification_id
                        : null;

                    if (!verificationId) {
                        throw new Error('UPLOAD_RESPONSE_INVALID');
                    }

                    const submitRes = await fetch('/api/verify/submit', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ verification_id: verificationId }),
                    });

                    if (!submitRes.ok) {
                        const submitPayload = await submitRes.json().catch(() => ({}));
                        const submitCode = typeof submitPayload?.error?.code === 'string'
                            ? submitPayload.error.code
                            : 'VERIFY_SUBMIT_FAILED';
                        throw new Error(submitCode);
                    }
                }
            }

            setToastMsg({
                text: `요청된 자격 항목(${targetTypes.join(', ')}) 제출 및 자동 1차 검토가 완료되었습니다. 관리자 승인 후 다음 단계로 이동됩니다.`,
                type: 'success',
            });
            // SSOT re-evaluation enforces progression
            await refetch();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'UPLOAD_ERROR';
            handleActionError(message);
            if (message === 'PII_DETECTED') {
                setToastMsg({ text: '주민등록번호 패턴이 감지되어 즉시 반려되었습니다. 민감정보를 마스킹 후 다시 제출하십시오.', type: 'error' });
                setSubmitting(false);
                return;
            }
            setToastMsg({ text: '파일 업로드 중 오류가 발생했습니다. 다시 시도하십시오.', type: 'error' });
            setSubmitting(false);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitQualifications(false);
    };

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-12 pt-12 sm:px-6 sm:pt-16">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="liquid-pane liquid-rise flex-1 rounded-3xl p-5 sm:p-8">
                <Stepper currentStep={3} totalSteps={7} />

                <h1 className="liquid-title mb-2 text-[24px] font-semibold">필수 자격 서류 제출.</h1>
                <p className="liquid-copy mb-8 text-[15px]">해당되는 문서 파일을 업로드하여 주십시오. (JPG, PDF 포맷 한정)</p>
                <p className="mb-6 text-[13px] text-slate-600">현재 제출 대상: {requiredTypes.join(', ') || 'RESIDENCE, PHYSICAL, CAREER'}</p>

                <form onSubmit={handleUpload}>
                    <div className="relative mb-8 flex h-32 w-full items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white transition-colors hover:border-[#06c]">
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            disabled={submitting}
                        />
                        <div className="pointer-events-none text-[14px] text-slate-600">
                            {file ? file.name : "클릭하여 파일 업로드"}
                        </div>
                    </div>

                    <PrimaryButton type="submit" submitting={submitting} disabled={!file || submitting}>
                        서류 제출
                    </PrimaryButton>

                    {/* Debug mock skip - Gated for safety */}
                    {process.env.NEXT_PUBLIC_ALLOW_TEST_FEATURES === 'true' && (
                        <div className="mt-4">
                            <SecondaryButton type="button" onClick={() => submitQualifications(true)} disabled={submitting}>
                                [테스트용] 제출 건너뛰기
                            </SecondaryButton>
                        </div>
                    )}
                </form>
            </div>

            <SupportCTA />
        </main>
    );
}
