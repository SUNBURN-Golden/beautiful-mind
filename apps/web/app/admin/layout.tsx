import { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, Activity, LogOut } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children }: { children: ReactNode }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-indigo-600" />
                        Admin Panel
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                        <Activity className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-md hover:bg-gray-100 transition-colors">
                        <Users className="w-5 h-5" />
                        User Management
                    </Link>
                </nav>
                <div className="p-4 border-t border-gray-200">
                    <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-gray-600 rounded-md hover:bg-gray-100 transition-colors text-sm">
                        <LogOut className="w-4 h-4" />
                        Exit Admin
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
