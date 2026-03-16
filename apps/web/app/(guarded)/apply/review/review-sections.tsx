import { SuccessNextStepPanel } from '@/components/ui-kit';
import { FlowInfoCard, FlowInfoGrid, FlowInset } from '@/components/screen-patterns';

type ApplyReviewSignalsSectionProps = {
    decision: string | null;
    reason: string | null;
};

export function ApplyReviewSignalsSection({ decision, reason }: ApplyReviewSignalsSectionProps) {
    return (
        <>
            <FlowInfoGrid className="mt-4">
                <FlowInfoCard
                    title="Current decision signal"
                    description={(
                        <>
                            <p className="mt-1">Decision: {decision || 'PENDING'}</p>
                            <p className="mt-1">Reason: {reason || 'N/A'}</p>
                        </>
                    )}
                />
                <FlowInfoCard
                    title="What happens next"
                    description="The decision will appear on the status page. If the result needs recovery, resubmission or appeal options open there."
                />
            </FlowInfoGrid>

            <FlowInset title="Operating principle" className="mt-6">
                Original documents are purged after the final decision. Manual review stays reserved for appeal, exception, and audit queues.
            </FlowInset>
        </>
    );
}

export function ApplyReviewSuccessSection() {
    return (
        <SuccessNextStepPanel
            title="The AI decision run was accepted"
            description="There can be a short delay before the final result appears on the status page."
            primaryHref="/apply/status"
            primaryLabel="Open status"
            secondaryHref="/apply/documents"
            secondaryLabel="Back to documents"
        />
    );
}
