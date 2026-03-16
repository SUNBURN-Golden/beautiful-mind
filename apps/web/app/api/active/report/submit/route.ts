import { getServiceRoleClient, getSessionUser } from '@/lib/server/trust';
import { submitActiveIncidentReport } from '@/lib/server/active-trust';
import { handleActiveReportSubmit } from '@/lib/server/active-report-handler';

export async function POST(req: Request) {
    return handleActiveReportSubmit(req, {
        getSessionUser,
        getServiceRoleClient,
        submitActiveIncidentReport,
    });
}
