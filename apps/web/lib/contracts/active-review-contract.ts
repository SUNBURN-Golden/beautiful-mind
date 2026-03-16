import { z } from 'zod';

export const TRUST_ATTESTATION_ACK_PHRASE = 'I SUBMIT A STRUCTURED TRUST ATTESTATION';

export const ActiveReviewSubmitRequestSchema = z.object({
    selected_items: z.array(z.string().trim().min(1)).min(1).max(10),
    escalation_requested: z.boolean().default(false),
    note: z.string().max(2000).optional().default(''),
    ack_phrase: z.string().trim().refine(
        (value) => value === TRUST_ATTESTATION_ACK_PHRASE,
        'Acknowledgement phrase mismatch',
    ),
    match_id: z.string().uuid().optional().nullable().default(null),
});

export const ActiveReviewSubmitDataSchema = z.object({
    event_id: z.string().min(1),
    submitted_at: z.string().min(1),
    selected_items: z.array(z.string()),
    escalation_requested: z.boolean(),
});

export const ActiveReviewSubmitResponseSchema = z.object({
    source: z.enum(['API', 'ADAPTER']).optional(),
    data: ActiveReviewSubmitDataSchema,
});

export type ActiveReviewSubmitRequest = z.infer<typeof ActiveReviewSubmitRequestSchema>;
export type ActiveReviewSubmitData = z.infer<typeof ActiveReviewSubmitDataSchema>;
export type ActiveReviewSubmitResponse = z.infer<typeof ActiveReviewSubmitResponseSchema>;
