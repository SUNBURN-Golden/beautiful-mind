import { notFound } from 'next/navigation';
import { getContractDetails } from '@/lib/server/contracts';
import { submitContractSignature } from '../actions';
import Link from 'next/link';

export default async function FraudPenaltyContractPage() {
    const contract = await getContractDetails('fraud-penalty');

    if (!contract) {
        notFound();
    }

    return (
        <div className="flex flex-col">
            <div className="border-b border-red-900/30 bg-red-950/20 px-6 py-5">
                <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-900/50 text-xs font-bold text-red-200">!</span>
                    <h3 className="text-lg font-medium tracking-tight text-red-100">{contract.display_title}</h3>
                </div>
                <p className="mt-2 text-sm text-zinc-300">
                    You are entering a trusted ecosystem. Intentional deception regarding identity, liveness, or credentials causes systemic damage and triggers a strict contractual penalty covenant.
                </p>
            </div>

            <div className="bg-[#0a0a0a] p-6 text-sm leading-relaxed text-zinc-300">
                <div className="rounded border border-red-900/30 bg-red-900/10 p-5">
                    <h4 className="font-semibold text-red-200">Contractual Penalty (위약금)</h4>
                    <p className="mt-2 text-red-100/80">
                        If you are later found to have deceived SoulBound AI with forged, altered, borrowed, misattributed, or otherwise false review documents or identity-supporting materials, you hereby acknowledge and agree that a separate contractual penalty (위약금) of up to <strong>KRW 1,000,000,000</strong> may be imposed. This is independent of ordinary liquidated damages.
                    </p>
                    <div className="mt-4 text-xs italic text-zinc-500">
                        {contract.full_text_markdown}
                    </div>
                </div>
            </div>

            <div className="border-t border-zinc-800 bg-zinc-900 p-6">
                <form action={submitContractSignature} className="space-y-6">
                    <input type="hidden" name="documentSlug" value="fraud-penalty" />
                    <input type="hidden" name="versionId" value={contract.id} />

                    <div className="space-y-3">
                        <label className="flex items-start gap-3">
                            <input
                                type="checkbox"
                                name="secondaryConfirm"
                                required
                                className="mt-1 flex-shrink-0 border-zinc-700 bg-zinc-900 text-zinc-100 focus:ring-zinc-500"
                            />
                            <span className="text-sm text-zinc-300">
                                I understand this is a separate contractual penalty covenant and not standard terms of service boilerplate.
                            </span>
                        </label>
                    </div>

                    <div className="space-y-2 rounded-md border border-zinc-800 bg-[#0a0a0a] p-4">
                        <label className="block text-xs font-medium uppercase tracking-widest text-zinc-500">
                            Required Acknowledgement
                        </label>
                        <p className="text-sm font-medium text-white italic">
                            "{contract.req_typed_phrase}"
                        </p>
                        <input
                            type="text"
                            name="typedPhrase"
                            required
                            placeholder="Type the exact phrase above..."
                            pattern={`^${contract.req_typed_phrase}$`}
                            title={`Must exactly match: ${contract.req_typed_phrase}`}
                            className="mt-2 block w-full rounded-none border border-red-900/30 bg-black px-3 py-2 text-sm text-red-100 placeholder-zinc-700 focus:border-red-500 focus:ring-0"
                        />
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <Link href="/apply/status" className="text-sm text-zinc-500 hover:text-zinc-300">
                            Decline & Exit
                        </Link>
                        <button
                            type="submit"
                            className="bg-red-900/80 px-6 py-2.5 text-sm font-semibold tracking-tight text-white transition hover:bg-red-800"
                        >
                            Execute Penalty Covenant
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
