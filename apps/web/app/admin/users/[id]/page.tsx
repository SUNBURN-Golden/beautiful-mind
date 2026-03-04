import { createClient } from '@/utils/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { ShieldAlert, Download, FileText, CheckCircle2 } from 'lucide-react';
import BanButton from './BanButton';

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createClient();

    // Fetch all user details concurrently
    const [
        { data: profile },
        { data: contracts },
        { data: consents },
        { data: interviews },
        { data: auditLogs }
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', params.id).single(),
        supabase.from('contracts').select('*').eq('user_id', params.id).order('created_at', { ascending: false }),
        supabase.from('consents').select('*').eq('user_id', params.id),
        supabase.from('interviews').select('*').eq('user_id', params.id).order('created_at', { ascending: false }).limit(1),
        supabase.from('audit_logs').select('*').eq('record_id', params.id).order('created_at', { ascending: false }).limit(10)
    ]);

    if (!profile) {
        return <div className="p-8 text-red-500">User not found.</div>;
    }

    const latestContract = contracts && contracts.length > 0 ? contracts[0] : null;
    const latestInterview = interviews && interviews.length > 0 ? interviews[0] : null;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Details</h1>
                    <p className="text-muted-foreground">{profile.id}</p>
                </div>
                <div className="flex gap-3">
                    <a href={`/api/admin/export-evidence?userId=${profile.id}`} download className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 gap-2">
                        <Download className="w-4 h-4" />
                        법적 증거 추출
                    </a>
                    {!profile.banned && (
                        <BanButton userId={profile.id} />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardHeader>
                        <CardTitle>Profile Info</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{profile.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Reputation Score</p>
                            <p className="font-medium text-xl">{profile.reputation_score}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Status</p>
                            <div className="flex gap-2 mt-1">
                                {profile.verified ? (
                                    <Badge variant="default" className="bg-green-100 text-green-800">PortOne Verified</Badge>
                                ) : (
                                    <Badge variant="outline">Unverified</Badge>
                                )}
                                {profile.banned && <Badge variant="destructive">Banned</Badge>}
                                {profile.is_admin && <Badge variant="secondary">Admin</Badge>}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Joined</p>
                            <p className="text-sm">{new Date(profile.created_at).toLocaleString()}</p>
                        </div>
                    </CardContent>
                </Card>

                <div className="md:col-span-2 space-y-6">
                    {/* Contract Evidence */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Contract Signature</CardTitle>
                                <CardDescription>Electronically signed terms of service</CardDescription>
                            </div>
                            <FileText className="w-5 h-5 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            {latestContract ? (
                                <div className="space-y-3">
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Agreed to Terms
                                    </Badge>
                                    <p className="text-xs text-gray-500">Signed at: {new Date(latestContract.created_at).toLocaleString()}</p>
                                    <div className="border rounded-md bg-gray-50 p-4 inline-block">
                                        <img src={latestContract.signature_base64} alt="Signature" className="max-h-32 object-contain filter contrast-125" />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No contract signed yet.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* AI Interview Results */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Gemini AI Evaluation</CardTitle>
                                <CardDescription>Latest risk and trust assessment</CardDescription>
                            </div>
                            <ShieldAlert className="w-5 h-5 text-gray-400" />
                        </CardHeader>
                        <CardContent>
                            {latestInterview ? (
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-center">
                                        <div>
                                            <p className="text-sm text-gray-500">Decision</p>
                                            <Badge variant={latestInterview.decision === 'PASS' ? 'default' : 'destructive'}
                                                className={latestInterview.decision === 'PASS' ? 'bg-green-600' : ''}>
                                                {latestInterview.decision}
                                            </Badge>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">AI Score</p>
                                            <p className="text-xl font-bold">{latestInterview.score}/100</p>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Risk Flags</p>
                                        <div className="flex flex-wrap gap-2">
                                            {latestInterview.flags.length > 0 ? (
                                                latestInterview.flags.map((flag: string, i: number) => (
                                                    <Badge key={i} variant="outline" className="text-red-600 border-red-200 bg-red-50">{flag}</Badge>
                                                ))
                                            ) : (
                                                <span className="text-sm text-gray-500">No flags detected.</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded text-sm border">
                                        <span className="font-medium text-gray-700">Summary: </span>
                                        {latestInterview.summary}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No interview evaluation on record.</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Audit Logs */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Audit Trail</CardTitle>
                            <CardDescription>Activity logs for this user record</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {auditLogs && auditLogs.length > 0 ? (
                                    <ul className="divide-y divide-gray-100 text-sm">
                                        {auditLogs.map((log: any) => (
                                            <li key={log.id} className="py-3 flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{log.action} on {log.table_name}</p>
                                                    {log.action === 'UPDATE' && log.new_data?.status === 'BANNED' && (
                                                        <p className="text-red-600 font-semibold mt-1">
                                                            BAN ACTION RECORDED: {log.new_data.reason}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-right text-xs text-gray-500">
                                                    <p>{new Date(log.created_at).toLocaleString()}</p>
                                                    <p>By: {log.changed_by.slice(0, 8)}...</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No audit logs found.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
