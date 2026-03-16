import { Button } from '@/components/ui/button';
import { FeedbackPanel, SuccessNextStepPanel } from '@/components/ui-kit';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ReferenceDetailsCard } from '@/components/screen-patterns';

type RevokeFormSectionProps = {
    pauseParticipation: boolean;
    withdrawDataProcessing: boolean;
    submitting: boolean;
    canSubmit: boolean;
    onPauseChange: (value: boolean) => void;
    onWithdrawChange: (value: boolean) => void;
};

export function RevokeFormSection({
    pauseParticipation,
    withdrawDataProcessing,
    submitting,
    canSubmit,
    onPauseChange,
    onWithdrawChange,
}: RevokeFormSectionProps) {
    return (
        <>
            <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fbfbfd] p-4">
                <div className="space-y-1">
                    <Label htmlFor="pause-participation" className="text-base font-semibold">
                        Pause participation
                    </Label>
                    <p className="text-sm text-[#6e6e73]">
                        Temporarily pauses ACTIVE features such as Match, Chat, and Attestation.
                    </p>
                </div>
                <Switch
                    id="pause-participation"
                    checked={pauseParticipation}
                    onCheckedChange={onPauseChange}
                />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#ececf0] bg-[#fbfbfd] p-4">
                <div className="space-y-1">
                    <Label htmlFor="withdraw-processing" className="text-base font-semibold">
                        Request data-processing withdrawal
                    </Label>
                    <p className="text-sm text-[#6e6e73]">
                        Requests additional withdrawal review, subject to legal retention and audit obligations.
                    </p>
                </div>
                <Switch
                    id="withdraw-processing"
                    checked={withdrawDataProcessing}
                    onCheckedChange={onWithdrawChange}
                />
            </div>

            <Button
                type="submit"
                className="h-12 w-full"
                disabled={submitting || !canSubmit}
            >
                {submitting ? 'Saving preferences...' : 'Save Preferences'}
            </Button>
            {!canSubmit && (
                <div className="mt-3">
                    <FeedbackPanel
                        tone="warning"
                        title="Choose at least one preference"
                        description="Select participation pause or data-processing withdrawal to continue."
                    />
                </div>
            )}

            <ReferenceDetailsCard
                title="What happens next"
                rows={[
                    { label: 'Participation pause', value: 'ACTIVE surfaces are hidden after the request is applied.' },
                    { label: 'Data-processing withdrawal', value: 'Withdrawal requests may stay in review until legal and audit obligations are complete.' },
                ]}
            />
        </>
    );
}

type RevokeSuccessSectionProps = {
    submitted: {
        requestId: string;
        submittedAt: string;
        hiddenMatches: number;
    };
    submittedStatusLabel: string | undefined;
};

export function RevokeSuccessSection({ submitted, submittedStatusLabel }: RevokeSuccessSectionProps) {
    return (
        <div className="space-y-5 py-4">
            <div className="rounded-xl border border-[#cde8d4] bg-[#edf9f1] p-4 text-sm text-[#14532d]">
                <p className="font-semibold">Preference update received</p>
                <p className="mt-1">Your preferences were recorded successfully. We will apply them according to policy.</p>
            </div>
            <ReferenceDetailsCard
                rows={[
                    { label: 'Request ID', value: submitted.requestId },
                    { label: 'Submitted', value: submitted.submittedAt },
                    { label: 'Status', value: submittedStatusLabel || 'N/A' },
                    { label: 'Conversations hidden', value: submitted.hiddenMatches },
                ]}
            />
            <SuccessNextStepPanel
                title="Preference update submitted"
                description="You can follow this request in Status or return to Dashboard."
                primaryHref="/apply/status"
                primaryLabel="View Status"
                secondaryHref="/dashboard"
                secondaryLabel="Back to Dashboard"
            />
        </div>
    );
}
