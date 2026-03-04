import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type ProfileUpdates = {
    height_cm?: number;
    weight_band?: string;
    location_region?: string;
    location_city?: string;
};

const getAdminClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing Supabase Admin Env");
    return createClient(url, key);
};

export async function POST(req: Request) {
    try {
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

        const { data: verification } = await supabase.from('verifications').select('*').eq('id', verification_id).single();
        if (!verification) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Verification not found' }, details: {} }, { status: 404 });

        let extracted_value: Record<string, unknown> =
            verification.extracted_value && typeof verification.extracted_value === 'object'
                ? verification.extracted_value
                : {};
        if (tier || band) {
            extracted_value = { ...extracted_value, tier, band };
        }

        // Determine DB Status & Reason
        const finalStatus = decision === 'FRAUD_DOCS' ? 'REJECTED' : decision;
        const finalReason = decision === 'FRAUD_DOCS' ? 'FRAUD_DOCS' : null;

        await supabase.from('verifications').update({
            status: finalStatus,
            adjudication_reason: finalReason,
            extracted_value,
            admin_note,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString()
        }).eq('id', verification_id);

        if (decision === 'VERIFIED') {
            // Derive profiles updates
            const updates: ProfileUpdates = {};
            if (verification.type === 'PHYSICAL') {
                if (typeof extracted_value.height_cm === 'number') updates.height_cm = extracted_value.height_cm;
                if (typeof extracted_value.band === 'string') updates.weight_band = extracted_value.band;
            } else if (verification.type === 'RESIDENCE') {
                if (typeof extracted_value.region === 'string') updates.location_region = extracted_value.region;
                if (typeof extracted_value.city === 'string') updates.location_city = extracted_value.city;
            }
            if (Object.keys(updates).length > 0) {
                await supabase.from('profiles').update(updates).eq('id', verification.user_id);
            }
        } else if (decision === 'FRAUD_DOCS') {
            // Immediate ban
            await supabase.from('profiles').update({ banned: true }).eq('id', verification.user_id);
            // Liquidated Damages via atomic RPC
            const { error: slashErr, data: slashData } = await supabase.rpc('slash_fraud_docs', {
                p_verification_id: verification_id,
                p_user_id: verification.user_id,
                p_slash_amount: 1000
            });
            if (slashErr) console.error('Fraud Slashing Error:', slashErr);
            else console.log('Fraud Slashing SUCCESS:', slashData);
        }

        // Strictly purge artifact from storage
        if (verification.artifact_object_key) {
            await supabase.storage.from('verification-artifacts').remove([verification.artifact_object_key]);
        }

        return NextResponse.json({ success: true, message: `Verification marked as ${decision}, artifact permanently purged.` });
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'INTERNAL_ERROR';
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message }, details: {} }, { status: 500 });
    }
}
