import type { ZodType } from 'zod';
import {
    ActiveReviewSubmitResponseSchema,
    TRUST_ATTESTATION_ACK_PHRASE,
} from './contracts/active-review-contract.ts';
import {
    ChatThreadEnvelopeSchema,
    IncidentEnvelopeSchema,
    MatchesEnvelopeSchema,
    MeetingCompletionEnvelopeSchema,
    MessageEnvelopeSchema,
    RevokeEnvelopeSchema,
} from './contracts/active-stage-contract.ts';

export type ContractSource = 'API' | 'ADAPTER';

export type MatchCandidate = {
    id: string;
    partnerId: string;
    name: string;
    trustSignal: number | null;
    statusLabel: string;
    tags: string[];
    updatedAt: string | null;
};

export type ConversationMessage = {
    id: string;
    sender: string;
    mine: boolean;
    text: string;
    sentAt: string;
};

export type TrustAttestationDraft = {
    selectedItems: string[];
    escalationRequested: boolean;
    note: string;
    ackPhrase?: string;
    matchId?: string | null;
};

export type IncidentReportDraft = {
    summary: string;
    targetLabel?: string | null;
    matchId?: string | null;
};

export type ParticipationRevokeDraft = {
    pauseParticipation: boolean;
    withdrawDataProcessing: boolean;
};

export type ContractEnvelope<T> = {
    source: ContractSource;
    data: T;
};

type ActiveApiError = {
    error?: string;
    message?: string;
};

type AttestationSubmission = {
    eventId: string;
    submittedAt: string;
    selectedItems: string[];
    escalationRequested: boolean;
};

type IncidentSubmission = {
    reportId: string;
    submittedAt: string;
    escalationQueued: boolean;
    linkedMatchId: string | null;
};

type RevokeSubmission = {
    requestId: string;
    submittedAt: string;
    status: 'RECEIVED';
    hiddenMatches: number;
};

type MeetingCompletion = {
    reviewSessionId: string;
    transitionMessages: Array<{ sender: string; text: string }>;
};

type ChatThread = {
    matchId: string;
    partnerId: string;
    partnerName: string;
    messages: ConversationMessage[];
};

function toErrorMessage(payload: unknown, fallback: string): string {
    if (typeof payload !== 'object' || payload === null) {
        return fallback;
    }

    const casted = payload as ActiveApiError;
    if (typeof casted.message === 'string' && casted.message.length > 0) {
        return casted.message;
    }
    if (typeof casted.error === 'string' && casted.error.length > 0) {
        return casted.error;
    }
    return fallback;
}

async function requestApi<T>({
    url,
    schema,
    fallbackError,
    init,
}: {
    url: string;
    schema: ZodType<T>;
    fallbackError: string;
    init?: RequestInit;
}): Promise<T> {
    const response = await fetch(url, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        cache: 'no-store',
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(toErrorMessage(payload, fallbackError));
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        throw new Error(`${fallbackError}_CONTRACT_MISMATCH`);
    }

    return parsed.data;
}

function mapTrustSignalToLabel(signal: number | null): string {
    if (signal === null) return 'Signal pending';
    return signal >= 100 ? 'Connection ready' : 'Needs review';
}

function mapSentAt(value: string): string {
    if (typeof value === 'string' && value.length > 0) {
        return value;
    }
    return new Date().toISOString();
}

export async function fetchMatchCandidates(): Promise<ContractEnvelope<MatchCandidate[]>> {
    const payload = await requestApi({
        url: '/api/active/matches',
        schema: MatchesEnvelopeSchema,
        fallbackError: 'ACTIVE_MATCHES_LOAD_FAILED',
    });

    return {
        source: payload.source || 'API',
        data: payload.data.map((row) => ({
            id: row.id,
            partnerId: row.partner_id,
            name: row.partner_name,
            trustSignal: row.trust_signal,
            statusLabel: mapTrustSignalToLabel(row.trust_signal),
            tags: row.tags,
            updatedAt: row.updated_at,
        })),
    };
}

