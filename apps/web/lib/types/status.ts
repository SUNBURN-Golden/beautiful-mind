import { Stage } from '../stageRoutes';

export interface StatusContract {
    step: Stage;
    completed: boolean;
    next: string | null;
    blockers: string[];
    error_code?: string;
    meta?: {
        doc_version?: string;
        contract_hash?: string;
        receipt_id?: string;
        required_verifications?: Array<{ type: string; status: string }>;
        required_consents?: Array<{ module: string; is_granted: boolean }>;
        trust_level?: string | null;
        sbt_status?: string | null;
        sbt_claim_type?: string | null;
        sbt_issuer?: string | null;
        sbt_issued_at?: string | null;
        is_frozen?: boolean;
        freeze_reason?: string | null;
        audit_in_progress?: boolean;
        open_audit_count?: number;
        self_dev_confidence?: number | null;
        self_dev_focus_topics?: string[];
        self_dev_action_plan?: Array<{
            title: string;
            priority: string;
            metric: string;
            target: string;
        }>;
        [key: string]: unknown;
    };
}
