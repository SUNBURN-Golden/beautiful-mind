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
        return <div className="p-8 text-red-500">Failed to load users: {error.message}</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground">Manage accounts, view legal evidence, and enforce bans.</p>

            <Card>
                <CardHeader>
                    <CardTitle>Registered Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-700">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Email</th>
                                    <th className="px-4 py-3 font-medium">Verified</th>
                                    <th className="px-4 py-3 font-medium">Score</th>
                                    <th className="px-4 py-3 font-medium">Status</th>
                                    <th className="px-4 py-3 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {profiles?.map((profile) => (
                                    <tr key={profile.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium border-l-4 border-transparent">
                                            {profile.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            {profile.verified ? (
                                                <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">Yes</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-gray-500">No</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{profile.reputation_score}</td>
                                        <td className="px-4 py-3">
                                            {profile.banned ? (
                                                <Badge variant="destructive">Banned</Badge>
                                            ) : profile.is_admin ? (
                                                <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Admin</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-blue-600 border-blue-200">Active</Badge>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/admin/users/${profile.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                                                View Details →
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