export async function fetchConversationSeed(matchId: string): Promise<ContractEnvelope<ChatThread>> {
    const payload = await requestApi({
        url: `/api/active/chat/messages?match_id=${encodeURIComponent(matchId)}`,
        schema: ChatThreadEnvelopeSchema,
        fallbackError: 'ACTIVE_CHAT_LOAD_FAILED',
    });

    return {
        source: payload.source || 'API',
        data: {
            matchId: payload.data.match_id,
            partnerId: payload.data.partner_id,
            partnerName: payload.data.partner_name,
            messages: payload.data.messages.map((row) => ({
                id: row.id,
                sender: row.sender,
                mine: row.mine,
                text: row.text,
                sentAt: mapSentAt(row.sent_at),
            })),
        },
    };
}

export async function sendConversationMessage(params: {
    matchId: string;
    content: string;
}): Promise<ContractEnvelope<ConversationMessage>> {
    const payload = await requestApi({
        url: '/api/active/chat/messages',
        schema: MessageEnvelopeSchema,
        fallbackError: 'ACTIVE_CHAT_SEND_FAILED',
        init: {
            method: 'POST',
            body: JSON.stringify({
                match_id: params.matchId,
                content: params.content,
            }),
        },
    });

    return {
        source: payload.source || 'API',
        data: {
            id: payload.data.id,
            sender: payload.data.sender,
            mine: payload.data.mine,
            text: payload.data.text,
            sentAt: mapSentAt(payload.data.sent_at),
        },
    };
}

export async function completeMeetingSession(matchId: string): Promise<ContractEnvelope<MeetingCompletion>> {
    const payload = await requestApi({
        url: '/api/active/chat/complete',
        schema: MeetingCompletionEnvelopeSchema,
        fallbackError: 'ACTIVE_MEETING_COMPLETE_FAILED',
        init: {
            method: 'POST',
            body: JSON.stringify({ match_id: matchId }),
        },
    });

    return {
        source: payload.source || 'API',
        data: {
            reviewSessionId: payload.data.review_session_id,
            transitionMessages: payload.data.transition_messages,
        },
    };
}

export async function submitTrustAttestation(
    draft: TrustAttestationDraft,
): Promise<ContractEnvelope<AttestationSubmission>> {
    const payload = await requestApi({
        url: '/api/active/review/submit',
        schema: ActiveReviewSubmitResponseSchema,
        fallbackError: 'ACTIVE_REVIEW_SUBMIT_FAILED',
        init: {
            method: 'POST',
            body: JSON.stringify({
                selected_items: draft.selectedItems,
                escalation_requested: draft.escalationRequested,
                note: draft.note,
                ack_phrase: draft.ackPhrase || TRUST_ATTESTATION_ACK_PHRASE,
                match_id: draft.matchId || null,
            }),
        },
    });

    return {
        source: payload.source || 'API',
        data: {
            eventId: payload.data.event_id,
            submittedAt: payload.data.submitted_at,
            selectedItems: payload.data.selected_items,
            escalationRequested: payload.data.escalation_requested,
        },
    };
}

export async function submitIncidentReport(
    draft: IncidentReportDraft,
): Promise<ContractEnvelope<IncidentSubmission>> {
    const payload = await requestApi({
        url: '/api/active/report/submit',
        schema: IncidentEnvelopeSchema,
        fallbackError: 'ACTIVE_REPORT_SUBMIT_FAILED',
        init: {
            method: 'POST',
            body: JSON.stringify({
                summary: draft.summary,
                target_label: draft.targetLabel || null,
                match_id: draft.matchId || null,
            }),
        },
    });

    return {
        source: payload.source || 'API',
        data: {
            reportId: payload.data.report_id,
            submittedAt: payload.data.submitted_at,
            escalationQueued: payload.data.escalation_queued,
            linkedMatchId: payload.data.linked_match_id,
        },
    };
}

export async function submitParticipationRevoke(
    draft: ParticipationRevokeDraft,
): Promise<ContractEnvelope<RevokeSubmission>> {
    const payload = await requestApi({
        url: '/api/active/revoke/submit',
        schema: RevokeEnvelopeSchema,
        fallbackError: 'ACTIVE_REVOKE_SUBMIT_FAILED',
        init: {
            method: 'POST',
            body: JSON.stringify({
                pause_participation: draft.pauseParticipation,
                withdraw_data_processing: draft.withdrawDataProcessing,
            }),
        },
    });

    return {
        source: payload.source || 'API',
        data: {
            requestId: payload.data.request_id,
            submittedAt: payload.data.submitted_at,
            status: payload.data.status,
            hiddenMatches: payload.data.hidden_matches,
        },
    };
}
