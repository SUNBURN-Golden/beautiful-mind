import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export async function POST(req: Request) {
    try {
        const allowBackdoor = process.env.ALLOW_DANGEROUS_BACKDOOR === 'true';
        const devSecret = req.headers.get('x-dev-secret');
        if (!allowBackdoor || devSecret !== process.env.DEV_BACKDOOR_SECRET) {
            return NextResponse.json({ error: { code: 'PROD_BACKDOOR_LOCKED', message: 'Cron/Backdoor locked.' }, details: {} }, { status: 403 });
        }

        const { data: expired, error: dbErr } = await supabase.from('verifications')
            .select('artifact_object_key')
            .lt('artifact_expires_at', new Date().toISOString())
            .not('artifact_object_key', 'is', null);

        if (dbErr) throw dbErr;

        if (!expired || expired.length === 0) {
            return NextResponse.json({ success: true, purged: 0 });
        }

        const keys = expired.map(v => v.artifact_object_key).filter(Boolean);

        if (keys.length > 0) {
            const { error: storageErr } = await supabase.storage.from('verification-artifacts').remove(keys);
            if (storageErr) console.error('Storage Purge Error:', storageErr);

            // Optionally set object key to null locally, but dropping bucket file is the core requirement
            // We just keep the db column for audit if needed, or nullify:
            // await supabase.from('verifications').update({ artifact_object_key: null }).in('artifact_object_key', keys);
        }

        return NextResponse.json({ success: true, purged: keys.length });
    } catch (e: any) {
        return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message }, details: {} }, { status: 500 });
    }
}
