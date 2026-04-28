import { NextResponse } from 'next/server';
import { resolveStatusRequestContext } from '@/lib/server/status-ssot/context';
import { errorResponse, internalServerError } from '@/lib/server/status-ssot/errors';
import {
    normalizeWalletLocale,
    getTxTypeLabel,
    getHoldStateLabel,
    getTxDirection,
} from '@/lib/wallet/wallet-labels';

export const dynamic = 'force-dynamic';

function safeRef(id: string | null | undefined): string {
    if (!id || typeof id !== 'string') return 'record';
    const clean = id.replace(/-/g, '');
    if (clean.length <= 8) return clean;
    return clean.slice(-8);
}

function safeAmount(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.abs(n) : 0;
}

export async function GET(req: Request) {
    try {
        const context = await resolveStatusRequestContext(req);
        if (context instanceof Response) {
            return context;
        }

        const { admin, userId } = context;
        const locale = normalizeWalletLocale(
            new URL(req.url).searchParams.get('lang'),
        );

        // 1) Wallet balance
        const { data: walletRow } = await admin
            .from('user_wallets')
            .select('balance, updated_at')
            .eq('user_id', userId)
            .maybeSingle();

        // 2) Recent activity (no meta)
        const { data: ledgerRows } = await admin
            .from('token_ledger')
            .select('id, amount, type, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        // 3) Active holds
        const { data: holdRows } = await admin
            .from('token_holds')
            .select('id, amount, state, created_at')
            .eq('user_id', userId)
            .in('state', ['PENDING', 'DISPUTED']);

        const totalBalance = safeAmount(walletRow?.balance ?? 0);

        const activeHolds = Array.isArray(holdRows) ? holdRows : [];
        const heldBalance = activeHolds.reduce(
            (sum: number, h: { amount: unknown }) => sum + safeAmount(h.amount),
            0,
        );

        const availableBalance = Math.max(totalBalance - heldBalance, 0);

        const activity = Array.isArray(ledgerRows)
            ? ledgerRows.map((row: { id: string | null; amount: unknown; type: string; created_at: string }) => ({
                safeReference: safeRef(row.id),
                label: getTxTypeLabel(row.type, locale),
                amount: safeAmount(row.amount),
                direction: getTxDirection(row.type),
                occurredAt: row.created_at ? new Date(row.created_at).toISOString() : null,
                status: 'Completed',
            }))
            : [];

        const holds = activeHolds.map((row: { id: string | null; amount: unknown; state: string; created_at: string }) => ({
            safeReference: safeRef(row.id),
            amount: safeAmount(row.amount),
            statusLabel: getHoldStateLabel(row.state, locale),
            createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        }));

        const body = {
            wallet: {
                totalBalance,
                availableBalance,
                heldBalance,
                currency: 'SOUL',
            },
            activity,
            holds,
        };

        return NextResponse.json(body, {
            status: 200,
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (err: unknown) {
        return internalServerError(err);
    }
}