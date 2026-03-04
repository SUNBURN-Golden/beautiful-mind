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

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalUsers || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Verified Users</CardTitle>
                        <UserCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{verifiedUsers || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Matches Made</CardTitle>
                        <HeartHandshake className="h-4 w-4 text-pink-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{matches || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Daily Audit Logs</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{todayLogs || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="mt-12 bg-white rounded-lg border p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Recent Audit Activity</h2>
                <div className="text-sm text-gray-500">
                    <p>Refer to User Management to investigate specific events and view detailed audit trails.</p>
                </div>
            </div>
        </div>
    );
}
