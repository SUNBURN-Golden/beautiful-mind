import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Agent E: PortOne V2 SDK Mock Integration
 * 본인확인 파이프라인 뼈대. 
 * 성공 더미 응답을 반환하여 DB 프로필 테이블에 verified=true를 기록하도록 설계합니다.
 */
export async function POST(request: Request) {
    try {
        const { identityId, userId } = await request.json();

        if (!userId) {
            return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
        }

        const response = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityId)}`, {
            method: 'GET',
            headers: { Authorization: `PortOne ${process.env.PORTONE_API_SECRET}` }
        });

        if (!response.ok) {
            console.error('PortOne API Error:', await response.text());
            return NextResponse.json({ success: false, error: '포트원 조회 실패' }, { status: 400 });
        }

        const result = await response.json();

        if (result.status !== 'VERIFIED') {
            return NextResponse.json({ success: false, error: '인증이 완료되지 않았습니다.' }, { status: 400 });
        }

        // 1. 여기서 DB의 profiles 테이블을 업데이트합니다 (verified = true)
        const supabase = await createClient();
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ verified: true })
            .eq('id', userId);

        if (updateError) {
            console.error('Profile update error:', updateError);
            return NextResponse.json({ success: false, error: '프로필 업데이트 실패' }, { status: 500 });
        }

        console.log(`[PortOne] User ${userId} successfully verified. identityId: ${identityId}`);

        return NextResponse.json({
            success: true,
            data: result,
            message: '본인확인이 완료되었습니다.'
        });

    } catch (error) {
        console.error('PortOne Verification Error:', error);
        return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
    }
}
