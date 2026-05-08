'use client';

import { useState } from 'react';

export default function EnforcementPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);

    const handleExecute = async (actionId: string) => {
        const trimmed = actionId.trim();
        if (!trimmed) {
            setError('Action ID is required. Enter a specific action ID to execute.');
            return;
        }

        if (!window.confirm(`Execute enforcement action ${trimmed}?`)) {
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch('/api/enforcement/execute', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action_id: trimmed }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.message || `Enforcement execute failed (${res.status})`);
                return;
            }
            setResult(`Executed action ${trimmed}`);
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="text-[34px] font-semibold tracking-tight">Enforcement</h1>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {result && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {result}
                </div>
            )}

            <div className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
                <p className="text-sm text-[#6e6e73]">
                    Execute enforcement actions against verified targets.
                    Confirm the target before proceeding — this action may restrict access or trigger operational review.
                </p>

                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Enforcement actions are recorded in the operational audit trail. Use only when the evidence supports the action.
                </div>

                <div className="mt-6 space-y-4">
                    <div>
                        <label htmlFor="enforcement-id" className="block text-sm font-medium text-[#3a3a3c]">
                            Action ID
                        </label>
                        <input
                            id="enforcement-id"
                            type="text"
                            placeholder="Enter action ID"
                            className="mt-1 w-full max-w-md rounded-lg border border-[#d2d2d7] px-3 py-2 text-sm focus:border-[#06c] focus:outline-none"
                        />
                        <p className="mt-1 text-xs text-[#6e6e73]">
                            Confirm this ID against the audit record before execution.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            const input = document.getElementById('enforcement-id') as HTMLInputElement;
                            void handleExecute(input?.value || '');
                        }}
                        disabled={loading}
                        className="inline-flex h-10 items-center rounded-lg bg-[#1d1d1f] px-4 text-sm font-medium text-white transition hover:bg-[#3a3a3c] disabled:opacity-50"
                    >
                        {loading ? 'Executing...' : 'Execute'}
                    </button>
                </div>
            </div>
        </div>
    );
}