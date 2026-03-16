import { z } from 'zod';

export const LivenessSessionModeSchema = z.enum(['CAMERA_CAPTURE', 'TEST_CAPTURE']);
export const LivenessResultStatusSchema = z.enum(['PENDING', 'VERIFIED', 'FAILED', 'EXPIRED']);

export const LivenessSessionStartRequestSchema = z.object({
    capture_mode: z.enum(['CAMERA']).default('CAMERA'),
});

export const LivenessSessionStartResponseSchema = z.object({
    success: z.literal(true),
    provider: z.literal('LIVENESS'),
    session: z.object({
        mode: LivenessSessionModeSchema,
        session_id: z.string().min(1),
        callback_url: z.string().url(),
        result_url: z.string().url(),
        expires_at: z.string().min(1),
        capture_timeout_ms: z.number().int().positive(),
    }),
    message: z.string().optional(),
});

export const LivenessSessionCompleteRequestSchema = z.object({
    session_id: z.string().trim().min(1),
    capture_hash: z.string().trim().regex(/^[a-f0-9]{64}$/i, 'capture_hash must be a sha256 hex digest'),
    capture_width: z.number().int().positive().max(10000).optional(),
    capture_height: z.number().int().positive().max(10000).optional(),
    immediate_purge_confirmed: z.boolean().default(true),
});

export const LivenessSessionCompleteResponseSchema = z.object({
    success: z.boolean(),
    verification_state: z.enum(['PENDING', 'VERIFIED']),
    session_id: z.string().min(1),
    verified: z.boolean(),
    next_step: z.string().optional(),
    result_url: z.string().url(),
    retryable: z.boolean().default(true),
    message: z.string().optional(),
});

export const LivenessSessionResultResponseSchema = z.object({
    success: z.literal(true),
    session_id: z.string().min(1),
    status: LivenessResultStatusSchema,
    verified: z.boolean(),
    next_step: z.string().optional(),
    message: z.string().optional(),
});

export type LivenessSessionStartRequest = z.infer<typeof LivenessSessionStartRequestSchema>;
export type LivenessSessionStartResponse = z.infer<typeof LivenessSessionStartResponseSchema>;
export type LivenessSessionCompleteRequest = z.infer<typeof LivenessSessionCompleteRequestSchema>;
export type LivenessSessionCompleteResponse = z.infer<typeof LivenessSessionCompleteResponseSchema>;
export type LivenessSessionResultResponse = z.infer<typeof LivenessSessionResultResponseSchema>;
