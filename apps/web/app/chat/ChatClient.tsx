'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ActiveMetaRow,
    ActiveSectionPanel,
    ActiveStatusChip,
    ActiveSupportText,
    ActiveSurfaceIntro,
    ActiveSurfaceShell,
} from '@/components/active-patterns';
import {
    PageLoadingState,
    StageTransitionNotice,
} from '@/components/ui-kit';
import { ReferenceDetailsCard } from '@/components/screen-patterns';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { ChatComposer } from './ChatComposer';
import { ChatMessageList } from './ChatMessageList';
import { useChatThread } from './chat-thread';

export default function ChatClient() {
    const router = useRouter();
    const {
        statusLoading,
        stage,
        matchId,
        partnerName,
        messages,
        loading,
        threadError,
        composerError,
        syncNotice,
        isCompletingMeet,
        draft,
        isSending,
        listRef,
        bottomAnchorRef,
        sourceLabel,
        syncCopy,
        reportHref,
        updateStickyMode,
        setDraft,
        loadThread,
        handleCompleteMeet,
        handleRetryMessage,
        handleSendMessage,
    } = useChatThread();

    if (statusLoading) {
        return (
            <PageLoadingState
                title="Preparing your conversation"
                description="We are verifying ACTIVE access and loading your thread."
                lines={5}
            />
        );
    }

    if (stage !== ADMISSION_STAGES.ACTIVE) {
        return (
            <StageTransitionNotice
                currentStep={stage}
                title="This area is available to ACTIVE members"
                description="Secure chat opens after admission approval and SOUL credential issuance."
            />
        );
    }

    return (
        <ActiveSurfaceShell maxWidth="max-w-6xl">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
                <div className="space-y-6">
                    <ActiveSurfaceIntro
                        title={`Conversation with ${partnerName}`}
                        description="Stay clear, specific, and respectful. This thread keeps one verified connection in focus at a time."
                        meta={(
                            <ActiveMetaRow>
                                <ActiveStatusChip>Connection • {sourceLabel}</ActiveStatusChip>
                            </ActiveMetaRow>
                        )}
                        note={syncCopy}
                    />

                    {syncNotice ? (
                        <ActiveSectionPanel className="border-amber-300 bg-amber-50 p-4">
                            <ActiveSupportText className="text-[12px] text-amber-900">{syncNotice}</ActiveSupportText>
                        </ActiveSectionPanel>
                    ) : null}

                    <Card className="liquid-pane liquid-rise flex h-[calc(100dvh-17rem)] min-h-[520px] w-full flex-col rounded-3xl border-[#e5e5e7] lg:h-[640px]">
                        <CardHeader className="border-b border-[#ececf0]">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-2">
                                    <CardTitle className="text-[22px] font-semibold text-[#1d1d1f]">{partnerName}</CardTitle>
                                    <ActiveMetaRow>
                                        <ActiveStatusChip>Connection • {sourceLabel}</ActiveStatusChip>
                                    </ActiveMetaRow>
                                </div>
                                <Button variant="outline" size="sm" className="h-9 px-3" onClick={() => router.push('/match')}>
                                    Back to Matches
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="flex flex-1 flex-col p-0">
                            <ChatMessageList
                                messages={messages}
                                loading={loading}
                                threadError={threadError}
                                matchId={matchId}
                                listRef={listRef}
                                bottomAnchorRef={bottomAnchorRef}
                                onScroll={updateStickyMode}
                                onReload={() => void loadThread()}
                                onRetryMessage={(messageId) => void handleRetryMessage(messageId)}
                            />
                        </CardContent>

                        <CardFooter className="flex flex-col gap-2 rounded-b-3xl border-t border-[#ececf0] bg-[#fbfbfd] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:p-4">
                            <ChatComposer
                                matchId={matchId}
                                composerError={composerError}
                                draft={draft}
                                isSending={isSending}
                                isCompletingMeet={isCompletingMeet}
                                loading={loading}
                                reportHref={reportHref}
                                onDraftChange={setDraft}
                                onSend={(event) => void handleSendMessage(event)}
                                onReport={() => router.push(reportHref)}
                                onCompleteMeet={() => void handleCompleteMeet()}
                            />
                        </CardFooter>
                    </Card>
                </div>

                <div className="space-y-4">
                    <ActiveSectionPanel>
                        <ReferenceDetailsCard
                            title="Conversation reference"
                            rows={[
                                { label: 'Partner', value: partnerName },
                                { label: 'Source', value: sourceLabel },
                                { label: 'Conversation ID', value: matchId || 'Not available' },
                            ]}
                        />
                    </ActiveSectionPanel>

                    <ActiveSectionPanel>
                        <p className="text-[13px] font-semibold text-slate-900">Safety and support</p>
                        <ActiveSupportText className="mt-2 text-[12px]">
                            Use Report Concern for policy or safety issues. Confirm Meeting only after both participants have actually met.
                        </ActiveSupportText>
                    </ActiveSectionPanel>
                </div>
            </div>
        </ActiveSurfaceShell>
    );
}
