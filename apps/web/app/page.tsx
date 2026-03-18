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
                        Selective Trust Network
                    </div>
                    <h1 className="liquid-title max-w-3xl text-[40px] font-semibold leading-tight tracking-tight sm:text-[56px] text-balance">
                        Trust begins with proof.
                    </h1>
                    <p className="liquid-copy max-w-2xl text-[16px] sm:text-[18px] leading-relaxed text-balance">
                        SoulBound is a selective, admission-based trust network.
                        Core access opens only after identity, liveness, consent, and document review are complete.
                    </p>
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
                        {isSignedIn ? (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href="/apply/status">View admission status</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href="/dashboard">Open ACTIVE dashboard</Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6">
                                    <Link href="/manual">Open manual</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button asChild className="h-12 px-6">
                                    <Link href="/signup">Start admission</Link>
                                </Button>
                                <Button asChild variant="outline" className="h-12 px-6">
                                    <Link href="/login">Log in</Link>
                                </Button>
                                <Button asChild variant="secondary" className="h-12 px-6">
                                    <Link href="/manual">Open manual</Link>
                                </Button>
                            </>
                        )}
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 pb-6 sm:grid-cols-3">
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Admission comes first.</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">Core access opens only after approval.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">We verify first.</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">Connection opens only after identity, liveness, consent, and document review are complete.</p>
                    </article>
                    <article className="liquid-pane rounded-2xl p-5">
                        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-[#6e6e73]">Safer because less remains.</h2>
                        <p className="text-sm text-[#1d1d1f] leading-relaxed">Original documents are not retained after review is complete. Minimal claims and decision records remain.</p>
                    </article>
                </section>

                <footer className="pb-2 text-xs text-[#6e6e73]">
                    Trust, by design. · build: soulbound-launch-ui-v3 · commit: {commitShort}
                </footer>
            </div>
        </main>
    );
}
