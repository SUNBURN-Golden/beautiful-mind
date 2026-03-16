'use client';

import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminPageShell, AdminSectionCard } from '@/components/screen-patterns';

type Proposal = {
    id: string;
    proposal_type: string;
    target_rule: string;
    status: string;
    simulation_result_json?: Record<string, unknown>;
    created_at: string;
};

export default function AdmissionPolicyPage() {
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [proposals, setProposals] = useState<Proposal[]>([]);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/admissions/policy/proposals', { cache: 'no-store' });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'PROPOSAL_LOAD_FAILED');
            }
            setProposals(Array.isArray(payload.proposals) ? payload.proposals : []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'PROPOSAL_LOAD_FAILED';
            setError(message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
    }, []);

    const generate = async () => {
        setBusyId('GENERATE');
        setError(null);
        try {
            const res = await fetch('/api/admin/admissions/policy/proposals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ force_refresh: true }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'PROPOSAL_GENERATE_FAILED');
            }
            await load();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'PROPOSAL_GENERATE_FAILED';
            setError(message);
        } finally {
            setBusyId(null);
        }
    };

    const simulate = async (proposalId: string) => {
        setBusyId(proposalId);
        setError(null);
        try {
            const res = await fetch('/api/admin/admissions/policy/proposals/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proposal_id: proposalId, sample_size: 300 }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'SIMULATE_FAILED');
            }
            await load();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'SIMULATE_FAILED';
            setError(message);
        } finally {
            setBusyId(null);
        }
    };

    const decide = async (proposalId: string, action: 'APPROVE' | 'REJECT' | 'ROLL_OUT_STAGED') => {
        setBusyId(proposalId + action);
        setError(null);
        try {
            const res = await fetch('/api/admin/admissions/policy/proposals/decide', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposal_id: proposalId,
                    action,
                }),
            });
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(payload?.error || 'DECIDE_FAILED');
            }
            await load();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'DECIDE_FAILED';
            setError(message);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <AdminPageShell>
            <AdminPageHeader
                title="Policy proposals"
                description="Review AI-generated proposal candidates, simulate them, and decide the next rollout step."
                actions={(
                    <button
                        type="button"
                        onClick={generate}
                        disabled={busyId !== null}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-[#1d1d1f] px-4 text-sm font-semibold text-white hover:bg-[#2a2a2c] disabled:opacity-60"
                    >
                        {busyId === 'GENERATE' ? 'Generating proposals...' : 'Generate proposals'}
                    </button>
                )}
            />

            {loading && (
                <AdminSectionCard title="Loading proposals">
                    <p className="text-sm text-[#6e6e73]">Loading the current proposal queue...</p>
                </AdminSectionCard>
            )}
            {error && (
                <AdminSectionCard title="Load error" className="border-red-200 bg-red-50">
                    <p className="text-sm text-red-700">We couldn't load policy proposals: {error}</p>
                </AdminSectionCard>
            )}

            {!loading && !error && (
                <AdminSectionCard
                    title="Proposal queue"
                    description="Simulation and rollout decisions stay here so policy changes remain reviewable."
                    className="overflow-hidden"
                >
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-[#f8f8fa] text-left text-[#6e6e73]">
                            <tr>
                                <th className="px-4 py-3 font-medium">Proposal</th>
                                <th className="px-4 py-3 font-medium">Target Rule</th>
                                <th className="px-4 py-3 font-medium">Status</th>
                                <th className="px-4 py-3 font-medium">Simulation</th>
                                <th className="px-4 py-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proposals.length === 0 && (
                                <tr>
                                    <td className="px-4 py-6 text-[#6e6e73]" colSpan={5}>
                                        No proposals have been generated yet.
                                    </td>
                                </tr>
                            )}

                            {proposals.map((proposal) => (
                                <tr key={proposal.id} className="border-t border-[#ececf0]">
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-[#1d1d1f]">{proposal.proposal_type}</p>
                                        <p className="text-xs text-[#6e6e73]">{proposal.id.slice(0, 8)} / {proposal.created_at.slice(0, 10)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-[#3a3a3c]">{proposal.target_rule}</td>
                                    <td className="px-4 py-3 text-[#3a3a3c]">{proposal.status}</td>
                                    <td className="px-4 py-3 text-[#3a3a3c]">
                                        {proposal.simulation_result_json
                                            ? `divergence=${String(proposal.simulation_result_json.divergence_rate ?? 'N/A')}`
                                            : 'N/A'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => simulate(proposal.id)}
                                                disabled={busyId !== null}
                                                className="rounded-lg border border-[#d2d2d7] px-3 py-1.5 text-xs hover:bg-[#f5f5f7]"
                                            >
                                                Simulate
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => decide(proposal.id, 'APPROVE')}
                                                disabled={busyId !== null}
                                                className="rounded-lg border border-[#d2d2d7] px-3 py-1.5 text-xs hover:bg-[#f5f5f7]"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => decide(proposal.id, 'ROLL_OUT_STAGED')}
                                                disabled={busyId !== null}
                                                className="rounded-lg border border-[#d2d2d7] px-3 py-1.5 text-xs hover:bg-[#f5f5f7]"
                                            >
                                                Roll out staged
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => decide(proposal.id, 'REJECT')}
                                                disabled={busyId !== null}
                                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </AdminSectionCard>
            )}
        </AdminPageShell>
    );
}
