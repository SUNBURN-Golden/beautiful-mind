import { createClient } from '@/utils/supabase/server';
import {
    AdminMetricCard,
    AdminPageHeader,
    AdminPageShell,
    AdminSectionCard,
    AdminSummaryGrid,
} from '@/components/screen-patterns';
import { FileCheck2, ShieldAlert, Scale, CheckCircle2, Activity } from 'lucide-react';

export default async function AdminOpsHomePage() {
    const supabase = await createClient();

    const [
        { count: totalApplications },
        { count: activeApplications },
        { count: openColdPathCases },
        { count: issuedSoulCredentials },
        { count: todayAuditLogs },
    ] = await Promise.all([
        supabase.from('admission_applications').select('*', { count: 'exact', head: true }),
        supabase.from('admission_applications').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
        supabase.from('review_cases').select('*', { count: 'exact', head: true }).eq('state', 'OPEN'),
        supabase.from('soul_credentials').select('*', { count: 'exact', head: true }).eq('status', 'ISSUED'),
        supabase
            .from('audit_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ]);

    const kpis = [
        { label: 'Admission Applications', value: totalApplications || 0, icon: FileCheck2, color: 'text-[#1d1d1f]' },
        { label: 'ACTIVE Members', value: activeApplications || 0, icon: CheckCircle2, color: 'text-[#14532d]' },
        { label: 'Cold-Path Open Cases', value: openColdPathCases || 0, icon: ShieldAlert, color: 'text-[#b45309]' },
        { label: 'Issued SOUL Credentials', value: issuedSoulCredentials || 0, icon: Scale, color: 'text-[#1d4ed8]' },
        { label: 'Today Audit Logs', value: todayAuditLogs || 0, icon: Activity, color: 'text-[#6e6e73]' },
    ];

    return (
        <AdminPageShell className="space-y-8">
            <AdminPageHeader
                title="Admission Ops Home"
                description="Start with the operating signals that matter most. Routine cases stay on the AI hot path, while this console focuses on exception, appeal, and audit handling."
            />

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <AdminMetricCard
                            key={kpi.label}
                            label={kpi.label}
                            value={kpi.value}
                            icon={<Icon className={`h-4 w-4 ${kpi.color}`} />}
                            accentClassName={kpi.color}
                        />
                    );
                })}
            </section>

            <AdminSummaryGrid className="xl:grid-cols-2">
                <AdminSectionCard
                    title="Operating focus"
                    description="Use this console when the standard hot path is not enough and a manual decision flow needs attention."
                >
                    <ul className="list-disc space-y-1 pl-5 text-sm text-[#3a3a3c]">
                        <li>Routine admission cases remain on the AI decision and rule-engine path.</li>
                        <li>Human review is reserved for appeal, exception, and audit cold paths.</li>
                    </ul>
                </AdminSectionCard>
                <AdminSectionCard
                    title="Retention posture"
                    description="Keep the primary interface focused while making the data policy easy to verify when needed."
                >
                    <ul className="list-disc space-y-1 pl-5 text-sm text-[#3a3a3c]">
                        <li>Original documents are purged after the final decision.</li>
                        <li>Minimal claims and ledger events remain as the durable audit trail.</li>
                    </ul>
                </AdminSectionCard>
            </AdminSummaryGrid>
        </AdminPageShell>
    );
}
