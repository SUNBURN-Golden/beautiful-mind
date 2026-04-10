import type { ReactNode } from 'react';

export default function ContractsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl space-y-8">
                <header className="space-y-2 border-b border-zinc-900 pb-5">
                    <h1 className="text-sm font-medium uppercase tracking-widest text-zinc-500">
                        SoulBound Trust Network
                    </h1>
                    <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
                        Institutional Adherence
                    </h2>
                    <p className="text-sm leading-relaxed text-zinc-400">
                        Access to the ACTIVE product surface requires strict legal adherence.
                        Review the covenants below. Proceeding without full comprehension carries binding liability.
                    </p>
                </header>
                
                <main className="rounded-md border border-zinc-800 bg-[#0f0f11] shadow-2xl">
                    {children}
                </main>
                
                <footer className="pt-4 text-center text-xs text-zinc-600">
                    <p>Protected by cryptographic ledger • Encrypted • Version Controlled</p>
                </footer>
            </div>
        </div>
    );
}
