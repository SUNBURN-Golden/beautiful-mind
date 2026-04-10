import { redirect } from 'next/navigation';
import { ADMISSION_STAGES } from '@/lib/contracts/status-stages';
import { getMissingContracts } from '@/lib/server/contracts';
import { getSessionUser } from '@/lib/server/trust';
import { createClient } from '@/utils/supabase/server';
import { findLatestApplicationId } from '@/lib/server/active-features/shared';

export default async function ContractsControllerPage() {
    const user = await getSessionUser();
    if (!user) {
        redirect('/login');
    }

    const missingSlugs = await getMissingContracts(user.id);

    if (missingSlugs.length === 0) {
        // All contracts signed. Advance to documents stage.
        const supabase = await createClient();
        const applicationId = await findLatestApplicationId(supabase, user.id);
        if (applicationId) {
            await supabase
                .from('admission_applications')
                .update({
                    status: 'IN_PROGRESS',
                    current_step: ADMISSION_STAGES.DOCUMENTS,
                })
                .eq('id', applicationId);
        }
        redirect('/apply/status');
    }

    const nextSlug = missingSlugs[0];
    
    // Explicit route for the high-friction fraud penalty covenant
    if (nextSlug === 'fraud-penalty') {
        redirect('/apply/contracts/fraud-penalty');
    }

    redirect(`/apply/contracts/${nextSlug}`);
}
