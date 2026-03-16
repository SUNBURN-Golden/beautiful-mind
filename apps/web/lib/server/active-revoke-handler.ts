import { z } from 'zod';
import { RevokeDataSchema } from '../contracts/active-stage-contract.ts';

type SessionUser = {
    id: string;
};

const RevokeSchema = z.object({
    pause_participation: z.boolean().default(false),
    withdraw_data_processing: z.boolean().default(false),
});

type ActiveRevokeHandlerDeps<TAdmin> = {
    getSessionUser: () => Promise<SessionUser | null>;
    getServiceRoleClient: () => TAdmin;
    submitParticipationRevokeRequest: (
        admin: TAdmin,
        userId: string,
        params: { pauseParticipation: boolean; withdrawDataProcessing: boolean },
    ) => Promise<unknown>;
};

export async function handleActiveRevokeSubmit<TAdmin>(
    request: Request,
    deps: ActiveRevokeHandlerDeps<TAdmin>,
): Promise<Response> {
    try {
        const user = await deps.getSessionUser();
        if (!user) {
            return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = RevokeSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return Response.json({ error: 'BAD_REQUEST', message: 'Invalid revoke payload' }, { status: 400 });
        }

        if (!parsed.data.pause_participation && !parsed.data.withdraw_data_processing) {
            return Response.json(
                { error: 'BAD_REQUEST', message: 'At least one revoke option must be selected' },
                { status: 400 },
            );
        }

        const admin = deps.getServiceRoleClient();
        const rawResult = await deps.submitParticipationRevokeRequest(admin, user.id, {
            pauseParticipation: parsed.data.pause_participation,
            withdrawDataProcessing: parsed.data.withdraw_data_processing,
        });
        const contractResult = RevokeDataSchema.safeParse(rawResult);
        if (!contractResult.success) {
            return Response.json(
                {
                    error: 'ACTIVE_REVOKE_CONTRACT_MISMATCH',
                    message: contractResult.error.issues[0]?.message || 'Invalid revoke payload',
                },
                { status: 500 },
            );
        }

        return Response.json({ source: 'API', data: contractResult.data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return Response.json({ error: 'ACTIVE_REVOKE_SUBMIT_FAILED', message }, { status: 500 });
    }
}
