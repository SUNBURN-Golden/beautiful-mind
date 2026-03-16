'use client';

import {
    ADMISSION_DOCUMENTS,
    type AdmissionDocumentType,
} from '@/lib/admission-client';
import {
    PageLoadingState,
    PrimaryButton,
    RecoverableErrorPanel,
    StageTransitionNotice,
    SuccessNextStepPanel,
    Toast,
} from '@/components/ui-kit';
import {
    FlowInfoCard,
    FlowInfoGrid,
    FlowInset,
    FlowPageHeader,
    FlowPagePanel,
    FlowPageShell,
    ReferenceDetailsCard,
} from '@/components/screen-patterns';
import { FeedbackPanel } from '@/components/ui-kit';
import { statusLabel, useAdmissionDocuments } from './useAdmissionDocuments';

export default function ApplyDocumentsPage() {
    const {
        stage,
        isLoading,
        docMetaMap,
        verifiedCount,
        isResubmit,
        toast,
        lastError,
        lastSuccessType,
        uploadingType,
        setFileForType,
        clearLastErrorAndRefetch,
        uploadAndSubmit,
    } = useAdmissionDocuments();

    if (isLoading) {
        return (
            <PageLoadingState
                title="Preparing your document workspace"
                description="We’re syncing earlier uploads and the latest review results."
                lines={4}
            />
        );
    }

    if (stage && !['DOCUMENTS', 'RESUBMIT_REQUIRED'].includes(stage)) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="We’re taking you to your current document step"
                description="Your status source of truth points to a different step, so we’re routing you there."
            />
        );
    }

    return (
        <FlowPageShell maxWidth="max-w-5xl">
            {toast && <Toast message={toast.text} type={toast.type} />}

            <FlowPagePanel>
                <FlowPageHeader
                    step={4}
                    totalSteps={5}
                    title="Official documents"
                    description="Proof comes first. Upload the required records here. Each upload runs through the first AI review as soon as it arrives."
                />

                <FlowInfoGrid className="mt-6">
                    <FlowInfoCard
                        title="What’s real can be proven."
                        description="Upload official records in PDF, JPG, JPEG, or PNG. You can replace a document when a clearer file is needed."
                    />
                    <FlowInfoCard
                        title="What happens next"
                        description="As documents verify, your status page and review step reflect the updated result automatically."
                    />
                </FlowInfoGrid>

                {isResubmit && (
                    <div className="mt-4">
                        <FeedbackPanel
                            tone="warning"
                            title="A resubmission is required"
                            description="Replace the documents that came back incomplete or unclear, then submit them again here."
                        />
                    </div>
                )}

                <FlowInset title="Progress" className="mt-4">
                    {verifiedCount} of {ADMISSION_DOCUMENTS.length} required documents verified
                </FlowInset>

                <FlowInset title="Safer because less remains." className="mt-4">
                    Original documents are used to verify admission, then purged after the final decision. Minimal claims and decision records remain.
                </FlowInset>

                {lastSuccessType && (
                    <div className="mt-4">
                        <SuccessNextStepPanel
                            title={`${lastSuccessType} is up to date`}
                            description="You can keep uploading the remaining documents, or check status and review progress now."
                            primaryHref="/apply/status"
                            primaryLabel="View status"
                            secondaryHref="/apply/review"
                            secondaryLabel="Open review step"
                        />
                    </div>
                )}

                {lastError && (
                    <div className="mt-4">
                        <RecoverableErrorPanel
                            title="We couldn’t finish that document update"
                            message={`Reason: ${lastError}`}
                            retryLabel="Refresh status"
                            onRetry={clearLastErrorAndRefetch}
                            secondaryHref="/manual"
                            secondaryLabel="Open the guide"
                        />
                    </div>
                )}

                <div className="mt-6 grid gap-4">
                    {ADMISSION_DOCUMENTS.map((document) => {
                        const docMeta = docMetaMap.get(document.type);
                        const isUploading = uploadingType === document.type;
                        const fileInputId = `doc-upload-${document.type.toLowerCase()}`;

                        return (
                            <section key={document.type} className="rounded-2xl border border-[#e5e5e7] bg-white p-5">
                                <h2 className="text-[18px] font-semibold text-slate-900">{document.title}</h2>
                                <p className="mt-1 text-[13px] text-slate-600">{document.description}</p>

                                <div className="mt-4">
                                    <ReferenceDetailsCard
                                        title="Verification status"
                                        rows={[
                                            { label: 'Upload', value: statusLabel(docMeta?.upload_status) },
                                            { label: 'Processing', value: statusLabel(docMeta?.processing_status) },
                                            { label: 'Result', value: statusLabel(docMeta?.status) },
                                            {
                                                label: 'Confidence',
                                                value: typeof docMeta?.ai_confidence === 'number' ? docMeta.ai_confidence.toFixed(2) : 'Not available',
                                            },
                                        ]}
                                    />
                                </div>

                                {docMeta?.status === 'RESUBMIT_REQUIRED' && (
                                    <div className="mt-3">
                                        <FeedbackPanel
                                            tone="warning"
                                            title="A clearer file is needed"
                                            description="We detected a readability issue, a missing page, or a mismatch in key fields. Upload a clearer replacement of the same document."
                                        />
                                    </div>
                                )}

                                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                                    <label htmlFor={fileInputId} className="sr-only">
                                        Choose a file for {document.title}
                                    </label>
                                    <input
                                        id={fileInputId}
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={(event) => setFileForType(document.type, event.target.files?.[0] || null)}
                                        className="text-[13px]"
                                        disabled={Boolean(uploadingType)}
                                    />
                                    <PrimaryButton
                                        type="button"
                                        onClick={() => uploadAndSubmit(document.type as AdmissionDocumentType)}
                                        submitting={isUploading}
                                        disabled={Boolean(uploadingType)}
                                    >
                                        {isUploading ? 'Working...' : 'Upload and run first review'}
                                    </PrimaryButton>
                                </div>
                            </section>
                        );
                    })}
                </div>
            </FlowPagePanel>
        </FlowPageShell>
    );
}
