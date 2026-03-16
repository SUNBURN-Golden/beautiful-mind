import Link from 'next/link';
import { Button } from '@/components/ui/button';

const VALUES = [
    {
        title: 'Trust, by design.',
        description: 'Admission is centralized as one source of truth, and core access stays closed until approval is complete.',
    },
    {
        title: 'Standards come first.',
        description: 'Identity, liveness, consent, and official documents are completed before access opens.',
    },
    {
        title: 'Safer because less remains.',
        description: 'Original documents are purged after the final decision, and only minimal verification claims remain.',
    },
    {
        title: 'Only what’s real remains.',
        description: 'Decision transitions stay traceable through ledger-style events and review-state history.',
    },
];

const STEPS = [
    {
        title: '1) Start with proof.',
        details: ['After `/login`, start your admission review from `/apply`.'],
    },
    {
        title: '2) We verify first.',
        details: ['Complete identity verification on `/apply/identity`.'],
    },
    {
        title: '3) Real-person check',
        details: ['Submit the liveness step on `/apply/liveness`.'],
    },
    {
        title: '4) Standards come first.',
        details: ['On `/apply/consents`, confirm each item individually and type the acknowledgement phrase exactly as shown.'],
    },
    {
        title: '5) Official documents',
        details: [
            'On `/apply/documents`, submit the required graduation, income, marital-status, and family records.',
            'Each document can be replaced, and the first AI read begins as soon as the upload lands.',
        ],
    },
    {
        title: '6) Automated decision',
        details: ['`/apply/review` runs the AI admission engine and confirms whether the automated path can finish the case.'],
    },
    {
        title: '7) Proven connection.',
        details: [
            'Use `/apply/status` to confirm whether the result is approved, rejected, or requires resubmission.',
            'Only appeal, exception, and audit cases move onto the human cold path. Approved cases issue a SOUL trust credential and transition to `ACTIVE`.',
        ],
    },
];

export default function ManualPage() {
    return (
        <main className="liquid-shell px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="space-y-3">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        Trust, built on proof.
                    </div>
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">
                        SoulBound manual
                    </h1>
                    <p className="liquid-copy max-w-3xl text-[15px] sm:text-[16px]">
                        Admission is a standard. SoulBound is a selective trust network, and core access opens only after
                        identity, liveness, consent, and document review are complete.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button asChild className="h-11 px-5">
                            <Link href="/signup">Sign up</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/login">Log in</Link>
                        </Button>
                        <Button asChild variant="secondary" className="h-11 px-5">
                            <Link href="/apply">Start admission</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/manual/trust-model">View trust model</Link>
                        </Button>
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {VALUES.map((value) => (
                        <article key={value.title} className="liquid-pane rounded-2xl p-5 sm:p-6">
                            <h2 className="liquid-title text-[20px] font-semibold">{value.title}</h2>
                            <p className="liquid-copy mt-2 text-[14px]">{value.description}</p>
                        </article>
                    ))}
                </section>

                <section className="grid gap-4">
                    {STEPS.map((step) => (
                        <article key={step.title} className="liquid-pane liquid-rise rounded-2xl p-5 sm:p-6">
                            <h2 className="liquid-title text-[20px] font-semibold">{step.title}</h2>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[#3a3a3c]">
                                {step.details.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>

                <section className="liquid-pane-muted rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[20px] font-semibold">Compatibility routes only</h2>
                    <p className="mt-2 text-[14px] text-[#3a3a3c]">
                        `/onboarding/*`, `/interview`, `/contract`, `/consent`, `/osint`, and `/admin-verify` are no longer the
                        primary flow. They remain only as compatibility redirects into the admission path.
                    </p>
                    <p className="mt-2 text-[14px] text-[#3a3a3c]">
                        `/match`, `/chat`, `/review`, `/report`, and `/revoke` are reserved for `ACTIVE` accounts and open only
                        after approval.
                    </p>
                </section>
            </div>
        </main>
    );
}
