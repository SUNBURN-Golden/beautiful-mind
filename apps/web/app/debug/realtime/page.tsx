"use client";

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

type LogEvent = {
    id: string; // generated client-side for log list
    event_type: string;
    created_at: string;
    record_id: string;
    actor_id: string;
    masked_content: string;
};

export default function RealtimeDebugPage() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [matchId, setMatchId] = useState('');
    const [table, setTable] = useState<'messages' | 'match_reviews'>('messages');
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED'>('DISCONNECTED');
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const channelRef = useRef<any>(null);

    // Auth Check
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login'); // Redirect if not logged in
            } else {
                setUser(session.user);
            }
            setLoading(false);
        };
        checkAuth();
    }, [router, supabase.auth]);

    const maskContent = (text: string | null | undefined) => {
        if (!text) return 'N/A';
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
    };

    const handleSubscribe = () => {
        if (!matchId.trim()) {
            alert('Please enter a valid match_id (UUID)');
            return;
        }

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }

        setStatus('CONNECTING');

        const channelName = `rt-${table}-${matchId}`;
        const channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: table,
                    filter: `match_id=eq.${matchId}`
                },
                (payload) => {
                    console.log('Realtime Payload:', payload);
                    const newRecord = payload.new as any;
                    const oldRecord = payload.old as any;

                    const record = newRecord || oldRecord;
                    if (!record) return;

                    const newLog: LogEvent = {
                        id: Math.random().toString(36).substring(7),
                        event_type: payload.eventType,
                        created_at: new Date().toISOString(),
                        record_id: record.id || 'unknown',
                        actor_id: table === 'messages' ? record.sender_id : record.reviewer_id,
                        masked_content: maskContent(table === 'messages' ? record.content : record.feedback_text || 'N/A')
                    };

                    setLogs((prev) => [newLog, ...prev].slice(0, 20)); // Keep only last 20
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    setStatus('SUBSCRIBED');
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setStatus('DISCONNECTED');
                    console.error('Channel Error:', err);
                }
            });

        channelRef.current = channel;
    };

    const handleUnsubscribe = () => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
            setStatus('DISCONNECTED');
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [supabase]);

    if (loading) {
        return <div className="p-8 text-white">Verifying session...</div>;
    }

    if (!user) return null; // Will redirect

    return (
        <div className="min-h-screen bg-[#0A0A0A] text-white p-8 font-mono">
            <div className="max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-[#E2C792]">Realtime E2E Debug Harness</h1>
                    <p className="text-sm text-gray-400 mt-2">Authenticated as: {user.email} ({user.id})</p>
                </div>

                <div className="bg-[#111111] border border-[#333333] p-6 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase tracking-widest">Match ID (UUID)</label>
                            <input
                                type="text"
                                value={matchId}
                                onChange={(e) => setMatchId(e.target.value)}
                                placeholder="Enter match_id uuid..."
                                className="w-full bg-black border border-[#333333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#E2C792]"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-gray-400 uppercase tracking-widest">Target Table</label>
                            <select
                                value={table}
                                onChange={(e) => setTable(e.target.value as any)}
                                className="w-full bg-black border border-[#333333] rounded px-3 py-2 text-sm focus:outline-none focus:border-[#E2C792]"
                            >
                                <option value="messages">messages</option>
                                <option value="match_reviews">match_reviews</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 pt-2">
                        <button
                            onClick={handleSubscribe}
                            disabled={status === 'SUBSCRIBED' || status === 'CONNECTING'}
                            className="bg-[#E2C792] text-black px-4 py-2 rounded text-sm font-semibold disabled:opacity-50 hover:bg-[#d1b681] transition-colors"
                        >
                            Subscribe
                        </button>
                        <button
                            onClick={handleUnsubscribe}
                            disabled={status === 'DISCONNECTED'}
                            className="bg-red-900/40 text-red-200 border border-red-900/50 px-4 py-2 rounded text-sm font-semibold disabled:opacity-50 hover:bg-red-900/60 transition-colors"
                        >
                            Unsubscribe
                        </button>

                        <div className="flex-1 flex justify-end items-center space-x-2">
                            <span className="text-xs text-gray-400">Status:</span>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${status === 'SUBSCRIBED' ? 'bg-green-900/50 text-green-400' :
                                status === 'CONNECTING' ? 'bg-yellow-900/50 text-yellow-400' :
                                    'bg-gray-800 text-gray-400'
                                }`}>
                                {status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <h2 className="text-sm text-gray-400 uppercase tracking-widest border-b border-[#333] pb-2 w-full">
                            Event Log (Last 20)
                        </h2>
                    </div>

                    <div className="bg-[#111111] border border-[#333333] rounded-lg overflow-hidden">
                        {logs.length === 0 ? (
                            <div className="p-8 text-center text-gray-600 text-sm">
                                No events received yet. Start inserting data from another client.
                            </div>
                        ) : (
                            <div className="divide-y divide-[#222222]">
                                {logs.map((log) => (
                                    <div key={log.id} className="p-3 text-sm grid grid-cols-12 gap-4 hover:bg-[#1a1a1a] transition-colors">
                                        <div className="col-span-2 flex flex-col justify-center">
                                            <span className={`text-xs font-bold ${log.event_type === 'INSERT' ? 'text-green-400' :
                                                log.event_type === 'UPDATE' ? 'text-blue-400' :
                                                    'text-red-400'
                                                }`}>
                                                {log.event_type}
                                            </span>
                                            <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <div className="col-span-10 flex flex-col space-y-1">
                                            <div className="flex text-xs space-x-2">
                                                <span className="text-gray-500">Row ID:</span>
                                                <span className="text-gray-300">{log.record_id}</span>
                                            </div>
                                            <div className="flex text-xs space-x-2">
                                                <span className="text-gray-500">Actor:</span>
                                                <span className="text-[#E2C792]">{log.actor_id}</span>
                                            </div>
                                            <div className="text-gray-400 text-xs italic bg-black p-1.5 rounded mt-1 overflow-x-auto whitespace-nowrap">
                                                {log.masked_content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
