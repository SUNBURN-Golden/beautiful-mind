import { z } from 'zod';

const PhoneDigitsSchema = z
    .string()
    .trim()
    .regex(/^\d{10,11}$/, 'Phone number must contain 10-11 digits');

export const IdentitySessionStartRequestSchema = z.object({
    name: z.string().trim().min(2).max(80).optional(),
    phone: PhoneDigitsSchema.optional(),
});

export const IdentitySessionModeSchema = z.enum(['PORTONE_SDK', 'TEST_REDIRECT']);

export const IdentitySessionStartResponseSchema = z.object({
    success: z.literal(true),
    provider: z.literal('PORTONE'),
    session: z.object({
        mode: IdentitySessionModeSchema,
        identity_verification_id: z.string().min(1),
        redirect_url: z.string().url(),
        handoff_url: z.string().url().optional(),
        store_id: z.string().min(1).optional(),
        channel_key: z.string().min(1).optional(),
        expires_at: z.string().min(1),
    }),
    message: z.string().optional(),
});

export const IdentitySessionCompleteRequestSchema = z.object({
    identityVerificationId: z.string().trim().min(1),
    name: z.string().trim().min(2).max(80).optional(),
    phone: PhoneDigitsSchema.optional(),
});

export const IdentitySessionCompleteResponseSchema = z.object({
    success: z.boolean(),
    verified: z.boolean(),
    message: z.string().optional(),
    receipt_id: z.string().optional(),
    next_step: z.string().optional(),
});

export type IdentitySessionStartRequest = z.infer<typeof IdentitySessionStartRequestSchema>;
export type IdentitySessionStartResponse = z.infer<typeof IdentitySessionStartResponseSchema>;
export type IdentitySessionCompleteRequest = z.infer<typeof IdentitySessionCompleteRequestSchema>;
export type IdentitySessionCompleteResponse = z.infer<typeof IdentitySessionCompleteResponseSchema>;
