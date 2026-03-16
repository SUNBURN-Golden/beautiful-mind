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
                        AI-Operated Trust Network
                    </div>
                    <h1 className="liquid-title max-w-3xl text-[40px] font-semibold leading-tight tracking-tight sm:text-[56px] text-balance">
                        입장은 자동 심사로.<br />신뢰는 검증으로.
                    </h1>
                    <p className="liquid-copy max-w-2xl text-[16px] sm:text-[18px] leading-relaxed text-balance">
                        SoulBound는 누구나 바로 진입하는 서비스가 아닙니다.<br className="hidden sm:block" />
                        `/apply/*`에서 신원·실재인물·동의·공식문서 4종을 제출하고 AI admission engine의 자동결정을 통과해야 핵심 기능이 열립니다.
                    </p>
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                        {isSignedIn ? (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href="/apply/status">Admission 상태 확인</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href="/dashboard">활성 사용자 대시보드 (승인 계정 전용)</Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6">
                                    <Link href="/manual">이용 매뉴얼</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href="/signup">Admission 신청 시작</Link>
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
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Admission</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">핵심 기능 접근은 승인 이후에만 열립니다. `/apply/*`가 제품의 중심 흐름입니다.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">AI-Operated</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">일반 케이스는 AI+규칙엔진이 자동 처리하고, 인간은 항소·예외·감사 콜드패스에서만 개입합니다.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Integrity</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">최종결정 후 원본 문서는 즉시 파기하고, 최소 검증 클레임과 원장 이벤트만 남겨 무결성을 유지합니다.</p>
                    </article>
                </section>

                <footer className="pb-2 text-xs text-[#6e6e73]">
                    build: soulbound-launch-ui-v3 · commit: {commitShort}
                </footer>
            </div>
        </main>
    );
}
