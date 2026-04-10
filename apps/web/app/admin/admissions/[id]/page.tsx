'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
    AdminPageHeader,
    AdminPageShell,
    AdminSectionCard,
    AdminSummaryGrid,
    ReferenceDetailsCard,
} from '@/components/screen-patterns';
import { ADMISSION_DOCUMENTS } from '@/lib/admission-client';

type DetailPayload = {
    review_case?: {
        id: string;
        user_id: string;
        state: string;
        ai_summary_json?: Record<string, unknown>;
        opened_at: string;
        decided_at: string | null;
        reviewer_notes: string | null;
    };
    admission_application?: {
        id: string;
        status: string;
        current_step: string;
        submitted_at: string | null;
        approved_at: string | null;
        rejected_at: string | null;
    };
    documents?: Array<{
        id: string;
        document_type: string;
        upload_status: string;
        processing_status: string;
        ai_result: string | null;
        ai_confidence: number | null;
        human_result: string | null;
        final_result: string;
        extracted_claims_json: Record<string, unknown>;
        purged_at: string | null;
    }>;
    consents?: Array<{
        consent_type: string;
        policy_version: string;
        granted_at: string;
        typed_ack_phrase: string | null;
        capture_method: string | null;
        audit_reference: string | null;
    }>;
    contract_signatures?: Array<{
        document_slug: string;
        display_title: string;
        required: boolean;
        active_version_id: string | null;
        acceptance_id: string | null;
        signed: boolean;
        signed_current_version: boolean;
        accepted_at: string | null;
        accepted_via: string | null;
        secondary_confirmed_at: string | null;
        typed_ack_phrase: string | null;
        ack_category: string | null;
        acknowledgement_captured_at: string | null;
        latest_event_type: string | null;
        latest_event_at: string | null;
        latest_event_payload: Record<string, unknown> | null;
    }>;
    trust_ledger_timeline?: Array<{
        id: string;
        event_type: string;
        event_payload: Record<string, unknown>;
        created_at: string;
    }>;
    review_case_events?: Array<{
        id: string;
        event_type: string;
        actor_role: string;
        created_at: string;
    }>;
    verified_claims?: Array<{
        id: string;
        claim_type: string;
        verification_status: string;
        verified_at: string;
    }>;
    soul_credential?: {
        id: string;
        status: string;
        issued_at: string;
    } | null;
    decision_runs?: Array<{
        id: string;
        final_decision: string;
        confidence_score: number | null;
        execution_mode: string;
        created_at: string;
    }>;
    appeal?: Record<string, unknown> | null;
    exception_case?: Record<string, unknown> | null;
    audit_sample?: Record<string, unknown> | null;
};

