import type {
    AdmissionDocumentRow,
    AdminClient,
    ExecuteAdmissionDecisionParams,
} from './types';

export type ExecutionBranchContext = {
    admin: AdminClient;
    params: ExecuteAdmissionDecisionParams;
    docs: AdmissionDocumentRow[];
    nowIso: string;
    purgedCount: number;
    policyVersion: string;
};

export function resolveAuditSampleRate(params: ExecuteAdmissionDecisionParams): number {
    return typeof params.auditSampleRate === 'number' ? params.auditSampleRate : 0;
}
