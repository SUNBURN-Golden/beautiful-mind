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
        [key: string]: any;
    };
}
