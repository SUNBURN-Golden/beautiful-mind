'use client';

import { useState } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, SecondaryButton, SupportCTA, Toast, Skeleton } from '@/components/ui-kit';

export default function QualificationPage() {
    const { status, isLoading, refetch, handleActionError } = useStatus();

    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);

    if (isLoading || status?.step !== 'QUALIFICATION') {
        return <main className="max-w-md mx-auto pt-24 px-6"><Skeleton /></main>;
    }

    const requirements = status.meta?.required_verifications || [];
    const isBlocked = status.blockers.includes('DOCUMENT_MISSING') || requirements.length > 0;

    const handleUpload = async (e: React.FormEvent, isMock: boolean = false) => {
        e.preventDefault();
        if (!file && !isMock) return;

        setSubmitting(true);
        setToastMsg(null);

        const formData = new FormData();
        if (file) formData.append('file', file);
        if (isMock) formData.append('skip_file', 'true');
        // Hardcode type for minimal demo
        formData.append('type', 'RESIDENCE');

        try {
            const res = await fetch('/api/verify/upload', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                throw new Error('UPLOAD_ERROR');
            }

            setToastMsg({ text: '해당 내용이 감사 로그로 안전하게 기록되었습니다.', type: 'success' });
            // SSOT re-evaluation enforces progression
            await refetch();
        } catch (err: any) {
            handleActionError(err.message);
            setToastMsg({ text: '파일 업로드 중 오류가 발생했습니다. 다시 시도하십시오.', type: 'error' });
            setSubmitting(false);
        }
    };

    return (
        <main className="max-w-md mx-auto pt-16 px-6 pb-12 flex flex-col min-h-screen">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="flex-1">
                <Stepper currentStep={3} totalSteps={7} />

                <h1 className="text-[24px] font-semibold tracking-tight text-[#111111] mb-2">필수 자격 서류 제출.</h1>
                <p className="text-[15px] text-[#555555] mb-8">해당되는 문서 파일을 업로드하여 주십시오. (JPG, PDF 포맷 한정)</p>

                <form onSubmit={handleUpload}>
                    <div className="mb-8 w-full h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center relative hover:border-slate-400 transition-colors">
                        <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            disabled={submitting}
                        />
                        <div className="text-[14px] text-[#555555] pointer-events-none">
                            {file ? file.name : "클릭하여 파일 업로드"}
                        </div>
                    </div>

                    <PrimaryButton type="submit" submitting={submitting} disabled={!file || submitting}>
                        서류 제출
                    </PrimaryButton>

                    {/* Debug mock skip - Gated for safety */}
                    {process.env.NEXT_PUBLIC_ALLOW_TEST_FEATURES === 'true' && (
                        <div className="mt-4">
                            <SecondaryButton type="button" onClick={() => handleUpload({ preventDefault: () => { } } as any, true)} disabled={submitting}>
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
