import type { SupabaseClient } from '@supabase/supabase-js';

type JsonObject = Record<string, unknown>;

export const SOUL_LEDGER_RPC = {
    CLAIM_AIRDROP: 'claim_soul_airdrop',
    TREASURY_SPEND: 'treasury_spend_with_budget',
    APPEND_INTERNAL: 'append_soul_ledger_internal',
} as const;

type SoulLedgerRpcName = (typeof SOUL_LEDGER_RPC)[keyof typeof SOUL_LEDGER_RPC];

export type TreasuryVault = 'OPS' | 'REWARD' | 'INSURANCE' | 'EXPERIMENT';

export type SoulLedgerTxType =
    | 'AIRDROP'
    | 'REWARD_MINT'
    | 'TREASURY_GRANT'
    | 'TREASURY_SPEND'
    | 'GAS_FEE_BURN'
    | 'GAS_FEE_TIP'
    | 'SLASHING_BURN'
    | 'COLLATERAL_DEPOSIT'
    | 'COLLATERAL_REFUND'
    | 'COLLATERAL_SLASH'
    | 'SLASHING_COMPENSATE'
    | (string & {});

export type AirdropClaimRpcResult = {
    status?: string;
    claim_no?: number;
    cohort?: string;
    amount?: number;
    ledger_id?: string | null;
};

export type TreasurySpendRpcResult = {
    status?: string;
    budget_id?: string | null;
    vault?: string;
    amount?: number;
    outflow_used?: number;
    max_outflow?: number;
    ledger_id?: string | null;
};

export type InternalLedgerAppendRpcResult = {
    status?: string;
    ledger_id?: string | null;
    idempotency_key?: string | null;
    message?: string;
};

export type ClaimSoulAirdropParams = {
    userId: string;
    idempotencyKey?: string | null;
};

export type SpendTreasuryWithBudgetParams = {
    vault: TreasuryVault;
    amount: number;
    relatedId?: string | null;
    idempotencyKey?: string | null;
    meta?: JsonObject;
};

export type AppendSoulLedgerInternalParams = {
    userId: string | null;
    amount: number;
    type: SoulLedgerTxType;
    relatedId?: string | null;
    idempotencyKey?: string | null;
    meta?: JsonObject;
};

type ClaimSoulAirdropRpcPayload = {
    p_user_id: string;
    p_idempotency_key: string | null;
};

type SpendTreasuryWithBudgetRpcPayload = {
    p_vault: TreasuryVault;
    p_amount: number;
    p_related_id: string | null;
    p_idempotency_key: string | null;
    p_meta: JsonObject;
};

type AppendSoulLedgerInternalRpcPayload = {
    p_user_id: string | null;
    p_amount: number;
    p_type: SoulLedgerTxType;
    p_related_id: string | null;
    p_idempotency_key: string | null;
    p_meta: JsonObject;
};

function normalizeMeta(meta?: JsonObject): JsonObject {
    return meta ?? {};
}

function normalizeRpcResult<TResult>(data: unknown): TResult {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data as TResult;
    }

    return {} as TResult;
}

async function callSoulLedgerRpc<TResult>(
    admin: SupabaseClient,
    rpc: SoulLedgerRpcName,
    payload: Record<string, unknown>,
): Promise<TResult> {
    const { data, error } = await admin.rpc(rpc, payload);
    if (error) {
        throw new Error(`[${rpc}] ${error.message}`);
    }

    return normalizeRpcResult<TResult>(data);
}

export function buildClaimSoulAirdropRpcPayload(
    params: ClaimSoulAirdropParams,
): ClaimSoulAirdropRpcPayload {
    return {
        p_user_id: params.userId,
        p_idempotency_key: params.idempotencyKey ?? null,
    };
}

export function buildSpendTreasuryWithBudgetRpcPayload(
    params: SpendTreasuryWithBudgetParams,
): SpendTreasuryWithBudgetRpcPayload {
    return {
        p_vault: params.vault,
        p_amount: params.amount,
        p_related_id: params.relatedId ?? null,
        p_idempotency_key: params.idempotencyKey ?? null,
        p_meta: normalizeMeta(params.meta),
    };
}

export function buildAppendSoulLedgerInternalRpcPayload(
    params: AppendSoulLedgerInternalParams,
): AppendSoulLedgerInternalRpcPayload {
    return {
        p_user_id: params.userId,
        p_amount: params.amount,
        p_type: params.type,
        p_related_id: params.relatedId ?? null,
        p_idempotency_key: params.idempotencyKey ?? null,
        p_meta: normalizeMeta(params.meta),
    };
}

// Canonical SOUL write boundary. All web-side SOUL mutations should call one of these wrappers.
export async function claimSoulAirdrop(
    admin: SupabaseClient,
    params: ClaimSoulAirdropParams,
): Promise<AirdropClaimRpcResult> {
    return callSoulLedgerRpc<AirdropClaimRpcResult>(
        admin,
        SOUL_LEDGER_RPC.CLAIM_AIRDROP,
        buildClaimSoulAirdropRpcPayload(params),
    );
}

export async function spendTreasuryWithBudget(
    admin: SupabaseClient,
    params: SpendTreasuryWithBudgetParams,
): Promise<TreasurySpendRpcResult> {
    return callSoulLedgerRpc<TreasurySpendRpcResult>(
        admin,
        SOUL_LEDGER_RPC.TREASURY_SPEND,
        buildSpendTreasuryWithBudgetRpcPayload(params),
    );
}

export async function appendSoulLedgerInternal(
    admin: SupabaseClient,
    params: AppendSoulLedgerInternalParams,
): Promise<InternalLedgerAppendRpcResult> {
    return callSoulLedgerRpc<InternalLedgerAppendRpcResult>(
        admin,
        SOUL_LEDGER_RPC.APPEND_INTERNAL,
        buildAppendSoulLedgerInternalRpcPayload(params),
    );
}
