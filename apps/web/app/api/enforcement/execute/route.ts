import { NextResponse } from 'next/server';
import { getServiceRoleClient, getSessionUser, hasValidCronSecret, isAdminUser } from '@/lib/server/trust';
import { z } from 'zod';

const ExecuteSchema = z.object({
    action_id: z.string().uuid().optional().nullable(),
    limit: z.preprocess(
        (value) => (value === undefined || value === null || value === '' ? 20 : value),
        z.coerce.number().int().min(1).max(100)
    ),
});

async function canExecuteEnforcement(req: Request): Promise<{ allowed: boolean; actorId: string | null }> {
    if (hasValidCronSecret(req)) {
        return { allowed: true, actorId: null };
    }

    const user = await getSessionUser();
    if (!user) {
        return { allowed: false, actorId: null };
    }

    const admin = getServiceRoleClient();
    const allowed = await isAdminUser(admin, user.id);
    return { allowed, actorId: user.id };
}

export async function POST(req: Request) {
    try {
        const auth = await canExecuteEnforcement(req);
        if (!auth.allowed) {
            return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
        }

        const rawBody = await req.json().catch(() => null);
        const parsed = ExecuteSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json({ error: 'BAD_REQUEST', message: 'invalid action_id or limit' }, { status: 400 });
        }
        const actionId = parsed.data.action_id ?? null;
        const limit = parsed.data.limit;

        const admin = getServiceRoleClient();
        let actions: Array<{ id: string; action_type: string; due_process_state: string }> = [];

        if (actionId) {
            const { data: singleAction, error: singleActionError } = await admin
                .from('enforcement_actions')
                .select('id, action_type, due_process_state')
                .eq('id', actionId)
                .limit(1)
                .maybeSingle();

            if (singleActionError || !singleAction) {
                return NextResponse.json({ error: 'ACTION_NOT_FOUND' }, { status: 404 });
            }

            actions = [singleAction];
        } else {
            const { data: pendingActions, error: pendingError } = await admin
                .from('enforcement_actions')
                .select('id, action_type, due_process_state')
                .in('due_process_state', ['FINALIZED'])
                .in('action_type', ['SLASH', 'PENALTY', 'REVOKE_SBT'])
                .order('created_at', { ascending: true })
                .limit(limit);

            if (pendingError) {
                return NextResponse.json(
                    { error: 'FETCH_PENDING_ACTIONS_FAILED', message: pendingError.message },
                    { status: 500 }
                );
            }

            actions = pendingActions || [];
        }

        const results: Array<Record<string, unknown>> = [];

        for (const action of actions) {
            const { data: execResult, error: execError } = await admin.rpc('execute_enforcement_action', {
                p_action_id: action.id,
                p_executor_id: auth.actorId
            });

            results.push({
                action_id: action.id,
                action_type: action.action_type,
                ok: !execError,
                result: execResult || null,
                error: execError?.message || null
            });
        }

        const executedCount = results.filter((row) => row.ok).length;

        return NextResponse.json({
            success: true,
            requested: actions.length,
            executed: executedCount,
            results
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: 'INTERNAL_ERROR', message }, { status: 500 });
    }
}
