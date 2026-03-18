import Link from 'next/link';
import { Button } from '@/components/ui/button';

const TRUST_FLOW = [
    {
        title: '1) Start with proof.',
        detail: 'Identity, liveness, consent, and the required official documents are completed before access opens.',
    },
    {
        title: '2) We verify first.',
        detail: 'The first review organizes submitted records for policy evaluation.',
    },
    {
        title: '3) Admission is a standard.',
        detail: 'The automated review determines whether a case is approved, rejected, returned for resubmission, or routed as an exception.',
    },
    {
        title: '4) Only what’s real remains.',
        detail: 'Approved cases issue a SOUL trust credential, and the system retains minimal claims while human review stays limited to appeal, exception, and audit cases.',
    },
];

const PRINCIPLES = [
    'Core access does not open before approval.',
    'Original documents are purged immediately after the final decision.',
    'Verification results are retained only as minimal claims.',
    'Every decision remains traceable.',
];

export default function TrustModelPage() {
    return (
        <main className="liquid-shell px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="space-y-3">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        Trust, by design.
                    </div>
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">Admission trust model</h1>
                    <p className="liquid-copy text-[15px] sm:text-[16px]">
                        Trust is not open by default. We verify first, retain less, and keep every decision auditable.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild className="h-11 px-5">
                            <Link href="/manual">Open manual</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/apply">Start admission</Link>
                        </Button>
                    </div>
                </header>

                <section className="liquid-pane rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[22px] font-semibold">Standards come first.</h2>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[#3a3a3c]">
                        {PRINCIPLES.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </section>

                <section className="grid gap-4">
                    {TRUST_FLOW.map((item) => (
                        <article key={item.title} className="liquid-pane liquid-rise rounded-2xl p-5 sm:p-6">
                            <h3 className="liquid-title text-[20px] font-semibold">{item.title}</h3>
                            <p className="liquid-copy mt-2 text-[14px]">{item.detail}</p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}
