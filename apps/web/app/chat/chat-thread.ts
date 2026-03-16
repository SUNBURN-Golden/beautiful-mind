'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    completeMeetingSession,
    fetchConversationSeed,
    sendConversationMessage,
    type ConversationMessage,
    type ContractSource,
} from '@/lib/active-contract';
import { useStatus } from '@/lib/useStatus';

export const POLL_INTERVAL_MS = 12000;
export const STICKY_SCROLL_THRESHOLD = 96;

export type ChatMessage = ConversationMessage & {
    localState?: 'sending' | 'retry';
};

export function mapServerMessage(message: ConversationMessage): ChatMessage {
    return {
        id: message.id,
        sender: message.sender,
        mine: message.mine,
        text: message.text,
        sentAt: message.sentAt,
    };
}

export function mergeServerMessages(previous: ChatMessage[], incoming: ConversationMessage[]): ChatMessage[] {
    const serverMessages = incoming.map(mapServerMessage);
    const serverIds = new Set(serverMessages.map((message) => message.id));
    const pendingLocal = previous.filter((message) => message.localState && !serverIds.has(message.id));
    return [...serverMessages, ...pendingLocal];
}

export function formatShortTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function useChatThread() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const matchId = searchParams?.get('matchId') || '';
    const partnerNameParam = searchParams?.get('partnerName') || null;

    const { isLoading: statusLoading, currentStage } = useStatus();
    const stage = currentStage;

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [partnerName, setPartnerName] = useState(partnerNameParam || 'Partner');
    const [source, setSource] = useState<ContractSource | null>(null);
    const [loading, setLoading] = useState(true);
    const [threadError, setThreadError] = useState<string | null>(null);
    const [composerError, setComposerError] = useState<string | null>(null);
    const [syncNotice, setSyncNotice] = useState<string | null>(null);
    const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
    const [isCompletingMeet, setIsCompletingMeet] = useState(false);
    const [draft, setDraft] = useState('');
    const [isSending, setIsSending] = useState(false);

    const messagesRef = useRef<ChatMessage[]>([]);
    const listRef = useRef<HTMLDivElement | null>(null);
    const bottomAnchorRef = useRef<HTMLDivElement | null>(null);
    const stickToBottomRef = useRef(true);
    const firstPaintRef = useRef(true);

    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    const updateStickyMode = useCallback(() => {
        const listEl = listRef.current;
        if (!listEl) return;
        const distanceToBottom = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight;
        stickToBottomRef.current = distanceToBottom <= STICKY_SCROLL_THRESHOLD;
    }, []);

    const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
        bottomAnchorRef.current?.scrollIntoView({ behavior, block: 'end' });
    }, []);

    useEffect(() => {
        if (!stickToBottomRef.current) {
            return;
        }
        scrollToBottom(firstPaintRef.current ? 'auto' : 'smooth');
        firstPaintRef.current = false;
    }, [messages.length, scrollToBottom]);

    const loadThread = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
        if (!matchId) {
            setLoading(false);
            setThreadError('MATCH_ID_MISSING');
            return;
        }

        if (!silent) {
            setLoading(true);
            setThreadError(null);
        }

        try {
            const response = await fetchConversationSeed(matchId);
            setSource(response.source);
            setMessages((previous) => mergeServerMessages(previous, response.data.messages));
            setPartnerName(response.data.partnerName || partnerNameParam || 'Partner');
            setLastSyncedAt(new Date().toISOString());
            setSyncNotice(null);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'CHAT_LOAD_FAILED';
            if (!silent || messagesRef.current.length === 0) {
                setThreadError(message);
            } else {
                setSyncNotice('Live updates paused. Refresh to continue.');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [matchId, partnerNameParam]);

    useEffect(() => {
        void loadThread();
    }, [loadThread]);

    useEffect(() => {
        if (stage !== 'ACTIVE' || !matchId) return;
        const timer = window.setInterval(() => {
            if (document.visibilityState === 'visible') {
                void loadThread({ silent: true });
            }
        }, POLL_INTERVAL_MS);

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void loadThread({ silent: true });
            }
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [loadThread, matchId, stage]);

    const handleCompleteMeet = async () => {
        if (isCompletingMeet || !matchId) return;
        setIsCompletingMeet(true);
        setThreadError(null);
        setComposerError(null);
        try {
            const response = await completeMeetingSession(matchId);
            setSource(response.source);
            const transitionMessages = response.data.transitionMessages.map((row, index) => ({
                id: `system-${Date.now()}-${index}`,
                sender: row.sender,
                mine: false,
                text: row.text,
                sentAt: new Date().toISOString(),
            }));
            setMessages((previous) => [...previous, ...transitionMessages]);
            setTimeout(() => {
                router.push('/review');
            }, 1600);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'MEET_COMPLETE_FAILED';
            setThreadError(message);
        } finally {
            setIsCompletingMeet(false);
        }
    };

    const handleRetryMessage = async (messageId: string) => {
        const target = messagesRef.current.find((message) => message.id === messageId);
        if (!target || !target.mine || !target.localState || !matchId || isSending) {
            return;
        }

        setIsSending(true);
        setComposerError(null);
        setMessages((previous) => previous.map((message) => (
            message.id === messageId
                ? { ...message, localState: 'sending' }
                : message
        )));

        try {
            const response = await sendConversationMessage({
                matchId,
                content: target.text,
            });
            setSource(response.source);
            setMessages((previous) => previous.map((message) => (
                message.id === messageId
                    ? mapServerMessage(response.data)
                    : message
            )));
            setLastSyncedAt(new Date().toISOString());
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'MESSAGE_SEND_FAILED';
            setComposerError(message);
            setMessages((previous) => previous.map((entry) => (
                entry.id === messageId
                    ? { ...entry, localState: 'retry' }
                    : entry
            )));
        } finally {
            setIsSending(false);
        }
    };

    const handleSendMessage = async (event: React.FormEvent) => {
        event.preventDefault();
        const content = draft.trim();
        if (!content || !matchId || isSending) return;

        const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const optimisticMessage: ChatMessage = {
            id: localId,
            sender: 'You',
            mine: true,
            text: content,
            sentAt: new Date().toISOString(),
            localState: 'sending',
        };

        setIsSending(true);
        setComposerError(null);
        setThreadError(null);
        setMessages((previous) => [...previous, optimisticMessage]);
        setDraft('');

        try {
            const response = await sendConversationMessage({
                matchId,
                content,
            });
            setSource(response.source);
            setMessages((previous) => previous.map((message) => (
                message.id === localId
                    ? mapServerMessage(response.data)
                    : message
            )));
            setLastSyncedAt(new Date().toISOString());
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'MESSAGE_SEND_FAILED';
            setComposerError(message);
            setMessages((previous) => previous.map((entry) => (
                entry.id === localId
                    ? { ...entry, localState: 'retry' }
                    : entry
            )));
        } finally {
            setIsSending(false);
        }
    };

    const sourceLabel = source === 'ADAPTER' ? 'Continuity mode' : 'Live sync';
    const syncCopy = lastSyncedAt
        ? `Updates about every 12 seconds. Last sync ${formatShortTime(lastSyncedAt)}.`
        : 'Updates about every 12 seconds.';
    const reportHref = useMemo(() => {
        if (!matchId) {
            return '/report';
        }
        return `/report?matchId=${encodeURIComponent(matchId)}&partnerName=${encodeURIComponent(partnerName)}`;
    }, [matchId, partnerName]);

    return {
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
    };
}
