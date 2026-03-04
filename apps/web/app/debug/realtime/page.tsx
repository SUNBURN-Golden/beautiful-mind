"use client";

import { useEffect, useMemo, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import type { RealtimeChannel, RealtimePostgresChangesPayload, User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';

type LogEvent = {
    id: string; // generated client-side for log list
    event_type: string;
    created_at: string;
    record_id: string;
    actor_id: string;
    masked_content: string;
};

type TargetTable = 'messages' | 'match_reviews';

type RealtimeRecord = {
    id?: string;
    sender_id?: string;
    reviewer_id?: string;
    content?: string;
    feedback_text?: string;
};

function extractRealtimeRecord(value: unknown): RealtimeRecord | null {
    if (value && typeof value === 'object') {
        return value as RealtimeRecord;
    }
    return null;
}

export default function RealtimeDebugPage() {
    const router = useRouter();
    const supabase = useMemo(() => {
        if (typeof window === 'undefined') return null;
        try {
            return createClient();
        } catch (error) {
            console.error('Supabase client init failed:', error);
            return null;
        }
    }, []);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [matchId, setMatchId] = useState('');
    const [table, setTable] = useState<TargetTable>('messages');
    const [status, setStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'SUBSCRIBED'>('DISCONNECTED');
    const [logs, setLogs] = useState<LogEvent[]>([]);
    const [notice, setNotice] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!supabase) {
            setLoading(false);
            setNotice('Supabase client unavailable.');
        }
    }, [supabase]);

    // Auth Check
    useEffect(() => {
        if (!supabase) return;
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
    }, [router, supabase]);

    const maskContent = (text: string | null | undefined) => {
        if (!text) return 'N/A';
        return text.length > 30 ? text.substring(0, 30) + '...' : text;
    };

    const handleSubscribe = () => {
        if (!supabase) {
            setNotice('Supabase client unavailable.');
            return;
        }
        if (!matchId.trim()) {
            setNotice('유효한 match_id(UUID)를 입력하세요.');
            return;
        }
        setNotice(null);

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
                    table,
                    filter: `match_id=eq.${matchId}`,
                },
                (payload: RealtimePostgresChangesPayload<RealtimeRecord>) => {
                    console.log('Realtime Payload:', payload);
                    const newRecord = extractRealtimeRecord(payload.new);
                    const oldRecord = extractRealtimeRecord(payload.old);

                    const record = newRecord || oldRecord;
                    if (!record) return;

                    const newLog: LogEvent = {
                        id: Math.random().toString(36).substring(7),
                        event_type: payload.eventType,
                        created_at: new Date().toISOString(),
                        record_id: record.id || 'unknown',
                        actor_id: table === 'messages' ? (record.sender_id || 'unknown') : (record.reviewer_id || 'unknown'),
                        masked_content: maskContent(
                            table === 'messages'
                                ? record.content
                                : (record.feedback_text || 'N/A'),
                        ),
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
        if (!supabase) return;
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
            setStatus('DISCONNECTED');
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        if (!supabase) return;
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [supabase]);

    if (loading) {
        return <div className="px-8 py-12 text-[#1d1d1f]">Verifying session...</div>;
    }

    if (!user) return null; // Will redirect

    return (
        <main className="liquid-shell min-h-screen px-4 pb-12 pt-10 text-[#1d1d1f] sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-6">
                <header className="space-y-2">
                    <h1 className="liquid-title text-[32px] font-semibold tracking-tight">Realtime Debug Harness</h1>
                    <p className="liquid-copy text-sm break-all">Authenticated as: {user.email} ({user.id})</p>
                </header>

                <section className="liquid-pane space-y-4 rounded-2xl p-5 sm:p-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-[#6e6e73]">Match ID (UUID)</label>
                            <input
                                type="text"
                                value={matchId}
                                onChange={(e) => setMatchId(e.target.value)}
                                placeholder="Enter match_id uuid..."
                                className="liquid-input h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase tracking-widest text-[#6e6e73]">Target Table</label>
                            <select
                                value={table}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setTable(value === 'match_reviews' ? 'match_reviews' : 'messages');
                                }}
                                className="h-11 w-full rounded-xl border border-[#d2d2d7] bg-white px-3 text-sm text-[#1d1d1f] outline-none transition focus:border-[#06c] focus:ring-[3px] focus:ring-[#06c]/20"
                            >
                                <option value="messages">messages</option>
                                <option value="match_reviews">match_reviews</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                        <Button onClick={handleSubscribe} disabled={status === 'SUBSCRIBED' || status === 'CONNECTING'} className="h-11 sm:w-auto">
                            Subscribe
                        </Button>
                        <Button onClick={handleUnsubscribe} disabled={status === 'DISCONNECTED'} variant="outline" className="h-11 sm:w-auto">
                            Unsubscribe
                        </Button>

                        <div className="flex flex-1 items-center justify-start gap-2 sm:justify-end">
                            <span className="text-xs text-[#6e6e73]">Status:</span>
                            <span
                                className={`rounded-full px-2 py-1 text-xs font-semibold ${status === 'SUBSCRIBED'
                                    ? 'bg-[#edf9f1] text-[#14532d]'
                                    : status === 'CONNECTING'
                                        ? 'bg-[#fff7ed] text-[#9a3412]'
                                        : 'bg-[#ececf0] text-[#6e6e73]'
                                    }`}
                            >
                                {status}
                            </span>
                        </div>
                    </div>
                    {notice && (
                        <p className="rounded-xl border border-[#f3d1d1] bg-[#fff5f5] px-3 py-2 text-xs text-[#b42318]">
                            {notice}
                        </p>
                    )}
                </section>

                <section className="space-y-2">
                    <h2 className="w-full border-b border-[#d2d2d7] pb-2 text-sm uppercase tracking-widest text-[#6e6e73]">
                        Event Log (Last 20)
                    </h2>

                    <div className="liquid-pane overflow-hidden rounded-2xl">
                        {logs.length === 0 ? (
                            <div className="p-8 text-center text-sm text-[#6e6e73]">
                                No events received yet. Insert rows from another client.
                            </div>
                        ) : (
                            <div className="divide-y divide-[#ececf0]">
                                {logs.map((log) => (
                                    <article key={log.id} className="grid grid-cols-1 gap-3 p-3 text-sm transition-colors hover:bg-[#f8f8fa] sm:grid-cols-12 sm:gap-4">
                                        <div className="sm:col-span-2">
                                            <span
                                                className={`text-xs font-semibold ${log.event_type === 'INSERT'
                                                    ? 'text-[#14532d]'
                                                    : log.event_type === 'UPDATE'
                                                        ? 'text-[#06c]'
                                                        : 'text-[#b91c1c]'
                                                    }`}
                                            >
                                                {log.event_type}
                                            </span>
                                            <p className="whitespace-nowrap text-[10px] text-[#8e8e93]">
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <div className="sm:col-span-10 space-y-1">
                                            <div className="flex items-start space-x-2 text-xs">
                                                <span className="text-[#8e8e93]">Row ID:</span>
                                                <span className="break-all text-[#1d1d1f]">{log.record_id}</span>
                                            </div>
                                            <div className="flex items-start space-x-2 text-xs">
                                                <span className="text-[#8e8e93]">Actor:</span>
                                                <span className="break-all text-[#06c]">{log.actor_id}</span>
                                            </div>
                                            <div className="mt-1 overflow-x-auto whitespace-nowrap rounded bg-[#f5f5f7] p-1.5 text-xs italic text-[#6e6e73]">
                                                {log.masked_content}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
