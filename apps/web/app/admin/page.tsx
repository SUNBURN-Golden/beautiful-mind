import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, HeartHandshake, ShieldAlert } from 'lucide-react';

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Fetch KPIs concurrently
    const [
        { count: totalUsers },
        { count: verifiedUsers },
        { count: matches },
        { count: todayLogs }
    ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('verified', true),
        supabase.from('matches').select('*', { count: 'exact', head: true }),
        // For today's logs we query created_at >= start of today.
        supabase.from('audit_logs').select('*', { count: 'exact', head: true })
            .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
    ]);

    const kpis = [
        {
            label: 'Total Users',
            value: totalUsers || 0,
            icon: Users,
            iconColor: 'text-[#6e6e73]',
        },
        {
            label: 'Verified Users',
            value: verifiedUsers || 0,
            icon: UserCheck,
            iconColor: 'text-[#2f855a]',
        },
        {
            label: 'Matches Made',
            value: matches || 0,
            icon: HeartHandshake,
            iconColor: 'text-[#c53080]',
        },
        {
            label: 'Daily Audit Logs',
            value: todayLogs || 0,
            icon: ShieldAlert,
            iconColor: 'text-[#2b6cb0]',
        },
    ];

    return (
        <div className="space-y-8">
            <header className="space-y-2">
                <h1 className="liquid-title text-[34px] font-semibold tracking-tight">System Overview</h1>
                <p className="liquid-copy text-[14px]">핵심 운영 지표와 감사 상태를 한눈에 확인합니다.</p>
            </header>

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => {
                    const Icon = kpi.icon;
                    return (
                        <Card key={kpi.label} className="liquid-pane liquid-rise rounded-2xl border-[#e5e5e7]">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-xs font-medium uppercase tracking-wider text-[#6e6e73]">{kpi.label}</CardTitle>
                                <Icon className={`h-4 w-4 ${kpi.iconColor}`} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-[30px] font-semibold leading-none tracking-tight text-[#1d1d1f]">{kpi.value}</div>
                            </CardContent>
                        </Card>
                    );
                })}
            </section>

            <section className="liquid-pane rounded-2xl border-[#e5e5e7] p-6">
                <h2 className="mb-2 text-lg font-semibold text-[#1d1d1f]">Audit Activity</h2>
                <p className="text-sm text-[#6e6e73]">세부 이벤트 조사와 증적 확인은 User Management 화면에서 진행하세요.</p>
            </section>
        </div>
    );
}
