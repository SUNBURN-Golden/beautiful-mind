import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShieldAlert, Download, FileText, CheckCircle2 } from 'lucide-react';
import BanButton from './BanButton';

type AuditLogItem = {
    id: string;
    action: string;
    table_name: string;
    created_at: string;
    changed_by: string;
    new_data?: {
        status?: string;
        reason?: string;
    } | null;
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch all user details concurrently
    const [
        { data: profile },
        { data: contracts },
        { data: interviews },
        { data: auditLogs }
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('contracts').select('*').eq('user_id', id).order('created_at', { ascending: false }),
        supabase.from('interviews').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(1),
        supabase.from('audit_logs').select('*').eq('record_id', id).order('created_at', { ascending: false }).limit(10)
    ]);

    if (!profile) {
        return <div className="p-8 text-[#b42318]">User not found.</div>;
    }

    const latestContract = contracts && contracts.length > 0 ? contracts[0] : null;
    const latestInterview = interviews && interviews.length > 0 ? interviews[0] : null;

    return (
        <div className="space-y-6">
            <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start">
                <div className="space-y-1">
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight">User Details</h1>
                    <p className="break-all text-xs text-[#6e6e73]">{profile.id}</p>
                </div>
                <div className="flex w-full gap-3 sm:w-auto">
                    <a
                        href={`/api/admin/export-evidence?userId=${profile.id}`}
                        download
                        className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d2d2d7] bg-white px-4 text-sm font-medium transition-colors hover:bg-[#f5f5f7] sm:flex-none"
                    >
                        <Download className="h-4 w-4" />
                        법적 증거 추출
                    </a>
                    {!profile.banned && <BanButton userId={profile.id} />}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <Card className="liquid-pane rounded-2xl border-[#e5e5e7] md:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-[20px] font-semibold">Profile Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-[#6e6e73]">Email</p>
                            <p className="break-all text-sm font-medium text-[#1d1d1f]">{profile.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-[#6e6e73]">Reputation Score</p>
                            <p className="text-2xl font-semibold text-[#1d1d1f]">{profile.reputation_score}</p>
                        </div>
                        <div>
                            <p className="text-sm text-[#6e6e73]">Status</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {profile.verified ? (
                                    <Badge variant="default" className="bg-[#edf9f1] text-[#14532d]">PortOne Verified</Badge>
                                ) : (
                                    <Badge variant="outline">Unverified</Badge>
                                )}
                                {profile.banned && <Badge variant="destructive">Banned</Badge>}
                                {profile.is_admin && <Badge variant="secondary">Admin</Badge>}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-[#6e6e73]">Joined</p>
                            <p className="text-sm text-[#1d1d1f]">{new Date(profile.created_at).toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-6 md:col-span-2">
                    <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-[20px] font-semibold">Contract Signature</CardTitle>
                                <CardDescription>Electronically signed terms of service</CardDescription>
                            </div>
                            <FileText className="h-5 w-5 text-[#8e8e93]" />
                        </CardHeader>
                        <CardContent>
                            {latestContract ? (
                                <div className="space-y-3">
                                    <Badge variant="outline" className="border-[#d2d2d7] bg-[#f5f5f7] text-[#06c]">
                                        <CheckCircle2 className="mr-1 h-3 w-3" /> Agreed to Terms
                                    </Badge>
                                    <p className="text-xs text-[#6e6e73]">Signed at: {new Date(latestContract.created_at).toLocaleString()}</p>
                                    <div className="inline-block rounded-md border border-[#e5e5e7] bg-[#fbfbfd] p-4">
                                        <Image
                                            src={latestContract.signature_base64}
                                            alt="Signature"
                                            width={512}
                                            height={128}
                                            className="max-h-32 w-auto object-contain"
                                            unoptimized
                                        />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm italic text-[#6e6e73]">No contract signed yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-[20px] font-semibold">Gemini AI Evaluation</CardTitle>
                                <CardDescription>Latest risk and trust assessment</CardDescription>
                            </div>
                            <ShieldAlert className="h-5 w-5 text-[#8e8e93]" />
                        </CardHeader>
                        <CardContent>
                            {latestInterview ? (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-6">
                                        <div>
                                            <p className="text-sm text-[#6e6e73]">Decision</p>
                                            <Badge
                                                variant={latestInterview.decision === 'PASS' ? 'default' : 'destructive'}
                                                className={latestInterview.decision === 'PASS' ? 'bg-[#1d1d1f]' : ''}
                                            >
                                                {latestInterview.decision}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-sm text-[#6e6e73]">AI Score</p>
                                            <p className="text-xl font-semibold text-[#1d1d1f]">{latestInterview.score}/100</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="mb-1 text-sm text-[#6e6e73]">Risk Flags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {latestInterview.flags.length > 0 ? (
                                                latestInterview.flags.map((flag: string, i: number) => (
                                                    <Badge key={i} variant="outline" className="border-[#f3d1d1] bg-[#fff5f5] text-[#b42318]">
                                                        {flag}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-[#6e6e73]">No flags detected.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-lg border border-[#e5e5e7] bg-[#fbfbfd] p-3 text-sm text-[#3a3a3c]">
                                        <span className="font-medium">Summary: </span>
                                        {latestInterview.summary}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm italic text-[#6e6e73]">No interview evaluation on record.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                        <CardHeader>
                            <CardTitle className="text-[20px] font-semibold">Recent Audit Trail</CardTitle>
                            <CardDescription>Activity logs for this user record</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {auditLogs && auditLogs.length > 0 ? (
                                <ul className="divide-y divide-[#ececf0] text-sm">
                                    {(auditLogs as AuditLogItem[]).map((log) => (
                                        <li key={log.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="font-medium text-[#1d1d1f]">{log.action} on {log.table_name}</p>
                                                {log.action === 'UPDATE' && log.new_data?.status === 'BANNED' && (
                                                    <p className="mt-1 font-semibold text-red-600">BAN ACTION RECORDED: {log.new_data.reason}</p>
                                                )}
                                            </div>
                                            <div className="text-xs text-[#6e6e73] sm:text-right">
                                                <p>{new Date(log.created_at).toLocaleString()}</p>
                                                <p>By: {log.changed_by.slice(0, 8)}...</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm italic text-[#6e6e73]">No audit logs found.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
