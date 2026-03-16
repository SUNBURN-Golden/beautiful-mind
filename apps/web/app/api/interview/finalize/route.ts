import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { isLegacyFlowEnabled } from '@/lib/server/trust';
import { parseFinalizeRequestBody } from '@/lib/server/interview-finalize/request';
import {
    fetchInterviewForFinalize,
    finalizeInterviewAndPersist,
    InterviewFinalizeDomainError,
} from '@/lib/server/interview-finalize/service';

export async function POST(request: Request) {
    try {
        if (!isLegacyFlowEnabled()) {
            return NextResponse.json(
                { error: 'LEGACY_FLOW_DISABLED', message: 'Interview hot path is disabled for admission-first mode.' },
                { status: 410 },
            );
        }

        const body = await request.json().catch(() => ({}));
        const parsed = parseFinalizeRequestBody(body);

        console.log('[SERVER DEBUG] Interview Finalize hit', {
            interview_id: parsed.interview_id,
            has_answer: Boolean(parsed.final_answer),
        });

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.log('[SERVER DEBUG] Unauthorized access to finalize');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        const interview = await fetchInterviewForFinalize(supabaseAdmin, {
            userId: user.id,
            interviewId: parsed.interview_id,
        });

        console.log('[SERVER DEBUG] Starting Gemini Finalization...', {
            transcript_len: Array.isArray(interview.transcript_json) ? interview.transcript_json.length : 0,
        });

        const result = await finalizeInterviewAndPersist(supabaseAdmin, {
            userId: user.id,
            interview,
        });

        console.log('[SERVER DEBUG] Interview Finalized Successfully', { interview_id: result.interviewId });
        return NextResponse.json(result.resolvedNode);
    } catch (error: unknown) {
        if (error instanceof InterviewFinalizeDomainError) {
            if (error.code === 'DB_UPDATE_FAILED') {
                return NextResponse.json(
                    { error: 'DB Update Failed', details: error.details || error.message },
                    { status: error.status },
                );
            }
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Interview Finalize Error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
