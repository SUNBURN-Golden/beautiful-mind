'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminPageHeader, AdminPageShell, AdminSectionCard } from '@/components/screen-patterns';

type AdmissionRow = {
    review_case_id: string;
    admission_application_id: string;
    applicant_user_id: string;
    queue_type: string;
    queue_payload: Record<string, unknown> | null;
    review_state: string;
    admission_status: string | null;
    admission_current_step: string | null;
    documents_verified_or_ai_passed: number;
    documents_required_total: number;
    opened_at: string;
    decided_at: string | null;
};

export default function AdminAdmissionsPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<AdmissionRow[]>([]);

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/admin/admissions', { cache: 'no-store' });
                const payload = await res.json().catch(() => ({}));
                if (!res.ok) {
                    throw new Error(payload?.error || 'LOAD_FAILED');
                }
                if (!mounted) return;
                setItems(Array.isArray(payload.items) ? payload.items : []);
            } catch (err: unknown) {
                if (!mounted) return;
                const message = err instanceof Error ? err.message : 'LOAD_FAILED';
                setError(message);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void load();
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <AdminPageShell>
            <AdminPageHeader
                title="Admission Review Queue"
                description="Start with the next case that needs a manual decision. Supporting queue detail stays below."
            />

            {loading && (
                <AdminSectionCard title="Loading queue">
                    <p className="text-sm text-[#6e6e73]">Loading the current review queue...</p>
                </AdminSectionCard>
            )}

            {error && (
                <AdminSectionCard title="Load error" className="border-red-200 bg-red-50">
                    <p className="text-sm text-red-700">We couldn’t load the review queue: {error}</p>
                </AdminSectionCard>
            )}

            {!loading && !error && (
                <AdminSectionCard title="Cases needing review" description="Appeal, exception, and audit cases waiting for manual handling.">
                    <div className="overflow-hidden rounded-2xl border border-[#ececf0]">
                        <table className="w-full border-collapse text-sm">
                            <thead className="bg-[#f8f8fa] text-left text-[#6e6e73]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Review Case</th>
                                    <th className="px-4 py-3 font-medium">Queue</th>
                                    <th className="px-4 py-3 font-medium">Applicant</th>
                                    <th className="px-4 py-3 font-medium">Doc Progress</th>
                                    <th className="px-4 py-3 font-medium">Admission</th>
                                    <th className="px-4 py-3 font-medium">Opened</th>
                                    <th className="px-4 py-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 && (
                                    <tr>
                                        <td className="px-4 py-6 text-[#6e6e73]" colSpan={7}>
                                            No cases need attention right now.
                                        </td>
                                    </tr>
                                )}

                                {items.map((item) => (
                                    <tr key={item.review_case_id} className="border-t border-[#ececf0]">
                                        <td className="px-4 py-3 font-mono text-[12px] text-[#1d1d1f]">{item.review_case_id.slice(0, 8)}</td>
                                        <td className="px-4 py-3 text-[#3a3a3c]">{item.queue_type}</td>
                                        <td className="px-4 py-3 font-mono text-[12px] text-[#3a3a3c]">{item.applicant_user_id.slice(0, 8)}...</td>
                                        <td className="px-4 py-3 text-[#3a3a3c]">
                                            {item.documents_verified_or_ai_passed}/{item.documents_required_total}
                                        </td>
                                        <td className="px-4 py-3 text-[#3a3a3c]">
                                            {item.review_state} / {item.admission_status || 'UNKNOWN'}
                                        </td>
                                        <td className="px-4 py-3 text-[#6e6e73]">{item.opened_at?.slice(0, 10)}</td>
                                        <td className="px-4 py-3">
                                            <Link
                                                href={`/admin/admissions/${item.review_case_id}`}
                                                className="inline-flex rounded-lg border border-[#d2d2d7] px-3 py-1.5 text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7]"
                                            >
                                                Open Case
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </AdminSectionCard>
            )}
        </AdminPageShell>
    );
}
