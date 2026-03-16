import type { SupabaseClient } from '@supabase/supabase-js';
import { appendSoulLedgerInternal } from './soul-ledger';
import { RouteServiceError } from './route-service-error';

type ReviewSessionRow = {
    id: string;
    target_id: string;
    stage: string;
    reveal_at: string | null;
    view_fee: number | string | null;
};

export async function unlockReviewSession(
    admin: SupabaseClient,
    viewerId: string,
    sessionId: string,
) {
    const { data: session, error: sessionErr } = await admin
        .from('review_sessions')
        .select('id, target_id, stage, reveal_at, view_fee')
        .eq('id', sessionId)
        .maybeSingle<ReviewSessionRow>();

    if (sessionErr || !session) {
        throw new RouteServiceError('REVIEW_SESSION_NOT_FOUND', 404, 'Session not found');
    }

    if (session.target_id !== viewerId) {
        throw new RouteServiceError('REVIEW_UNLOCK_FORBIDDEN', 403, 'Forbidden. Only target can unlock.');
    }

    if (!session.reveal_at || new Date() < new Date(session.reveal_at)) {
        throw new RouteServiceError('REVIEW_UNLOCK_REVEAL_PENDING', 403, 'Reveal date has not yet passed.');
    }

    if (session.stage !== 'SIGNED' && session.stage !== 'FINALIZED') {
        throw new RouteServiceError('REVIEW_UNLOCK_STAGE_BLOCKED', 403, 'Session is not yet signed or finalized.');
    }

    const viewFeeRaw = typeof session.view_fee === 'number'
        ? session.view_fee
        : Number(session.view_fee);
    const viewFee = Number.isFinite(viewFeeRaw) ? Math.max(0, Math.trunc(viewFeeRaw)) : 0;

    if (viewFee > 0) {
        const ledgerResult = await appendSoulLedgerInternal(admin, {
            userId: viewerId,
            amount: -viewFee,
            type: 'GAS_FEE_BURN',
            relatedId: sessionId,
            idempotencyKey: `UNLOCK_FEE:${sessionId}:${viewerId}`,
            meta: {
                scope: 'REVIEW_UNLOCK',
                reason: 'Fee burn for unlocking review signature',
            },
        });
        if (!['INSERTED', 'IDEMPOTENT_SKIPPED'].includes(String(ledgerResult.status || ''))) {
            throw new Error(ledgerResult.message || `Unexpected ledger status: ${String(ledgerResult.status || 'UNKNOWN')}`);
        }
    }

    const { error: unlockErr } = await admin
        .from('review_unlocks')
        .insert({
            session_id: sessionId,
            viewer_id: viewerId,
            idempotency_key: `UNLOCK:${sessionId}:${viewerId}`,
        });

    if (unlockErr && unlockErr.code !== '23505') {
        throw unlockErr;
    }

    return { unlocked: true, fee_burned: viewFee };
}