export default function AdminAdmissionDetailPage() {
    const params = useParams<{ id: string }>();
    const reviewCaseId = params.id;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [detail, setDetail] = useState<DetailPayload | null>(null);

    const [decision, setDecision] = useState<'APPROVE' | 'REJECT' | 'RESUBMIT'>('APPROVE');
    const [reviewerNotes, setReviewerNotes] = useState('');
    const [reasonCode, setReasonCode] = useState('');
    const [resubmitDocTypeMap, setResubmitDocTypeMap] = useState<Record<string, boolean>>({});
    const [deciding, setDeciding] = useState(false);
    const [decisionMsg, setDecisionMsg] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/admissions/${reviewCaseId}`, { cache: 'no-store' });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'DETAIL_LOAD_FAILED');
            }
            setDetail(payload as DetailPayload);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'DETAIL_LOAD_FAILED';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reviewCaseId]);

    const resubmitDocumentTypes = useMemo(() => {
        return Object.entries(resubmitDocTypeMap)
            .filter(([, checked]) => checked)
            .map(([type]) => type);
    }, [resubmitDocTypeMap]);

    const decide = async () => {
        setDeciding(true);
        setDecisionMsg(null);
        try {
            const res = await fetch('/api/admin/admissions/decide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    review_case_id: reviewCaseId,
                    decision,
                    reviewer_notes: reviewerNotes,
                    rejection_reason_code: reasonCode,
                    resubmit_document_types: resubmitDocumentTypes,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'DECISION_FAILED');
            }
            setDecisionMsg(`Decision recorded: ${decision}`);
            await refresh();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'DECISION_FAILED';
            setDecisionMsg(`Decision failed: ${message}`);
        } finally {
            setDeciding(false);
        }
    };

    return (
        <AdminPageShell>
            <AdminPageHeader
                title="Admission Review"
                description="Confirm the current case state, make the next decision, and keep supporting detail secondary until you need it."
                actions={(
                    <button
                        type="button"
                        onClick={() => void refresh()}
                        disabled={loading}
                        className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] disabled:opacity-60"
                    >
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                )}
            />

            {loading && (
                <AdminSectionCard title="Loading detail">
                    <p className="text-sm text-[#6e6e73]">Loading the latest case detail...</p>
                </AdminSectionCard>
            )}
            {error && (
                <AdminSectionCard title="Load error" className="border-red-200 bg-red-50">
                    <p className="text-sm text-red-700">We couldn’t load this case: {error}</p>
                </AdminSectionCard>
            )}

            {!loading && !error && detail && (
                <>
                    <AdminSummaryGrid>
                        <ReferenceDetailsCard
                            title="Current case"
                            rows={[
                                { label: 'Review case', value: reviewCaseId },
                                { label: 'State', value: detail.review_case?.state || 'UNKNOWN' },
                                { label: 'Queue type', value: String(detail.review_case?.ai_summary_json?.queue_type || 'UNKNOWN') },
                                { label: 'Applicant', value: detail.review_case?.user_id || 'UNKNOWN' },
                                { label: 'Opened', value: detail.review_case?.opened_at || 'N/A' },
                                { label: 'Decided', value: detail.review_case?.decided_at || 'N/A' },
                            ]}
                            className="h-full"
                        />
                        <ReferenceDetailsCard
                            title="Application state"
                            rows={[
                                { label: 'Status', value: detail.admission_application?.status || 'UNKNOWN' },
                                { label: 'Step', value: detail.admission_application?.current_step || 'UNKNOWN' },
                                { label: 'Submitted', value: detail.admission_application?.submitted_at || 'N/A' },
                                { label: 'Approved', value: detail.admission_application?.approved_at || 'N/A' },
                                { label: 'Rejected', value: detail.admission_application?.rejected_at || 'N/A' },
                            ]}
                            className="h-full"
                        />
                    </AdminSummaryGrid>

                    <AdminSectionCard
                        title="Next action"
                        description="Choose the case outcome first. Supporting evidence stays below when you need to verify the details."
                    >
                        <div className="mt-3 grid gap-3">
                            <p className="text-sm text-[#6e6e73]">
                                This decision path is for appeal, exception, and audit cases rather than the normal approval flow.
                            </p>
                            <label className="grid gap-1 text-sm text-[#3a3a3c]">
                                Decision
                                <select
                                    className="rounded-lg border border-[#d2d2d7] bg-white px-3 py-2"
                                    value={decision}
                                    onChange={(event) => setDecision(event.target.value as 'APPROVE' | 'REJECT' | 'RESUBMIT')}
                                    disabled={deciding}
                                >
                                    <option value="APPROVE">APPROVE</option>
                                    <option value="REJECT">REJECT</option>
                                    <option value="RESUBMIT">RESUBMIT</option>
                                </select>
                            </label>

                            <label className="grid gap-1 text-sm text-[#3a3a3c]">
                                Reviewer Notes
                                <textarea
                                    className="min-h-24 rounded-lg border border-[#d2d2d7] bg-white px-3 py-2"
                                    value={reviewerNotes}
                                    onChange={(event) => setReviewerNotes(event.target.value)}
                                    disabled={deciding}
                                />
                            </label>

                            {(decision === 'REJECT' || decision === 'RESUBMIT') && (
                                <label className="grid gap-1 text-sm text-[#3a3a3c]">
                                    Reason Code
                                    <input
                                        className="rounded-lg border border-[#d2d2d7] bg-white px-3 py-2"
                                        value={reasonCode}
                                        onChange={(event) => setReasonCode(event.target.value)}
                                        disabled={deciding}
                                    />
                                </label>
                            )}

                            {decision === 'RESUBMIT' && (
                                <div className="rounded-xl border border-[#ececf0] bg-[#fbfbfd] p-3 text-sm text-[#3a3a3c]">
                                    <p className="mb-2 font-medium">Documents to request again</p>
                                    <div className="grid gap-2">
                                        {ADMISSION_DOCUMENTS.map((doc) => (
                                            <label key={doc.type} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={resubmitDocTypeMap[doc.type] === true}
                                                    onChange={(event) => setResubmitDocTypeMap((current) => ({ ...current, [doc.type]: event.target.checked }))}
                                                    disabled={deciding}
                                                />
                                                <span>{doc.title}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={decide}
                                disabled={deciding}
                                className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d1d1f] px-4 text-sm font-semibold text-white hover:bg-[#2a2a2c] disabled:opacity-60"
                            >
                                {deciding ? 'Saving decision...' : 'Save Decision'}
                            </button>

                            {decisionMsg && (
                                <p className="text-sm text-[#3a3a3c]">{decisionMsg}</p>
                            )}
                        </div>
                    </AdminSectionCard>

                    <AdminSectionCard title="Supporting evidence" description="Review document detail here only when you need more context for the decision above.">
                        <div className="mt-3 grid gap-3">
                            {(detail.documents || []).map((doc) => (
                                <article key={doc.id} className="rounded-xl border border-[#ececf0] bg-[#fbfbfd] p-4 text-sm text-[#3a3a3c]">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-semibold text-[#1d1d1f]">{doc.document_type}</p>
                                        <p>{doc.final_result} / {doc.processing_status}</p>
                                    </div>
                                    <p className="mt-1 text-xs text-[#6e6e73]">AI confidence: {typeof doc.ai_confidence === 'number' ? doc.ai_confidence.toFixed(2) : 'N/A'}</p>
                                    <p className="mt-1 text-xs text-[#6e6e73]">Purged: {doc.purged_at || 'NOT_PURGED'}</p>
                                    <pre className="mt-2 overflow-auto rounded-lg border border-[#e5e5e7] bg-white p-2 text-[11px]">
                                        {JSON.stringify(doc.extracted_claims_json || {}, null, 2)}
                                    </pre>
                                </article>
                            ))}
                        </div>
                    </AdminSectionCard>

                    <AdminSectionCard
                        title="Consent & Signature Review"
                        description="Use contract signatures as the authoritative proof for new applicants. Legacy consent events remain visible for older or in-flight cases."
                    >
                        <div className="mt-3 grid gap-3">
                            {(detail.contract_signatures || []).map((signature) => (
                                <article key={signature.document_slug} className="rounded-xl border border-[#ececf0] bg-[#fbfbfd] p-4 text-sm text-[#3a3a3c]">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="font-semibold text-[#1d1d1f]">{signature.display_title}</p>
                                        <p>{signature.signed_current_version ? 'SIGNED_CURRENT' : signature.signed ? 'SIGNED_OLD_VERSION' : 'MISSING'}</p>
                                    </div>
                                    <p className="mt-1 text-xs text-[#6e6e73]">{signature.document_slug}</p>
                                    <div className="mt-2 space-y-1 text-xs text-[#6e6e73]">
                                        <p>Accepted: {signature.accepted_at || 'NOT_CAPTURED'}</p>
                                        <p>Accepted via: {signature.accepted_via || 'N/A'}</p>
                                        <p>Active version: {signature.active_version_id || 'N/A'}</p>
                                        <p>Secondary confirm: {signature.secondary_confirmed_at || 'NOT_CAPTURED'}</p>
                                        <p>Typed acknowledgement: {signature.typed_ack_phrase || 'NOT_REQUIRED'}</p>
                                        <p>Acknowledgement category: {signature.ack_category || 'N/A'}</p>
                                        <p>Evidence captured: {signature.acknowledgement_captured_at || 'N/A'}</p>
                                        <p>Latest event: {signature.latest_event_type || 'N/A'} / {signature.latest_event_at || 'N/A'}</p>
                                    </div>
                                </article>
                            ))}

                            {(detail.contract_signatures || []).length === 0 && (detail.consents || []).length === 0 && (
                                <p className="text-sm text-[#6e6e73]">No consent or contract signature evidence is available for this case yet.</p>
                            )}

                            {(detail.consents || []).length > 0 && (
                                <div className="rounded-xl border border-[#ececf0] bg-white p-4 text-sm text-[#3a3a3c]">
                                    <p className="font-semibold text-[#1d1d1f]">Legacy consent events</p>
                                    <div className="mt-3 space-y-2 text-xs text-[#6e6e73]">
                                        {(detail.consents || []).map((consent) => (
                                            <div key={`${consent.consent_type}:${consent.granted_at}`} className="rounded-lg border border-[#ececf0] bg-[#fbfbfd] p-2">
                                                <p className="font-semibold text-[#3a3a3c]">{consent.consent_type}</p>
                                                <p>{consent.granted_at} / {consent.policy_version}</p>
                                                <p>Phrase: {consent.typed_ack_phrase || 'N/A'}</p>
                                                <p>Capture: {consent.capture_method || 'N/A'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </AdminSectionCard>

                    <AdminSummaryGrid>
                        <AdminSectionCard title="Trust Ledger Timeline">
                            <div className="mt-3 space-y-2 text-xs text-[#3a3a3c]">
                                {(detail.trust_ledger_timeline || []).map((event) => (
                                    <div key={event.id} className="rounded-lg border border-[#ececf0] bg-[#fbfbfd] p-2">
                                        <p className="font-semibold">{event.event_type}</p>
                                        <p className="text-[#6e6e73]">{event.created_at}</p>
                                    </div>
                                ))}
                            </div>
                        </AdminSectionCard>

                        <AdminSectionCard title="Credential/Claims">
                            <div className="mt-3 space-y-2 text-xs text-[#3a3a3c]">
                                <p>SOUL: {detail.soul_credential?.status || 'NOT_ISSUED'}</p>
                                {(detail.verified_claims || []).map((claim) => (
                                    <div key={claim.id} className="rounded-lg border border-[#ececf0] bg-[#fbfbfd] p-2">
                                        <p className="font-semibold">{claim.claim_type}</p>
                                        <p className="text-[#6e6e73]">{claim.verification_status} / {claim.verified_at}</p>
                                    </div>
                                ))}
                            </div>
                        </AdminSectionCard>
                    </AdminSummaryGrid>

                    <AdminSectionCard title="Decision Runs">
                        <div className="mt-3 space-y-2 text-xs text-[#3a3a3c]">
                            {(detail.decision_runs || []).map((run) => (
                                <div key={run.id} className="rounded-lg border border-[#ececf0] bg-[#fbfbfd] p-2">
                                    <p className="font-semibold">{run.final_decision} ({run.execution_mode})</p>
                                    <p className="text-[#6e6e73]">{run.created_at} / conf={run.confidence_score ?? 'N/A'}</p>
                                </div>
                            ))}
                        </div>
                    </AdminSectionCard>
                </>
            )}
        </AdminPageShell>
    );
}
