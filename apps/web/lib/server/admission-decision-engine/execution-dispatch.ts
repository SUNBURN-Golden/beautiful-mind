import {
    executeApproveDecision,
} from './execution-approve';
import {
    executeExceptionDecision,
} from './execution-exception';
import {
    executeRejectDecision,
} from './execution-reject';
import {
    executeResubmitDecision,
} from './execution-resubmit';
import type { ExecutionBranchContext } from './execution-context';
import type {
    ExecuteAdmissionDecisionParams,
    ExecuteAdmissionDecisionResult,
} from './types.ts';

type DecisionExecutor = (
    context: ExecutionBranchContext,
) => Promise<ExecuteAdmissionDecisionResult>;

const DECISION_EXECUTORS: Partial<Record<ExecuteAdmissionDecisionParams['decision'], DecisionExecutor>> = {
    APPROVE: executeApproveDecision,
    EXCEPTION_REQUIRED: executeExceptionDecision,
    REJECT: executeRejectDecision,
    RESUBMIT_REQUIRED: executeResubmitDecision,
};

export function resolveDecisionExecutor(
    decision: ExecuteAdmissionDecisionParams['decision'],
): DecisionExecutor {
    return DECISION_EXECUTORS[decision] || executeResubmitDecision;
}
