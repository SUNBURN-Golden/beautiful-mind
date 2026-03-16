'use client';

import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminPageShell, AdminSectionCard } from '@/components/screen-patterns';

type OpsPayload = {
    metrics_daily?: Array<Record<string, unknown>>;
    anomalies?: Array<Record<string, unknown>>;
};

export default function AdmissionOpsPage() {
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<OpsPayload>({});

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/admissions/policy/proposals', { cache: 'no-store' });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'OPS_LOAD_FAILED');
            }
            setData(payload as OpsPayload);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'OPS_LOAD_FAILED';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const runRollup = async () => {
        setRunning(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/admissions/ops/rollup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ generate_proposals: true }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'ROLLUP_FAILED');
            }
            await load();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'ROLLUP_FAILED';
            setError(message);
        } finally {
            setRunning(false);
        }
    };

    return (
        <AdminPageShell>
            <AdminPageHeader
                title="Admission operations"
                description="Review daily metrics, anomaly detection, and proposal refresh status for the admission system."
                actions={(
                    <button
                        type="button"
                        onClick={runRollup}
                        disabled={running}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d1d1f] px-4 text-sm font-semibold text-white hover:bg-[#2a2a2c] disabled:opacity-60"
                    >
                        {running ? 'Running refresh...' : 'Run rollup and proposal refresh'}
                    </button>
                )}
            />

            {loading && (
                <AdminSectionCard title="Loading operations">
                    <p className="text-sm text-[#6e6e73]">Loading the latest operations data...</p>
                </AdminSectionCard>
            )}
            {error && (
                <AdminSectionCard title="Load error" className="border-red-200 bg-red-50">
                    <p className="text-sm text-red-700">We couldn't load admission operations: {error}</p>
                </AdminSectionCard>
            )}

            {!loading && !error && (
                <>
                    <AdminSectionCard
                        title="Daily metrics"
                        description="The last 30 days of automated admission rollups."
                    >
                        <div className="mt-3 overflow-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-[#f8f8fa] text-left text-[#6e6e73]">
                                    <tr>
                                        <th className="px-3 py-2">Day</th>
                                        <th className="px-3 py-2">Started</th>
                                        <th className="px-3 py-2">Approved</th>
                                        <th className="px-3 py-2">Rejected</th>
                                        <th className="px-3 py-2">Resubmit</th>
                                        <th className="px-3 py-2">Exception</th>
                                        <th className="px-3 py-2">Low confidence</th>
                                        <th className="px-3 py-2">Appeal rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.metrics_daily || []).map((row, idx) => (
                                        <tr key={idx} className="border-t border-[#ececf0]">
                                            <td className="px-3 py-2">{String(row.day || '')}</td>
                                            <td className="px-3 py-2">{String(row.started_count || 0)}</td>
                                            <td className="px-3 py-2">{String(row.approved_count || 0)}</td>
                                            <td className="px-3 py-2">{String(row.rejected_count || 0)}</td>
                                            <td className="px-3 py-2">{String(row.resubmit_count || 0)}</td>
                                            <td className="px-3 py-2">{String(row.exception_count || 0)}</td>
                                            <td className="px-3 py-2">{String(row.low_confidence_rate || 0)}</td>
                                            <td className="px-3 py-2">{String(row.appeal_rate || 0)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </AdminSectionCard>

                    <AdminSectionCard
                        title="Anomalies"
                        description="Signals that may need a closer review before policy or ops changes are made."
                    >
                        <div className="mt-3 space-y-2 text-sm text-[#3a3a3c]">
                            {(data.anomalies || []).length === 0 && <p className="text-[#6e6e73]">No active anomalies are currently flagged.</p>}
                            {(data.anomalies || []).map((row, idx) => (
                                <div key={idx} className="rounded-lg border border-[#ececf0] bg-[#fbfbfd] p-3">
                                    <p className="font-medium">{String(row.anomaly_type || 'UNKNOWN')} ({String(row.severity || 'N/A')})</p>
                                    <p className="mt-1 text-xs text-[#6e6e73]">Day {String(row.day || '')} / detected {String(row.detected_at || '')}</p>
                                </div>
                            ))}
                        </div>
                    </AdminSectionCard>
                </>
            )}
        </AdminPageShell>
    );
}
