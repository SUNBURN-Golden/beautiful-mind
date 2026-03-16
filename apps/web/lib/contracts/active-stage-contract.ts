import { z } from 'zod';

export const ContractSourceSchema = z.enum(['API', 'ADAPTER']).default('API');

export const ActiveErrorSchema = z.object({
    error: z.string(),
    message: z.string().optional(),
});

export const MatchRowSchema = z.object({
    id: z.string(),
    partner_id: z.string(),
    partner_name: z.string(),
    trust_signal: z.number().nullable(),
    status: z.string(),
    tags: z.array(z.string()).optional().default([]),
    updated_at: z.string().nullable().optional().default(null),
});

export const MatchesEnvelopeSchema = z.object({
    source: ContractSourceSchema.optional(),
    data: z.array(MatchRowSchema),
});
export const MatchesDataSchema = MatchesEnvelopeSchema.shape.data;

export const MessageRowSchema = z.object({
    id: z.string(),
    sender: z.string(),
    mine: z.boolean(),
    text: z.string(),
    sent_at: z.string().optional().default(''),
});

export const ChatThreadEnvelopeSchema = z.object({
    source: ContractSourceSchema.optional(),
    data: z.object({
        match_id: z.string(),
        partner_id: z.string(),
        partner_name: z.string(),
        messages: z.array(MessageRowSchema).optional().default([]),
    }),
});

export const MessageEnvelopeSchema = z.object({
    source: ContractSourceSchema.optional(),
    data: MessageRowSchema,
});

export const MeetingCompletionEnvelopeSchema = z.object({
    source: ContractSourceSchema.optional(),
    data: z.object({
        review_session_id: z.string(),
        transition_messages: z.array(z.object({
            sender: z.string(),
            text: z.string(),
        })).optional().default([]),
    }),
});

export const IncidentDataSchema = z.object({
    report_id: z.string(),
    submitted_at: z.string(),
    escalation_queued: z.boolean(),
    linked_match_id: z.string().nullable(),
});

export const IncidentEnvelopeSchema = z.object({
    source: ContractSourceSchema.optional(),
    data: IncidentDataSchema,
});

export const RevokeDataSchema = z.object({
    request_id: z.string(),
    submitted_at: z.string(),
    status: z.literal('RECEIVED'),
    hidden_matches: z.number(),
});

export const RevokeEnvelopeSchema = z.object({
    source: ContractSourceSchema.optional(),
    data: RevokeDataSchema,
});
