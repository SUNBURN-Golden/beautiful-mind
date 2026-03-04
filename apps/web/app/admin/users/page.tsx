import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function AdminUsersPage() {
    const supabase = await createClient();

    // Fetch all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return <div className="p-8 text-[#b42318]">Failed to load users: {error.message}</div>;
    }

    const renderVerifiedBadge = (verified: boolean) => {
        if (verified) {
            return <Badge variant="default" className="bg-[#edf9f1] text-[#14532d] hover:bg-[#edf9f1]">Yes</Badge>;
        }
        return <Badge variant="outline" className="text-[#6e6e73]">No</Badge>;
    };

    const renderStatusBadge = (banned: boolean, isAdmin: boolean) => {
        if (banned) {
            return <Badge variant="destructive">Banned</Badge>;
        }
        if (isAdmin) {
            return <Badge variant="secondary" className="bg-[#f5f5f7] text-[#3a3a3c] hover:bg-[#f5f5f7]">Admin</Badge>;
        }
        return <Badge variant="outline" className="border-[#d2d2d7] text-[#06c]">Active</Badge>;
    };

    return (
        <div className="space-y-6">
            <header className="space-y-2">
                <h1 className="liquid-title text-[34px] font-semibold tracking-tight">User Management</h1>
                <p className="liquid-copy text-[14px]">계정 상태, 검증 여부, 제재 이력을 조회하고 상세 증적 화면으로 이동합니다.</p>
            </header>

            <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-[22px] font-semibold">Registered Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 md:hidden">
                        {profiles?.map((profile) => (
                            <article key={`mobile-${profile.id}`} className="liquid-pane-muted rounded-xl p-4">
                                <p className="mb-2 break-all text-sm font-semibold text-[#1d1d1f]">{profile.email}</p>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    {renderVerifiedBadge(Boolean(profile.verified))}
                                    {renderStatusBadge(Boolean(profile.banned), Boolean(profile.is_admin))}
                                    <Badge variant="outline" className="border-[#d2d2d7] text-[#3a3a3c]">Score {profile.reputation_score}</Badge>
                                </div>
                                <Link href={`/admin/users/${profile.id}`} className="inline-flex text-sm font-medium text-[#06c] hover:text-[#0077ed]">
                                    View details →
                                </Link>
                            </article>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto rounded-xl border border-[#ececf0] md:block">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[#fbfbfd] text-[#3a3a3c]">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Email</th>
                                    <th className="px-4 py-3 font-medium">Verified</th>
                                    <th className="px-4 py-3 font-medium">Score</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ececf0] bg-white">
                                {profiles?.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-[#f8f8fa]">
                                        <td className="max-w-[280px] truncate px-4 py-3 font-medium">{profile.email}</td>
                                        <td className="px-4 py-3">{renderVerifiedBadge(Boolean(profile.verified))}</td>
                                        <td className="px-4 py-3 text-[#1d1d1f]">{profile.reputation_score}</td>
                                        <td className="px-4 py-3">{renderStatusBadge(Boolean(profile.banned), Boolean(profile.is_admin))}</td>
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/users/${profile.id}`} className="font-medium text-[#06c] hover:text-[#0077ed]">
                                                View details →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
