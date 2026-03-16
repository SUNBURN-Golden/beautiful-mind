import {
    ADMISSION_POLICY_VERSION,
} from '../admission-core.ts';
import {
    fetchAdmissionDocuments,
    listMissingRequiredDocumentTypes,
} from './execution-inputs';
import { resolveDecisionExecutor } from './execution-dispatch';
import { assertRequiredDocsSatisfied } from './execution-preflight';
import { purgeArtifacts } from './execution-purge';
import type {
    AdminClient,
    ExecuteAdmissionDecisionParams,
    ExecuteAdmissionDecisionResult,
} from './types';

export async function executeAdmissionDecision(
    admin: AdminClient,
    params: ExecuteAdmissionDecisionParams,
): Promise<ExecuteAdmissionDecisionResult> {
    const policyVersion = params.policyVersion || ADMISSION_POLICY_VERSION;
    const docs = await fetchAdmissionDocuments(admin, {
        applicationId: params.applicationId,
        userId: params.userId,
    });

    const missingRequiredDocs = listMissingRequiredDocumentTypes(docs);
    assertRequiredDocsSatisfied(params.decision, missingRequiredDocs);

    const nowIso = new Date().toISOString();
    const purgedCount = await purgeArtifacts(admin, docs, {
        userId: params.userId,
        applicationId: params.applicationId,
    });

    const executionContext = {
        admin,
        params,
        docs,
        nowIso,
        purgedCount,
        policyVersion,
    };
    const executeDecision = resolveDecisionExecutor(params.decision);
    return executeDecision(executionContext);
}
