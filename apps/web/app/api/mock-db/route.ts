import { NextResponse } from 'next/server';

// Mock In-Memory DB
let mockDb = {
    contracts: [] as any[],
    osint_reports: [] as any[],
    interviews: [] as any[]
};

export async function POST(request: Request) {
    try {
        const { action, table, data } = await request.json();
        const userId = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (action === 'insert') {
            const record = { ...data, user_id: userId, id: Math.random().toString(36).substr(2, 9) };
            (mockDb as any)[table].push(record);
            return NextResponse.json({ success: true, data: record });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table');
        const targetUserId = searchParams.get('targetUserId'); // 조회하려는 대상의 ID
        const currentUserId = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!currentUserId || !table) return NextResponse.json({ error: 'Unauthorized or invalid table' }, { status: 401 });

        // RLS (Row Level Security) POLICY MOCK:
        // 유저가 요청한 targetUserId의 데이터를 조회할 때, currentUserId와 targetUserId가 다르면 데이터 접근을 막거나 0건 리턴.
        // 여기서는 실제 Supabase RLS처럼 쿼리 조건(where user_id = auth.uid())에 의해 자신이 소유한 것만 보이도록 필터링.

        // 만약 악의적으로 다른 사람의 user_id 데이터를 파라미터로 요청했다고 가정:
        const records = (mockDb as any)[table].filter((row: any) => row.user_id === targetUserId);

        // RLS 핵심: DB 엔진 레벨에서 현재 요청자(currentUserId)가 소유한 row만 통과시킴
        const rlsFilteredRecords = records.filter((row: any) => row.user_id === currentUserId);

        // 로그 출력을 위해 RLS 필터 결과의 길이를 확인
        if (records.length > 0 && rlsFilteredRecords.length === 0) {
            console.log(`[RLS BLOCK] User ${currentUserId} attempted to read User ${targetUserId}'s data in ${table}`);
            // Supabase에서는 보통 0 rows returned (200 OK with empty array) 방식으로 작동합니다.
            return NextResponse.json({ data: [] }, { status: 200, headers: { 'X-RLS-Result': 'BLOCKED_ZERO_ROWS' } });
        }

        return NextResponse.json({ data: rlsFilteredRecords }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
