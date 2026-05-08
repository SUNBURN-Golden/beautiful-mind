import Link from 'next/link';
import { Button } from '@/components/ui/button';

const VALUES = [
    {
        title: 'Limited access.',
        description: 'SoulBound opens the conversation space only after proof, verification, and trust formation are complete.',
    },
    {
        title: 'Trust becomes SOUL.',
        description: 'SOUL is the trust asset earned or issued after verified proof, not a badge granted by default.',
    },
    {
        title: 'Safer because less remains.',
        description: 'Original documents are purged after the final decision, while minimal verification claims remain for continuity.',
    },
    {
        title: 'Traceable when it matters.',
        description: 'Decisions remain auditable so access, appeal, and safety reviews can be explained without exposing everything.',
    },
];

const STEPS = [
    {
        title: '1) Start with proof.',
        details: ['Create your account and begin with evidence that can be checked before the space opens.'],
    },
    {
        title: '2) We verify first.',
        details: ['Identity and liveness checks confirm that one real person is behind the account.'],
    },
    {
        title: '3) Consent stays explicit.',
        details: ['Safety and data terms are confirmed one by one before review continues.'],
    },
    {
        title: '4) Documents are reviewed, then reduced.',
        details: [
            'Required official records support the trust decision.',
            'After a final decision, original documents are removed and only minimal verification claims remain.',
        ],
    },
    {
        title: '5) Trust forms into SOUL.',
        details: [
            'Approved proof can issue or earn SOUL.',
            'SOUL represents tokenized trust inside SoulBound.',
        ],
    },
    {
        title: '6) Access opens with boundaries.',
        details: ['Once trust is verified, matching, conversation, review, and safety controls become available.'],
    },
    {
        title: '7) Safety remains active.',
        details: [
            'Appeals, exceptions, audits, and reports keep the network accountable after access opens.',
            'Limited access is what makes boundless conversation possible.',
        ],
    },
];

export default function ManualPage() {
    return (
        <main className="sb-space-stage-antiquarian min-h-screen px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="relative overflow-hidden rounded-[2rem] border border-[rgba(241,233,219,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.26)] sm:p-8">
                    <div className="inline-flex rounded-full border border-[rgba(241,233,219,0.14)] bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--sb-stage-ink-soft)]">
                        Trust becomes SOUL.
                    </div>
                    <h1 className="sb-type-serif-display mt-4 max-w-3xl text-[clamp(2.4rem,6vw,4.8rem)] leading-[1.04] tracking-[-0.04em] text-[color:var(--sb-stage-ink-strong)]">
                        SoulBound guide
                    </h1>
                    <p className="mt-4 max-w-3xl text-[1rem] leading-8 text-[color:var(--sb-stage-ink-muted)] sm:text-[1.08rem]">
                        Evidence becomes verification. Verification forms trust. Trust becomes SOUL. SoulBound keeps access
                        limited so conversation can be more open, safer, and easier to believe.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-5">
                        <Button asChild className="h-11 rounded-full bg-[color:var(--sb-stage-ink-strong)] px-5 text-[#1E2823] hover:bg-white">
                            <Link href="/signup">Create your account</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 rounded-full border-[rgba(241,233,219,0.22)] bg-white/5 px-5 text-[color:var(--sb-stage-ink-strong)] hover:bg-white/10">
                            <Link href="/login">Return to your space</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 rounded-full border-[rgba(241,233,219,0.22)] bg-white/5 px-5 text-[color:var(--sb-stage-ink-strong)] hover:bg-white/10">
                            <Link href="/apply">Start proof review</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 rounded-full border-[rgba(241,233,219,0.22)] bg-white/5 px-5 text-[color:var(--sb-stage-ink-strong)] hover:bg-white/10">
                            <Link href="/manual/trust-model">View trust model</Link>
                        </Button>
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {VALUES.map((value) => (
                        <article key={value.title} className="rounded-2xl border border-[rgba(30,40,35,0.12)] bg-[rgba(240,229,210,0.96)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] sm:p-6">
                            <h2 className="sb-type-serif-display text-[22px] font-semibold text-[#1E2823]">{value.title}</h2>
                            <p className="mt-2 text-[14px] leading-7 text-[#63594c]">{value.description}</p>
                        </article>
                    ))}
                </section>

                <section className="grid gap-4">
                    {STEPS.map((step) => (
                        <article key={step.title} className="liquid-rise rounded-2xl border border-[rgba(30,40,35,0.12)] bg-[rgba(240,229,210,0.96)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] sm:p-6">
                            <h2 className="sb-type-serif-display text-[22px] font-semibold text-[#1E2823]">{step.title}</h2>
                            <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-7 text-[#4d453b]">
                                {step.details.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>

                <section className="rounded-2xl border border-[rgba(241,233,219,0.14)] bg-white/5 p-5 sm:p-6">
                    <h2 className="sb-type-serif-display text-[24px] font-semibold text-[color:var(--sb-stage-ink-strong)]">What stays limited</h2>
                    <p className="mt-2 text-[14px] leading-7 text-[color:var(--sb-stage-ink-muted)]">
                        Match, chat, review, reporting, and account controls remain reserved for verified accounts.
                    </p>
                    <p className="mt-2 text-[14px] leading-7 text-[color:var(--sb-stage-ink-muted)]">
                        Safety rules, retention limits, appeals, and audits continue after access opens.
                    </p>
                </section>
            </div>
        </main>
    );
}
