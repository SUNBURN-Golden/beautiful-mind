import type { ExecuteAdmissionDecisionParams } from './types.ts';

export function assertRequiredDocsSatisfied(
    decision: ExecuteAdmissionDecisionParams['decision'],
    missingRequiredDocs: string[],
): void {
    if (missingRequiredDocs.length > 0 && decision !== 'RESUBMIT_REQUIRED') {
        throw new Error(`Missing required docs: ${missingRequiredDocs.join(', ')}`);
    }
}
