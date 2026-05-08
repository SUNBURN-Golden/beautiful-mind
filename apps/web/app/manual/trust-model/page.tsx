import Link from 'next/link';
import { Button } from '@/components/ui/button';

const TRUST_FLOW = [
    {
        title: '1) Start with proof.',
        detail: 'Identity, liveness, consent, and required records are checked before the conversation space opens.',
    },
    {
        title: '2) We verify first.',
        detail: 'Submitted evidence is reviewed against the access standard before it can become trust.',
    },
    {
        title: '3) Trust becomes SOUL.',
        detail: 'Approved proof can issue or earn SOUL, the trust asset used for higher access and safer communication.',
    },
    {
        title: '4) Only what’s real remains.',
        detail: 'Original documents are removed after the final decision, while minimal claims remain for continuity, appeals, exceptions, and audits.',
    },
];

const PRINCIPLES = [
    'Core access does not open before approval.',
    'Original documents are purged immediately after the final decision.',
    'Verification results are retained only as minimal trust claims.',
    'Every access decision remains traceable when safety or appeal review requires it.',
];

export default function TrustModelPage() {
    return (
        <main className="sb-space-stage-antiquarian min-h-screen px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="relative overflow-hidden rounded-[2rem] border border-[rgba(241,233,219,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.012))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.26)] sm:p-8">
                    <div className="inline-flex rounded-full border border-[rgba(241,233,219,0.14)] bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--sb-stage-ink-soft)]">
                        Proof of trust → SOUL
                    </div>
                    <h1 className="sb-type-serif-display mt-4 text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.04] tracking-[-0.04em] text-[color:var(--sb-stage-ink-strong)]">
                        How SoulBound turns trust into SOUL
                    </h1>
                    <p className="mt-4 text-[1rem] leading-8 text-[color:var(--sb-stage-ink-muted)] sm:text-[1.08rem]">
                        SoulBound is not open by default. Proof is checked first, trust is formed deliberately, and SOUL carries
                        that trust into access and communication.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-5">
                        <Button asChild className="h-11 rounded-full bg-[color:var(--sb-stage-ink-strong)] px-5 text-[#1E2823] hover:bg-white">
                            <Link href="/manual">Open manual</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 rounded-full border-[rgba(241,233,219,0.22)] bg-white/5 px-5 text-[color:var(--sb-stage-ink-strong)] hover:bg-white/10">
                            <Link href="/apply">Start proof review</Link>
                        </Button>
                    </div>
                </header>

                <section className="rounded-2xl border border-[rgba(30,40,35,0.12)] bg-[rgba(240,229,210,0.96)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] sm:p-6">
                    <h2 className="sb-type-serif-display text-[24px] font-semibold text-[#1E2823]">Standards come first.</h2>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-7 text-[#4d453b]">
                        {PRINCIPLES.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </section>

                <section className="grid gap-4">
                    {TRUST_FLOW.map((item) => (
                        <article key={item.title} className="liquid-rise rounded-2xl border border-[rgba(30,40,35,0.12)] bg-[rgba(240,229,210,0.96)] p-5 shadow-[0_18px_48px_rgba(0,0,0,0.18)] sm:p-6">
                            <h3 className="sb-type-serif-display text-[22px] font-semibold text-[#1E2823]">{item.title}</h3>
                            <p className="mt-2 text-[14px] leading-7 text-[#63594c]">{item.detail}</p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}
