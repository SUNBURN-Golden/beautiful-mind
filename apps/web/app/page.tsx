import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

async function hasActiveSession(): Promise<boolean> {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        return Boolean(user);
    } catch (error) {
        console.error('Home session probe failed:', error);
        return false;
    }
}

export default async function HomePage() {
    const isSignedIn = await hasActiveSession();
    const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;
    const commitShort = commit && commit.length >= 7 ? commit.slice(0, 7) : 'local';

    return (
        <main className="liquid-shell px-4 pb-16 pt-12 sm:px-8 sm:pt-16">
            <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-between gap-12">
                <header className="space-y-5">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
                        SoulBound Trust Network
                    </div>
                    <h1 className="liquid-title max-w-3xl text-[40px] font-semibold leading-tight tracking-tight sm:text-[56px] text-balance">
                        완벽한 신뢰.<br />가장 안전하게 증명되다.
                    </h1>
                    <p className="liquid-copy max-w-2xl text-[16px] sm:text-[18px] leading-relaxed text-balance">
                        당신이 이룬 모든 것들을 있는 그대로 보여주세요.<br className="hidden sm:block" />
                        빈틈없는 자격 검증부터 영구적인 블록체인 기록까지, 오직 진짜 당신만의 평판을 세상에서 가장 안전하게 지켜냅니다.
                    </p>
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                        {isSignedIn ? (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href="/dashboard">대시보드로 이동</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href="/onboarding">온보딩 상태 확인</Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6">
                                    <Link href="/manual">이용 매뉴얼</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href="/signup">시작하기</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href="/login">로그인</Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6">
                                    <Link href="/manual">이용 매뉴얼</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-3">
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Privacy</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">익명성의 그늘에서 벗어나세요. 강력한 암호화 기술이 개인정보는 안전하게 숨기고, 당신의 진실함은 가장 확실하게 보여줍니다.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">SoulBound</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">누구도 흉내 낼 수 없는 당신의 발자취. 돈으로 살 수도, 남에게 넘겨줄 수도 없는 완전한 고유함을 당신에게 부여합니다.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Integrity</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">위변조가 불가능한 투명함. 모든 심사와 기록은 영구적인 장부 위에 쓰여져, 단 하나의 흔들림 없는 사실로 남습니다.</p>
                    </article>
                </section>

                <footer className="pb-2 text-xs text-[#6e6e73]">
                    build: soulbound-launch-ui-v3 · commit: {commitShort}
                </footer>
            </div>
        </main>
    );
}
