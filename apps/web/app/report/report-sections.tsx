import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SuccessNextStepPanel } from '@/components/ui-kit';
import { ReferenceDetailsCard } from '@/components/screen-patterns';

type ReportFormSectionProps = {
    hasMatchContext: boolean;
    queryMatchId: string;
    targetLabel: string;
    summary: string;
    summaryLength: number;
    submitting: boolean;
    onTargetLabelChange: (value: string) => void;
    onSummaryChange: (value: string) => void;
    onBackToDashboard: () => void;
};

export function ReportFormSection({
    hasMatchContext,
    queryMatchId,
    targetLabel,
    summary,
    summaryLength,
    submitting,
    onTargetLabelChange,
    onSummaryChange,
    onBackToDashboard,
}: ReportFormSectionProps) {
    return (
        <>
            {hasMatchContext && (
                <ReferenceDetailsCard
                    title="Linked context"
                    rows={[
                        { label: 'Connection', value: 'This report will be attached to your current conversation.' },
                        { label: 'Conversation ID', value: queryMatchId },
                    ]}
                />
            )}

            <div className="space-y-2">
                <Label htmlFor="target">Person or account</Label>
                <Input
                    id="target"
                    value={targetLabel}
                    onChange={(event) => onTargetLabelChange(event.target.value)}
                    placeholder="Name, handle, or account label"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="reason">What happened</Label>
                <Input
                    id="reason"
                    value={summary}
                    onChange={(event) => onSummaryChange(event.target.value)}
                    placeholder="Describe the key facts clearly and briefly"
                    required
                />
                <p className="text-[11px] text-slate-500">Minimum 8 characters. Current length: {summaryLength}</p>
            </div>
            <div className="mt-4 rounded-xl border border-[#f3d1d1] bg-[#fff8f8] p-4 text-[11px] leading-relaxed text-[#6e6e73]">
                <span className="mb-1 block font-semibold text-[#b42318]">Accountability Notice (Required)</span>
                I confirm this report is factual and not exaggerated. I understand intentionally false reports may lead to account restrictions.
            </div>

            <Button type="submit" variant="destructive" className="mt-4 h-12 w-full" disabled={submitting || summaryLength < 8}>
                {submitting ? 'Submitting...' : 'Submit Report'}
            </Button>
            <Button type="button" variant="outline" className="h-12 w-full" onClick={onBackToDashboard}>
                Back to Dashboard
            </Button>
        </>
    );
}

type ReportSuccessSectionProps = {
    submitted: {
        reportId: string;
        submittedAt: string;
        escalationQueued: boolean;
        linkedMatchId: string | null;
    };
};

export function ReportSuccessSection({ submitted }: ReportSuccessSectionProps) {
    return (
        <div className="animate-in fade-in zoom-in space-y-4 py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#f4d6b8] bg-[#fff4d8] text-sm font-semibold text-[#9a3412]">
                Received
            </div>
            <h3 className="text-[22px] font-semibold text-[#1d1d1f]">Your report was received</h3>
            <p className="text-sm text-[#6e6e73]">
                Thank you for reporting. Your report is now in policy review.
            </p>
            <ReferenceDetailsCard
                rows={[
                    { label: 'Incident ID', value: submitted.reportId },
                    { label: 'Submitted', value: submitted.submittedAt },
                    { label: 'Escalation queue', value: submitted.escalationQueued ? 'Queued' : 'Not queued' },
                    { label: 'Linked conversation', value: submitted.linkedMatchId || 'Not linked' },
                ]}
                className="text-left"
            />
            <SuccessNextStepPanel
                title="Your report is now in review"
                description="You can follow progress in Status or return to Dashboard."
                primaryHref="/apply/status"
                primaryLabel="View Status"
                secondaryHref="/dashboard"
                secondaryLabel="Back to Dashboard"
            />
        </div>
    );
}
