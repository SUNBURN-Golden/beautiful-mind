import { createClient } from '@/utils/supabase/server';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdminPageHeader, AdminPageShell, AdminSectionCard } from '@/components/screen-patterns';

export default async function AdminUsersPage() {
    const supabase = await createClient();

    // Fetch all profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        return (
            <AdminPageShell>
                <AdminSectionCard title="Load error" className="border-red-200 bg-red-50">
                    <p className="text-sm text-red-700">We couldn't load the account registry: {error.message}</p>
                </AdminSectionCard>
            </AdminPageShell>
        );
    }

    const renderVerifiedBadge = (verified: boolean) => {
        if (verified) {
            return <Badge variant="default" className="bg-[#edf9f1] text-[#14532d] hover:bg-[#edf9f1]">Verified</Badge>;
        }
        return <Badge variant="outline" className="text-[#6e6e73]">Unverified</Badge>;
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
        <AdminPageShell className="space-y-6">
            <AdminPageHeader
                title="Trust account registry"
                description="Review account status, verification posture, and enforcement history for trust operations."
            />

            <Card className="liquid-pane rounded-2xl border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-[22px] font-semibold">Registered accounts</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3 md:hidden">
                        {profiles?.map((profile) => (
                            <article key={`mobile-${profile.id}`} className="liquid-pane-muted rounded-xl p-4">
                                <p className="mb-2 break-all text-sm font-semibold text-[#1d1d1f]">{profile.email}</p>
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    {renderVerifiedBadge(Boolean(profile.verified))}
                                    {renderStatusBadge(Boolean(profile.banned), Boolean(profile.is_admin))}
                                    <Badge variant="outline" className="border-[#d2d2d7] text-[#3a3a3c]">Trust score {profile.reputation_score}</Badge>
                                </div>
                                <Link href={`/admin/users/${profile.id}`} className="inline-flex text-sm font-medium text-[#06c] hover:text-[#0077ed]">
                                    Open details →
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
                                    <th className="px-4 py-3 font-medium">Trust score</th>
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
                                                Open details →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </AdminPageShell>
    );
}
