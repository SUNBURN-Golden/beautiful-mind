import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify Admin
    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerProfile } = await supabase.from('profiles').select('is_admin').eq('id', caller.id).single();
    if (!callerProfile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Fetch all evidence concurrently
    const [
        { data: profile },
        { data: consents },
        { data: contracts },
        { data: interviews },
        { data: auditLogs }
    ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('consents').select('*').eq('user_id', userId),
        supabase.from('contracts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('interviews').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').eq('record_id', userId).order('created_at', { ascending: false }).limit(50)
    ]);

    const evidencePackage = {
        generatedAt: new Date().toISOString(),
        generatedBy: caller.email,
        subjectId: userId,
        profile: profile || null,
        consents: consents || [],
        contracts: contracts || [],
        aiInterviews: interviews || [],
        recentAuditLogs: auditLogs || []
    };

    return new NextResponse(JSON.stringify(evidencePackage, null, 2), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="evidence_${userId}.json"`,
        },
    });
}
