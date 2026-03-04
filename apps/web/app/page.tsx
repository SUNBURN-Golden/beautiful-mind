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
                    <h1 className="liquid-title max-w-3xl text-[40px] font-semibold leading-tight tracking-tight sm:text-[56px]">
                        Verify trust. Protect reputation. Launch with confidence.
                    </h1>
                    <p className="liquid-copy max-w-2xl text-[16px] sm:text-[18px]">
                        본인인증, 자격 검증, 인터뷰 심사를 거쳐 신뢰 배지를 발급합니다.
                        모든 상태 전이는 감사 로그와 원장 이벤트로 추적됩니다.
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
                            </>
                        ) : (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href="/signup">시작하기</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href="/login">로그인</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-3">
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Identity</h2>
                        <p className="text-sm text-[#1d1d1f]">PortOne 실명인증과 증적 해시 기반으로 위조 리스크를 낮춥니다.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Trust SBT</h2>
                        <p className="text-sm text-[#1d1d1f]">Self-claim LOW trust에서 Audit/Challenge 통과 시 HIGH trust로 승급됩니다.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Integrity</h2>
                        <p className="text-sm text-[#1d1d1f]">Audit log, ledger, anchor 기반으로 포함증명 가능한 무결성 체계를 유지합니다.</p>
                    </article>
                </section>

                <footer className="pb-2 text-xs text-[#6e6e73]">
                    build: soulbound-launch-ui-v1 · commit: {commitShort}
                </footer>
            </div>
        </main>
    );
}
