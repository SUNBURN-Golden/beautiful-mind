'use client';

import { useState } from 'react';

const VAULTS = ['OPS', 'REWARD', 'INSURANCE', 'EXPERIMENT'] as const;
type Vault = (typeof VAULTS)[number];

export default function TreasuryPage() {
    const [vault, setVault] = useState<Vault>('OPS');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<string | null>(null);

    const handleSpend = async (e: React.FormEvent) => {
        e.preventDefault();

        const trimmedNote = note.trim();
        if (!trimmedNote) {
            setError('A note is required for every treasury spend.');
            return;
        }

        const numAmount = Number(amount);
        if (!amount || numAmount <= 0) {
            setError('Amount must be greater than 0.');
            return;
        }

        if (!window.confirm(`Spend ${amount} from ${vault} vault?`)) {
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await fetch('/api/treasury/spend', {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vault,
                    amount: numAmount,
                    note: trimmedNote,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setError(data.message || `Treasury spend failed (${res.status})`);
                return;
            }
            setResult(`Spent ${amount} from ${vault}: ${data.status || 'submitted'}`);
            setAmount('');
            setNote('');
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-[34px] font-semibold tracking-tight">Treasury</h1>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {result && (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {result}
                </div>
            )}

            <form onSubmit={handleSpend} className="rounded-2xl border border-[#e5e5e7] bg-white p-6">
                <h2 className="mb-4 text-[20px] font-semibold">Spend from vault</h2>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="treasury-vault" className="block text-sm font-medium text-[#3a3a3c]">
                            Vault
                        </label>
                        <select
                            id="treasury-vault"
                            value={vault}
                            onChange={(e) => setVault(e.target.value as Vault)}
                            className="mt-1 w-full max-w-md rounded-lg border border-[#d2d2d7] px-3 py-2 text-sm focus:border-[#06c] focus:outline-none"
                        >
                            {VAULTS.map((v) => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="treasury-amount" className="block text-sm font-medium text-[#3a3a3c]">
                            Amount (SOUL)
                        </label>
                        <input
                            id="treasury-amount"
                            type="number"
                            min="1"
                            step="1"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="Enter amount"
                            className="mt-1 w-full max-w-md rounded-lg border border-[#d2d2d7] px-3 py-2 text-sm focus:border-[#06c] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label htmlFor="treasury-note" className="block text-sm font-medium text-[#3a3a3c]">
                            Note (required)
                        </label>
                        <input
                            id="treasury-note"
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            placeholder="Reason for spend"
                            className="mt-1 w-full max-w-md rounded-lg border border-[#d2d2d7] px-3 py-2 text-sm focus:border-[#06c] focus:outline-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !amount || Number(amount) <= 0 || !note.trim()}
                        className="inline-flex h-10 items-center rounded-lg bg-[#1d1d1f] px-4 text-sm font-medium text-white transition hover:bg-[#3a3a3c] disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : 'Spend'}
                    </button>
                </div>
            </form>
        </div>
    );
}