import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isLegacyFlowEnabled } from '@/lib/server/trust';
import { applyLegacyVerificationDecision } from '@/lib/server/admin-legacy-verification';
import { isRouteServiceError } from '@/lib/server/route-service-error';

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase Admin Env");
    return createClient(url, key);
};

export async function POST(req: Request) {
    try {
        if (!isLegacyFlowEnabled()) {
            return NextResponse.json(
                { error: { code: 'LEGACY_FLOW_DISABLED', message: 'Use /api/admin/admissions/decide.' }, details: {} },
                { status: 410 },
            );
        }

        const supabase = getAdminClient();
        const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
        if (!authHeader) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Auth required' }, details: {} }, { status: 401 });

        const { data: { user }, error: authErr } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (authErr || !user) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' }, details: {} }, { status: 401 });

        // Admin check
        const { data: adminRole } = await supabase.from('admin_roles').select('*').eq('user_id', user.id).single();
        if (!adminRole || !['SUPER_ADMIN', 'MANAGER'].includes(adminRole.role)) {
            return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin access required' }, details: {} }, { status: 403 });
        }

        const { verification_id, decision, tier, band, admin_note } = await req.json();
        if (!['VERIFIED', 'REJECTED', 'FRAUD_DOCS'].includes(decision)) {
            return NextResponse.json({ error: { code: 'BAD_REQUEST', message: 'Invalid decision' }, details: {} }, { status: 400 });
        }

        const result = await applyLegacyVerificationDecision(supabase, {
            verificationId: verification_id,
            decision,
            tier,
            band,
            adminNote: admin_note,
            reviewerUserId: user.id,
        });

        return NextResponse.json(result);
    } catch (e: unknown) {
        if (isRouteServiceError(e)) {
            return NextResponse.json(
                { error: { code: e.code, message: e.message }, details: {} },
                { status: e.status },
            );
        }
        const message = e instanceof Error ? e.message : 'INTERNAL_ERROR';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message }, details: {} }, { status: 500 });
    }
}
