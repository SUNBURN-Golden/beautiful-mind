import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { errorResponse } from './errors.ts';

export type StatusRequestContext = {
    admin: SupabaseClient;
    userId: string;
};

export async function resolveStatusRequestContext(
    req: Request,
): Promise<StatusRequestContext | Response> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
        return errorResponse('SERVER_MISCONFIG', 'Missing required Supabase env', 500);
    }

    const cookieStore = await cookies();
    const authHeader = req.headers.get('Authorization');
    const authClient = authHeader
        ? createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        })
        : createServerClient(supabaseUrl, anonKey, {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll() {
                    // Read-only in this endpoint.
                },
            },
        });

    const {
        data: { user },
        error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
        return errorResponse('AUTH_REQUIRED', 'Invalid or expired token', 401);
    }

    return {
        admin: createClient(supabaseUrl, serviceRoleKey),
        userId: user.id,
    };
}
