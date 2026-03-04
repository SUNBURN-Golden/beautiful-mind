import { NextResponse } from 'next/server';
import { isTestRouteEnabled } from '@/lib/server/trust';

export async function POST(request: Request) {
    try {
        if (!isTestRouteEnabled()) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const { consent_osint } = await request.json();

        // 철회(OFF) 상태일 경우 API 레벨에서 403 Forbidden 및 차단 에러 리턴
        if (consent_osint === false) {
            console.log('[API Block] Client attempted to generate OSINT report without consent.');
            return NextResponse.json(
                {
                    success: false,
                    error: 'CONSENT_REVOKED',
                    message: '사용자가 OSINT 수집에 동의하지 않았거나 철회하였습니다. 리포트를 생성할 수 없습니다.'
                },
                { status: 403 }
            );
        }

        // ON 상태일 경우 정상 (Mock) 리포트 생성 반환
        return NextResponse.json({
            success: true,
            data: {
                trustScore: 92,
                socialFootprint: 'Clean',
                riskFlags: 'None',
                generatedAt: new Date().toISOString()
            },
            message: 'OSINT 리포트 생성 완료.'
        }, { status: 200 });

    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
