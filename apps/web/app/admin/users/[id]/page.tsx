import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import BanButton from './BanButton';

type AuditLogItem = {
    id: string;
    action: string;
    table_name: string;
    created_at: string;
    changed_by: string | null;
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const [
        { data: profile },
        { data: applications },
        { data: soulCredentials },
        { data: verifiedClaims },
        { data: reviewCases },
        { data: auditLogs },
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
            .from('admission_applications')
            .select('id,status,current_step,submitted_at,approved_at,rejected_at,soul_issued_at,activated_at')
            .eq('user_id', id)
            .order('created_at', { ascending: false })
            .limit(1),
        supabase
            .from('soul_credentials')
            .select('id,status,issued_at,trust_level')
            .eq('user_id', id)
            .order('issued_at', { ascending: false })
            .limit(1),
        supabase
            .from('verified_claims')
            .select('id,claim_type,verification_status,verified_at')
            .eq('user_id', id)
            .order('verified_at', { ascending: false })
            .limit(20),
        supabase
            .from('review_cases')
            .select('id,state,opened_at,decided_at,ai_summary_json')
            .eq('user_id', id)
            .order('opened_at', { ascending: false })
            .limit(10),
        supabase
            .from('audit_logs')
            .select('id,action,table_name,created_at,changed_by')
            .eq('record_id', id)
            .order('created_at', { ascending: false })
            .limit(20),
    ]);

    if (!profile) {
        return <div className="p-8 text-[#b42318]">User not found.</div>;
    }

    const latestApplication = applications && applications.length > 0 ? applications[0] : null;
    const latestSoulCredential = soulCredentials && soulCredentials.length > 0 ? soulCredentials[0] : null;

    return (
        <div className="space-y-6">
            <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
                <div className="space-y-1">
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight">Trust Account Detail</h1>
                    <p className="break-all text-xs text-[#6e6e73]">{profile.id}</p>
                </div>
                {!profile.banned && <BanButton userId={profile.id} />}
            </header>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                    <CardHeader>
                        <CardTitle className="text-[20px] font-semibold">Account</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                        <p className="break-all text-[#1d1d1f]">{profile.email}</p>
                        <div className="flex flex-wrap gap-2">
                            {profile.banned ? <Badge variant="destructive">BANNED</Badge> : <Badge variant="outline">ACTIVE</Badge>}
                            {profile.is_admin && <Badge variant="secondary">ADMIN</Badge>}
                        </div>
                        <p className="text-[#6e6e73]">Joined: {new Date(profile.created_at).toLocaleString()}</p>
                    </CardContent>
                </Card>

                <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                    <CardHeader>
                        <CardTitle className="text-[20px] font-semibold">Admission Snapshot</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-[#3a3a3c]">
                        <p>Status: {latestApplication?.status || 'NO_APPLICATION'}</p>
                        <p>Step: {latestApplication?.current_step || 'N/A'}</p>
                        <p>Submitted: {latestApplication?.submitted_at || 'N/A'}</p>
                        <p>Approved: {latestApplication?.approved_at || 'N/A'}</p>
                        <p>Rejected: {latestApplication?.rejected_at || 'N/A'}</p>
                    </CardContent>
                </Card>

                <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                    <CardHeader>
                        <CardTitle className="text-[20px] font-semibold">SOUL Credential</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-[#3a3a3c]">
                        <p>Status: {latestSoulCredential?.status || 'NOT_ISSUED'}</p>
                        <p>Trust Level: {latestSoulCredential?.trust_level || 'N/A'}</p>
                        <p>Issued: {latestSoulCredential?.issued_at || 'N/A'}</p>
                    </CardContent>
                </Card>
            </section>

            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                    <CardHeader>
                        <CardTitle className="text-[20px] font-semibold">Verified Claims</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {(!verifiedClaims || verifiedClaims.length === 0) && (
                            <p className="text-[#6e6e73]">No verified claims.</p>
                        )}
                        {(verifiedClaims || []).map((claim) => (
                            <div key={claim.id} className="rounded-lg border border-[#ececf0] bg-[#fbfbfd] p-3">
                                <p className="font-medium text-[#1d1d1f]">{claim.claim_type}</p>
                                <p className="text-xs text-[#6e6e73]">{claim.verification_status} / {claim.verified_at || 'N/A'}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                    <CardHeader>
                        <CardTitle className="text-[20px] font-semibold">Cold-Path Cases</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {(!reviewCases || reviewCases.length === 0) && (
                            <p className="text-[#6e6e73]">No cold-path cases.</p>
                        )}
                        {(reviewCases || []).map((row) => (
                            <div key={row.id} className="rounded-lg border border-[#ececf0] bg-[#fbfbfd] p-3">
                                <p className="font-medium text-[#1d1d1f]">{row.state}</p>
                                <p className="text-xs text-[#6e6e73]">opened={row.opened_at || 'N/A'} / decided={row.decided_at || 'N/A'}</p>
                                <p className="text-xs text-[#6e6e73]">queue={String(row.ai_summary_json?.queue_type || 'UNKNOWN')}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </section>

            <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-[20px] font-semibold">Recent Audit Trail</CardTitle>
                </CardHeader>
                <CardContent>
                    {auditLogs && auditLogs.length > 0 ? (
                        <ul className="divide-y divide-[#ececf0] text-sm">
                            {(auditLogs as AuditLogItem[]).map((log) => (
                                <li key={log.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between">
                                    <p className="font-medium text-[#1d1d1f]">{log.action} on {log.table_name}</p>
                                    <p className="text-xs text-[#6e6e73]">
                                        {new Date(log.created_at).toLocaleString()} / by {log.changed_by ? `${log.changed_by.slice(0, 8)}...` : 'system'}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-[#6e6e73]">No audit logs found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
