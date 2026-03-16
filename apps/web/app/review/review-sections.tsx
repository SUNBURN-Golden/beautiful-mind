import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SuccessNextStepPanel } from '@/components/ui-kit';
import { ReferenceDetailsCard } from '@/components/screen-patterns';
import { TRUST_ATTESTATION_ACK_PHRASE } from '@/lib/contracts/active-review-contract';
import { ATTESTATION_ITEMS, type SubmittedPayload } from './review-content';

type ReviewFormSectionProps = {
    selected: Record<string, boolean>;
    escalationRequested: boolean;
    note: string;
    ackPhrase: string;
    onToggleItem: (id: string) => void;
    onEscalationChange: (value: boolean) => void;
    onNoteChange: (value: string) => void;
    onAckPhraseChange: (value: string) => void;
};

export function ReviewFormSection({
    selected,
    escalationRequested,
    note,
    ackPhrase,
    onToggleItem,
    onEscalationChange,
    onNoteChange,
    onAckPhraseChange,
}: ReviewFormSectionProps) {
    return (
        <>
            <div className="space-y-3">
                <Label className="text-[15px] font-semibold">Attestation Checklist</Label>
                <div className="grid gap-3">
                    {ATTESTATION_ITEMS.map((item) => (
                        <div key={item.id} className="rounded-xl border border-[#e5e5e7] bg-white p-4">
                            <div className="flex items-start gap-3">
                                <Checkbox id={item.id} checked={Boolean(selected[item.id])} onCheckedChange={() => onToggleItem(item.id)} />
                                <div>
                                    <Label htmlFor={item.id} className="cursor-pointer text-[14px] font-semibold text-[#1d1d1f]">
                                        {item.label}
                                    </Label>
                                    <p className="mt-1 text-[12px] text-[#6e6e73]">{item.description}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <ReferenceDetailsCard
                title="Before you submit"
                rows={[
                    { label: 'Purpose', value: 'Record what you directly observed.' },
                    { label: 'Scope', value: 'Keep it factual. No ratings, speculation, or character judgments.' },
                ]}
            />

            <div className="rounded-xl border border-[#e5e5e7] bg-white p-4">
                <div className="flex items-start gap-3">
                    <Checkbox id="escalation" checked={escalationRequested} onCheckedChange={(value) => onEscalationChange(Boolean(value))} />
                    <div>
                        <Label htmlFor="escalation" className="cursor-pointer text-[14px] font-semibold text-[#1d1d1f]">
                            Request careful follow-up
                        </Label>
                        <p className="mt-1 text-[12px] text-[#6e6e73]">
                            If selected, this attestation is routed for additional review attention.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="attestation-note">Additional Note (Optional)</Label>
                <textarea
                    id="attestation-note"
                    value={note}
                    onChange={(event) => onNoteChange(event.target.value)}
                    placeholder="Add concise, factual context (optional)."
                    className="min-h-[100px] w-full rounded-xl border border-[#d2d2d7] bg-white px-3 py-2 text-[14px] text-[#1d1d1f] outline-none ring-[#06c] transition focus:ring-2"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="attestation-ack">Type the confirmation phrase (Required)</Label>
                <p className="text-[12px] text-[#6e6e73]">This keeps each submission deliberate and accountable.</p>
                <p className="text-[12px] text-[#6e6e73]">{TRUST_ATTESTATION_ACK_PHRASE}</p>
                <Input
                    id="attestation-ack"
                    value={ackPhrase}
                    onChange={(event) => onAckPhraseChange(event.target.value)}
                    placeholder="Enter the phrase exactly as shown"
                />
            </div>
        </>
    );
}

type ReviewSuccessSectionProps = {
    submitted: SubmittedPayload;
    noteLength: number;
};

export function ReviewSuccessSection({ submitted, noteLength }: ReviewSuccessSectionProps) {
    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-[#cde8d4] bg-[#edf9f1] p-5">
                <h3 className="text-[22px] font-semibold text-[#14532d]">Attestation submitted</h3>
                <p className="text-[14px] text-[#14532d]">
                    Thank you. Your record now contributes to trust and accountability.
                </p>
                <ReferenceDetailsCard
                    className="mt-4"
                    rows={[
                        { label: 'Attestation ID', value: submitted.eventId },
                        { label: 'Submitted', value: submitted.submittedAt },
                        { label: 'Selected checks', value: submitted.selectedItems.join(', ') },
                        { label: 'Follow-up', value: submitted.escalationRequested ? 'Requested' : 'Not requested' },
                        { label: 'Optional note', value: `${noteLength} characters` },
                    ]}
                />
            </div>
            <SuccessNextStepPanel
                title="Your attestation is now on record"
                description="Continue with a report or preference update, or return to Dashboard."
                primaryHref="/dashboard"
                primaryLabel="Back to Dashboard"
                secondaryHref="/report"
                secondaryLabel="Open Report"
            />
        </div>
    );
}
