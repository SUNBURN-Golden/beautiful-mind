import React from 'react';
import { FlowInset } from '@/components/screen-patterns';
import { FeedbackPanel, RecoverableErrorPanel, Skeleton } from '@/components/ui-kit';
import { formatShortTime, type ChatMessage } from './chat-thread';

type ChatMessageListProps = {
    messages: ChatMessage[];
    loading: boolean;
    threadError: string | null;
    matchId: string;
    listRef: React.RefObject<HTMLDivElement | null>;
    bottomAnchorRef: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    onReload: () => void;
    onRetryMessage: (messageId: string) => void;
};

export function ChatMessageList({
    messages,
    loading,
    threadError,
    matchId,
    listRef,
    bottomAnchorRef,
    onScroll,
    onReload,
    onRetryMessage,
}: ChatMessageListProps) {
    return (
        <>
            <div className="px-3 pt-3 sm:px-4">
                <FlowInset title="Conversation protection" className="text-[12px]">
                    Messages are encrypted in transit and handled under strict access controls.
                </FlowInset>
            </div>

            {loading && (
                <div className="px-3 pt-3 sm:px-4">
                    <Skeleton lines={4} />
                </div>
            )}

            {threadError && (
                <div className="px-3 pt-3 sm:px-4">
                    <RecoverableErrorPanel
                        title="Something interrupted this conversation"
                        message={threadError}
                        retryLabel="Reload Conversation"
                        onRetry={onReload}
                        secondaryHref="/match"
                        secondaryLabel="Back to Matches"
                    />
                </div>
            )}

            {!loading && !threadError && messages.length === 0 && (
                <div className="px-3 pt-3 sm:px-4">
                    <FeedbackPanel
                        tone="info"
                        title="No messages yet"
                        description="Start with a clear first message. If anything feels unsafe, use Report below."
                    />
                </div>
            )}

            <div
                ref={listRef}
                onScroll={onScroll}
                className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5"
            >
                {!loading && messages.map((message, index) => {
                    const previous = messages[index - 1];
                    const isSystem = message.sender === 'System';
                    const grouped = !isSystem
                        && previous
                        && previous.sender !== 'System'
                        && previous.sender === message.sender
                        && previous.mine === message.mine;
                    const alignmentClass = isSystem
                        ? 'items-center'
                        : message.mine
                            ? 'items-end'
                            : 'items-start';
                    const spacingClass = grouped ? 'mt-2' : 'mt-4';

                    return (
                        <div key={message.id} className={`flex flex-col ${alignmentClass} ${spacingClass}`}>
                            {isSystem ? (
                                <span className="rounded-full border border-[#d8dde5] bg-[#f7f8fb] px-3 py-1 text-center text-[11px] font-medium text-slate-600">
                                    {message.text}
                                </span>
                            ) : (
                                <div className={`max-w-[85%] rounded-2xl border px-3 py-2.5 sm:max-w-[80%] ${message.mine
                                    ? 'border-[#d6e6ff] bg-[#eef5ff]'
                                    : 'border-[#e5e5e7] bg-white'
                                }`}>
                                    {!grouped && (
                                        <span className="mb-1 block text-xs font-semibold text-[#6e6e73]">
                                            {message.sender}
                                        </span>
                                    )}
                                    <p className="text-sm leading-relaxed text-[#1d1d1f]">{message.text}</p>
                                    <div className="mt-1.5 flex items-center justify-end gap-2 text-[11px] text-[#8e8e93]">
                                        {message.localState === 'sending' && <span>Sending…</span>}
                                        {message.localState === 'retry' && <span className="text-[#b42318]">Send failed</span>}
                                        {!message.localState && <span>{formatShortTime(message.sentAt)}</span>}
                                        {message.localState === 'retry' && (
                                            <button
                                                type="button"
                                                className="font-semibold text-[#0a66c2] hover:underline"
                                                onClick={() => onRetryMessage(message.id)}
                                            >
                                                Retry
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                <div ref={bottomAnchorRef} />
            </div>

            {!matchId && (
                <div className="w-full px-3 pb-3 sm:px-4 sm:pb-4">
                    <RecoverableErrorPanel
                        title="Conversation context is missing"
                        message="This session has no match reference, so messaging is disabled."
                        secondaryHref="/match"
                        secondaryLabel="Back to Matches"
                    />
                </div>
            )}
        </>
    );
}
