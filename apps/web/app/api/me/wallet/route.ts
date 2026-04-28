import { resolveStatusRequestContext } from '@/lib/server/status-ssot/context';
import { handleWalletRequest } from '@/lib/server/wallet-handler';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    return handleWalletRequest(req, {
        resolveContext: resolveStatusRequestContext,
    });
}