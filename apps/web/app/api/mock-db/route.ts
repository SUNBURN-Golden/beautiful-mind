import { NextResponse } from 'next/server';
import { hasValidCronSecret, isTestRouteEnabled } from '@/lib/server/trust';

type TableName = 'contracts' | 'osint_reports' | 'interviews';
type MockRecord = {
    id: string;
    user_id: string;
    [key: string]: unknown;
};
type MockDb = Record<TableName, MockRecord[]>;

const mockDb: MockDb = {
    contracts: [],
    osint_reports: [],
    interviews: [],
};

function isTableName(value: string): value is TableName {
    return value === 'contracts' || value === 'osint_reports' || value === 'interviews';
}

export async function POST(request: Request) {
    try {
        if (!isTestRouteEnabled() || !hasValidCronSecret(request)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const body = await request.json().catch(() => ({})) as {
            action?: unknown;
            table?: unknown;
            data?: Record<string, unknown>;
        };
        const action = typeof body.action === 'string' ? body.action : '';
        const table = typeof body.table === 'string' ? body.table : '';
        const data = typeof body.data === 'object' && body.data ? body.data : {};

        const userId = request.headers.get('Authorization')?.replace('Bearer ', '');
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        if (!isTableName(table)) return NextResponse.json({ error: 'Invalid table' }, { status: 400 });

        if (action === 'insert') {
            const record: MockRecord = {
                ...data,
                user_id: userId,
                id: Math.random().toString(36).slice(2, 11),
            };
            mockDb[table].push(record);
            return NextResponse.json({ success: true, data: record });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        if (!isTestRouteEnabled() || !hasValidCronSecret(request)) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const { searchParams } = new URL(request.url);
        const table = searchParams.get('table');
        const targetUserId = searchParams.get('targetUserId');
        const currentUserId = request.headers.get('Authorization')?.replace('Bearer ', '');

        if (!currentUserId || !table || !isTableName(table)) {
            return NextResponse.json({ error: 'Unauthorized or invalid table' }, { status: 401 });
        }

        const records = mockDb[table].filter((row) => row.user_id === targetUserId);
        const rlsFilteredRecords = records.filter((row) => row.user_id === currentUserId);

        if (records.length > 0 && rlsFilteredRecords.length === 0) {
            console.log(`[RLS BLOCK] User ${currentUserId} attempted to read User ${targetUserId}'s data in ${table}`);
            return NextResponse.json(
                { data: [] },
                { status: 200, headers: { 'X-RLS-Result': 'BLOCKED_ZERO_ROWS' } },
            );
        }

        return NextResponse.json({ data: rlsFilteredRecords }, { status: 200 });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
