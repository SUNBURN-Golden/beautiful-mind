import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ error: 'Missing Supabase environment variables in .env.local' }, { status: 500 });
        }

        // Service Role을 통한 관리자 권한 클라이언트 생성 (RLS 우회 및 auth.admin 접근 가능)
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        // 1. auth.users 에 사용자 생성 (이메일 자동 확정 처리)
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError) {
            console.error('[Supabase Auth Error]', authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2. public.profiles 에 유저 프로필 데이터 강제 생성
        const { data: profData, error: profError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: userId,
                email: email,
                reputation_score: 100, // 기본값 강제 할당 확인용
                verified: false
            })
            .select()
            .single();

        if (profError) {
            console.error('[Supabase DB Error]', profError);
            return NextResponse.json({ error: profError.message }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            user: { id: userId, email: authData.user.email },
            profile: profData
        });

    } catch (error: any) {
        console.error('Unexpected error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
