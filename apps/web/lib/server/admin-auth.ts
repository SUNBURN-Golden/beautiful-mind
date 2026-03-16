import type { SupabaseClient } from '@supabase/supabase-js';
import {
    getServiceRoleClient,
    getSessionUser,
    hasValidCronSecret,
    isAdminUser,
} from './trust';

export type AdminRouteAuthResult =
    | {
        ok: true;
        admin: SupabaseClient;
        actorUserId: string | null;
    }
    | {
        ok: false;
        status: 401 | 403;
        error: 'AUTH_REQUIRED' | 'FORBIDDEN';
    };

export async function assertAdminSession(): Promise<AdminRouteAuthResult> {
    const user = await getSessionUser();
    if (!user) {
        return { ok: false, status: 401, error: 'AUTH_REQUIRED' };
    }

    const admin = getServiceRoleClient();
    const allowed = await isAdminUser(admin, user.id);
    if (!allowed) {
        return { ok: false, status: 403, error: 'FORBIDDEN' };
    }

    return { ok: true, admin, actorUserId: user.id };
}

export async function assertAdminSessionOrCron(request: Request): Promise<AdminRouteAuthResult> {
    if (hasValidCronSecret(request)) {
        return { ok: true, admin: getServiceRoleClient(), actorUserId: null };
    }

    return assertAdminSession();
}
