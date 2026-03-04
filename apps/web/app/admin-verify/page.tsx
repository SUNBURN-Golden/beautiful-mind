import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function AdminVerifyPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    const { data: consents } = await supabase.from('consents').select('*').eq('user_id', user.id);
    const { data: contracts } = await supabase.from('contracts').select('*').eq('user_id', user.id);
    const { data: interviews } = await supabase.from('interviews').select('*').eq('user_id', user.id);

    const blocks = [
        { title: '1. Auth User (auth.users)', data: user },
        { title: '2. Profile (public.profiles)', data: profile },
        { title: '3. Consents (public.consents)', data: consents },
        { title: '4. Contracts (public.contracts)', data: contracts },
        { title: '5. AI Interviews (public.interviews)', data: interviews },
    ];

    return (
        <main className="liquid-shell min-h-screen px-4 pb-12 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="space-y-2">
                    <h1 className="liquid-title text-[32px] font-semibold tracking-tight">인증 사용자 DB 무결성 검증</h1>
                    <p className="liquid-copy text-sm">현재 로그인 관리자 계정 기준으로 핵심 테이블 상태를 점검합니다.</p>
                </header>

                {blocks.map((block) => (
                    <section key={block.title} className="liquid-pane rounded-2xl border-[#e5e5e7] p-4 sm:p-5">
                        <h2 className="mb-3 text-lg font-semibold text-[#1d1d1f]">{block.title}</h2>
                        <pre className="max-h-[360px] overflow-auto rounded-xl border border-[#e5e5e7] bg-[#fbfbfd] p-3 text-xs text-[#3a3a3c] sm:text-sm">
                            {JSON.stringify(block.data, null, 2)}
                        </pre>
                    </section>
                ))}
            </div>
        </main>
    );
}
