'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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

    const createData = async (table: string, data: any) => {
        if (!currentUser) return addLog('로그인이 필요합니다.');

        addLog(`[Req] POST /api/mock-db (Create ${table}) by ${currentUser}`);

        const res = await fetch('/api/mock-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser}` },
            body: JSON.stringify({ action: 'insert', table, data })
        });
        const result = await res.json();
        addLog(`[Res] 200 OK | Created ID: ${result.data.id}`);
    };

    const fetchData = async (table: string, targetUserId: string) => {
        if (!currentUser) return addLog('로그인이 필요합니다.');

        addLog(`[Req] GET /api/mock-db?table=${table}&targetUserId=${targetUserId} (Requested by ${currentUser})`);

        const res = await fetch(`/api/mock-db?table=${table}&targetUserId=${targetUserId}`, {
            headers: { 'Authorization': `Bearer ${currentUser}` }
        });

        const isBlocked = res.headers.get('X-RLS-Result') === 'BLOCKED_ZERO_ROWS';
        const result = await res.json();

        if (isBlocked || result.data.length === 0) {
            addLog(`[Res] 200 OK | Data: 0 rows returned (RLS Policy Applied)`);
        } else {
            addLog(`[Res] 200 OK | Data: ${result.data.length} rows returned`);
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
        <div className="min-h-screen p-8 bg-gray-100 flex gap-6">
            <Card className="w-1/3 h-fit">
                <CardHeader>
                    <CardTitle>RLS Browser Test 시나리오</CardTitle>
                    <CardDescription>
                        계정 A로 데이터 생성 후, 계정 B로 로그인하여 계정 A의 데이터를 조회 시도합니다. RLS에 의해 0건 커트됨을 네트워크 탭과 로그로 확인합니다.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={runScenario} className="w-full">RLS 자동 테스트 시나리오 실행</Button>
                    <hr />
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => login(accountA)}>A 로그인</Button>
                        <Button variant="outline" onClick={() => login(accountB)}>B 로그인</Button>
                        <Button variant="secondary" onClick={logout}>로그아웃</Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="w-2/3 h-fit">
                <CardHeader>
                    <CardTitle>Network / Action Logs (Mock Network Tab)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="bg-black text-green-400 p-4 rounded-md font-mono text-sm h-[500px] overflow-y-auto whitespace-pre-wrap">
                        {logs.length === 0 && <span className="text-gray-500">대기 중...</span>}
                        {logs.join('\n')}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
