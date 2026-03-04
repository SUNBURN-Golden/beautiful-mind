'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

type MockDbResponse = {
    data: Array<{ id: string }> | { id: string };
};

export default function RlsTestPage() {
    const [currentUser, setCurrentUser] = useState<string | null>(null);
    const [logs, setLogs] = useState<string[]>([]);

    const accountA = 'user_A_123';
    const accountB = 'user_B_456';

    const addLog = (msg: string) => setLogs(prev => [...prev, msg]);

    const login = (uid: string) => {
        setCurrentUser(uid);
        addLog(`============== [ 로그인: ${uid} ] ==============`);
    };

    const logout = () => {
        setCurrentUser(null);
        addLog(`============== [ 로그아웃 ] ==============`);
    };

    const createData = async (table: string, data: Record<string, unknown>) => {
        if (!currentUser) return addLog('로그인이 필요합니다.');

        addLog(`[Req] POST /api/mock-db (Create ${table}) by ${currentUser}`);

        const res = await fetch('/api/mock-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser}` },
            body: JSON.stringify({ action: 'insert', table, data })
        });
        const result = await res.json() as MockDbResponse;
        if (!Array.isArray(result.data) && result.data?.id) {
            addLog(`[Res] 200 OK | Created ID: ${result.data.id}`);
            return;
        }
        addLog('[Res] 200 OK | Created');
    };

    const fetchData = async (table: string, targetUserId: string) => {
        if (!currentUser) return addLog('로그인이 필요합니다.');

        addLog(`[Req] GET /api/mock-db?table=${table}&targetUserId=${targetUserId} (Requested by ${currentUser})`);

        const res = await fetch(`/api/mock-db?table=${table}&targetUserId=${targetUserId}`, {
            headers: { 'Authorization': `Bearer ${currentUser}` }
        });

        const isBlocked = res.headers.get('X-RLS-Result') === 'BLOCKED_ZERO_ROWS';
        const result = await res.json() as MockDbResponse;

        const rows = Array.isArray(result.data) ? result.data : [];
        if (isBlocked || rows.length === 0) {
            addLog(`[Res] 200 OK | Data: 0 rows returned (RLS Policy Applied)`);
        } else {
            addLog(`[Res] 200 OK | Data: ${rows.length} rows returned`);
        }
    };

    const runScenario = async () => {
        setLogs([]);
        login(accountA);
        await createData('contracts', { content: 'Signed terms' });
        await createData('osint_reports', { trustScore: 95 });
        await createData('interviews', { decision: 'APPROVED' });

        logout();

        login(accountB);
        await fetchData('contracts', accountA);
        await fetchData('osint_reports', accountA);
        await fetchData('interviews', accountA);
    };

    return (
        <main className="liquid-shell min-h-screen px-4 pb-12 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto flex max-w-6xl flex-col gap-6 lg:flex-row">
                <Card className="liquid-pane h-fit w-full rounded-2xl border-[#e5e5e7] lg:w-1/3">
                    <CardHeader>
                        <CardTitle className="text-[24px] font-semibold tracking-tight">RLS Browser Test</CardTitle>
                        <CardDescription>
                            계정 A로 데이터 생성 후 계정 B로 조회 시도하여 RLS 커트(0 rows)를 검증합니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="liquid-chip flex items-center justify-between rounded-xl px-3 py-2 text-xs">
                            <span className="text-[#6e6e73]">Current User</span>
                            <span className="font-semibold text-[#1d1d1f]">{currentUser ?? 'NONE'}</span>
                        </div>
                        <Button onClick={runScenario} className="h-12 w-full">RLS 자동 테스트 실행</Button>
                        <hr className="liquid-divider" />
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" onClick={() => login(accountA)} className="h-11 flex-1 min-w-[96px]">A 로그인</Button>
                            <Button variant="outline" onClick={() => login(accountB)} className="h-11 flex-1 min-w-[96px]">B 로그인</Button>
                            <Button variant="secondary" onClick={logout} className="h-11 w-full sm:w-auto">로그아웃</Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="liquid-pane h-fit w-full rounded-2xl border-[#e5e5e7] lg:w-2/3">
                    <CardHeader>
                        <CardTitle className="text-[24px] font-semibold tracking-tight">Network / Action Logs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#e5e5e7] bg-white p-4 font-mono text-sm text-[#1d1d1f] md:h-[500px]">
                            {logs.length === 0 && <span className="text-[#8e8e93]">대기 중...</span>}
                            {logs.join('\n')}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
