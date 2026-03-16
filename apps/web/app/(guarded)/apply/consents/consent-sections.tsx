type ConsentChecklistSectionProps = {
    consentItems: Array<{
        type: string;
        label: string;
        phrase: string;
        checked: boolean;
        phraseInput: string;
        phraseMatches: boolean;
    }>;
    submitting: boolean;
    onToggleConsent: (type: string, checked: boolean) => void;
    onPhraseChange: (type: string, value: string) => void;
};

export function ConsentChecklistSection({
    consentItems,
    submitting,
    onToggleConsent,
    onPhraseChange,
}: ConsentChecklistSectionProps) {
    return (
        <>
            {consentItems.map((item) => (
                <section key={item.type} className="rounded-2xl border border-[#e5e5e7] bg-white p-4">
                    <label className="flex items-start gap-3 text-[14px] text-slate-800">
                        <input
                            type="checkbox"
                            className="liquid-checkbox mt-1"
                            checked={item.checked}
                            onChange={(event) => onToggleConsent(item.type, event.target.checked)}
                            disabled={submitting}
                        />
                        <span className="font-medium">{item.label}</span>
                    </label>

                    <div className="mt-3 grid gap-2">
                        <p className="text-[12px] text-slate-500">Type the phrase exactly as shown:</p>
                        <code className="rounded-md border border-[#e5e5e7] bg-[#f8f8fa] px-2 py-1 text-[12px] text-slate-700">{item.phrase}</code>
                        <input
                            value={item.phraseInput}
                            onChange={(event) => onPhraseChange(item.type, event.target.value)}
                            className="liquid-input"
                            placeholder="Type the exact phrase"
                            disabled={submitting}
                            aria-invalid={item.phraseInput.length > 0 && !item.phraseMatches}
                        />
                        {item.phraseInput.length > 0 && !item.phraseMatches && (
                            <p className="text-[12px] text-[#b42318]">The confirmation phrase must match exactly.</p>
                        )}
                    </div>
                </section>
            ))}
        </>
    );
}
