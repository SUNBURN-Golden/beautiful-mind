import { z } from 'zod';
import { IncidentDataSchema } from '../contracts/active-stage-contract.ts';

type SessionUser = {
    id: string;
};

const ReportSchema = z.object({
    summary: z.string().trim().min(8).max(2000),
    target_label: z.string().trim().max(120).optional().nullable().default(null),
    match_id: z.string().uuid().optional().nullable().default(null),
});

type ActiveReportHandlerDeps<TAdmin> = {
    getSessionUser: () => Promise<SessionUser | null>;
    getServiceRoleClient: () => TAdmin;
    submitActiveIncidentReport: (
        admin: TAdmin,
        userId: string,
        params: { summary: string; targetLabel?: string | null; matchId?: string | null },
    ) => Promise<unknown>;
};

export async function handleActiveReportSubmit<TAdmin>(
    request: Request,
    deps: ActiveReportHandlerDeps<TAdmin>,
): Promise<Response> {
    try {
        const user = await deps.getSessionUser();
        if (!user) {
            return Response.json({ error: 'AUTH_REQUIRED' }, { status: 401 });
        }

        const parsed = ReportSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
            return Response.json(
                { error: 'BAD_REQUEST', message: parsed.error.issues[0]?.message || 'Invalid report payload' },
                { status: 400 },
            );
        }

        const admin = deps.getServiceRoleClient();
        const rawResult = await deps.submitActiveIncidentReport(admin, user.id, {
            summary: parsed.data.summary,
            targetLabel: parsed.data.target_label,
            matchId: parsed.data.match_id,
        });
        const contractResult = IncidentDataSchema.safeParse(rawResult);
        if (!contractResult.success) {
            return Response.json(
                {
                    error: 'ACTIVE_REPORT_CONTRACT_MISMATCH',
                    message: contractResult.error.issues[0]?.message || 'Invalid incident payload',
                },
                { status: 500 },
            );
        }

        return Response.json({ source: 'API', data: contractResult.data });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        const status = message.startsWith('MATCH_NOT_FOUND') ? 404 : 500;
        return Response.json({ error: 'ACTIVE_REPORT_SUBMIT_FAILED', message }, { status });
    }
}
