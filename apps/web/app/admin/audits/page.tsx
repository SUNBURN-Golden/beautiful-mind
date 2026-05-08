'use client';

import { useState } from 'react';

export default function AuditsPage() {
    const [error, setError] = useState<string | null>(null);
    const [deciding, setDeciding] = useState<string | null>(null);
    const [decisionResult, setDecisionResult] = useState<string | null>(null);

    const handleDecide = async (auditId: string, decision: 'PASS' | 'FAIL') => {
        const trimmed = auditId.trim();
        if (!trimmed) {
            setError('Audit ID is required.');
            return;
        }

        if (!window.confirm(`Mark audit ${trimmed} as ${decision}?`)) {
            return;
        }

        setDeciding(trimmed);
        setError(null);
        setDecisionResult(null);
        try {
            const res = await fetch('/api/audit/decide', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audit_id: trimmed, decision }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.message || `Audit decide failed (${res.status})`);
                return;
            }
            setDecisionResult(`${decision} applied to ${trimmed.slice(0, 8)}`);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setDeciding(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-[34px] font-semibold tracking-tight">Audits</h1>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {decisionResult && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {decisionResult}
                </div>
            )}

            <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
                <p className="text-sm text-[#6e6e73]">
                    Review audit evidence and decide outcomes for open audits.
                    Audit records are operational evidence, not public profile copy.
                </p>

                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Check the target, evidence, and outcome before taking action.
                    Random audit opening requires a target subject_user_id and claim_id — that action is disabled until the form supports those inputs.
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="audit-id" className="block text-sm font-medium text-[#3a3a3c]">
                            Audit ID
                        </label>
                        <input
                            id="audit-id"
                            type="text"
                            placeholder="Enter audit ID"
                            className="mt-1 w-full max-w-md rounded-lg border border-[#d2d2d7] px-3 py-2 text-sm focus:border-[#06c] focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-[#6e6e73]">
                            Use the exact audit ID from the reviewed evidence.
                        </p>
                    </div>
                    <p className="text-xs text-[#6e6e73]">
                        Confirm the audit record and evidence before deciding. This action is recorded in the operational audit trail.
                    </p>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                const input = document.getElementById('audit-id') as HTMLInputElement;
                                void handleDecide(input?.value || '', 'PASS');
                            }}
                            disabled={!!deciding}
                            className="inline-flex h-10 items-center rounded-lg bg-green-600 px-4 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                            {deciding ? 'Processing...' : 'Mark PASS'}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                const input = document.getElementById('audit-id') as HTMLInputElement;
                                void handleDecide(input?.value || '', 'FAIL');
                            }}
                            disabled={!!deciding}
                            className="inline-flex h-10 items-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
                        >
                            {deciding ? 'Processing...' : 'Mark FAIL'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}