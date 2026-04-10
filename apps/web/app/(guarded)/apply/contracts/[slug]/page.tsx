import { notFound } from 'next/navigation';
import { getContractDetails } from '@/lib/server/contracts';
import { submitContractSignature } from '../actions';
import Link from 'next/link';

export default async function GenericContractPage({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;
    const contract = await getContractDetails(slug);

    if (!contract) {
        notFound();
    }

    // A truly strict UI ensures the user must scroll through the full text
    // Since we're writing RSC, we will enforce it via client-side components optionally,
    // but the minimal "institutional" pattern is large visible text and explicit typing.

    return (
        <div className="flex flex-col">
            <div className="border-b border-zinc-800 bg-zinc-900 px-6 py-5">
                <h3 className="text-lg font-medium tracking-tight text-white">{contract.display_title}</h3>
                <p className="mt-1 text-sm text-zinc-400">{contract.summary_markdown}</p>
            </div>

            <div className="h-[400px] overflow-y-auto bg-[#0a0a0a] p-6 text-sm leading-relaxed text-zinc-300">
                {/* Fallback rendering of placeholder markdown */}
                <div className="prose prose-invert max-w-none">
                    <p>{contract.full_text_markdown}</p>
                </div>
            </div>

            <div className="border-t border-zinc-800 bg-zinc-900 p-6">
                <form action={submitContractSignature} className="space-y-4">
                    <input type="hidden" name="documentSlug" value={contract.document_slug} />
                    <input type="hidden" name="versionId" value={contract.id} />

                    {contract.req_typed_phrase && (
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
                                placeholder="Type the phrase above exactly..."
                                pattern={`^${contract.req_typed_phrase}$`}
                                className="mt-2 block w-full rounded-none border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:ring-0"
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                        <Link href="/apply/status" className="text-sm text-zinc-500 hover:text-zinc-300">
                            Retract & Return
                        </Link>
                        <button
                            type="submit"
                            className="bg-zinc-100 px-6 py-2.5 text-sm font-semibold tracking-tight text-zinc-950 transition hover:bg-white"
                        >
                            Sign & Proceed
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
