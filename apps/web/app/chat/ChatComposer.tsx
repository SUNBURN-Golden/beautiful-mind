import { Button } from '@/components/ui/button';
import { ActiveSupportText } from '@/components/active-patterns';
import { PageActionRow } from '@/components/screen-patterns';
import { FeedbackPanel, SuccessNextStepPanel } from '@/components/ui-kit';

type ChatComposerProps = {
    matchId: string;
    composerError: string | null;
    draft: string;
    isSending: boolean;
    isCompletingMeet: boolean;
    loading: boolean;
    reportHref: string;
    onDraftChange: (value: string) => void;
    onSend: (event: React.FormEvent) => void;
    onReport: () => void;
    onCompleteMeet: () => void;
};

export function ChatComposer({
    matchId,
    composerError,
    draft,
    isSending,
    isCompletingMeet,
    loading,
    reportHref,
    onDraftChange,
    onSend,
    onReport,
    onCompleteMeet,
}: ChatComposerProps) {
    return (
        <>
            {composerError && (
                <FeedbackPanel
                    tone="warning"
                    title="A message is waiting to be sent"
                    description={composerError}
                />
            )}

            <form className="flex w-full gap-2" onSubmit={onSend}>
                <label htmlFor="chat-draft-input" className="sr-only">Message input</label>
                <input
                    id="chat-draft-input"
                    value={draft}
                    onChange={(event) => onDraftChange(event.target.value)}
                    placeholder="Write with clarity and respect"
                    className="liquid-input h-12 flex-1"
                    disabled={isSending || isCompletingMeet || !matchId}
                />
                <Button
                    type="submit"
                    className="h-12 px-4"
                    disabled={isSending || isCompletingMeet || draft.trim().length === 0 || !matchId}
                >
                    {isSending ? 'Sending...' : 'Send'}
                </Button>
            </form>

            <ActiveSupportText className="mt-1 w-full">
                Use Report for policy concerns. Confirm Meeting only when both participants have met.
            </ActiveSupportText>

            <PageActionRow className="mt-2 w-full gap-2 sm:flex-nowrap">
                <Button
                    variant="destructive"
                    className="h-12 flex-1"
                    onClick={onReport}
                >
                    Report Concern
                </Button>
                <Button
                    className="h-12 flex-1"
                    disabled={isCompletingMeet || loading || !matchId}
                    onClick={onCompleteMeet}
                >
                    {isCompletingMeet ? 'Finalizing...' : 'Confirm Meeting'}
                </Button>
            </PageActionRow>

            {isCompletingMeet && (
                <div className="w-full">
                    <SuccessNextStepPanel
                        title="Finalizing your meeting confirmation"
                        description="Once the event is recorded, we will take you to attestation."
                        primaryHref="/review"
                        primaryLabel="Open Attestation"
                        secondaryHref="/apply/status"
                        secondaryLabel="View Status"
                    />
                </div>
            )}
        </>
    );
}
