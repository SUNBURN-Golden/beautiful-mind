import { redirect } from 'next/navigation';
import { getMissingContracts } from '@/lib/server/contracts';
import { getUser } from '@/utils/supabase/server';

export default async function ContractsControllerPage() {
    const user = await getUser();
    if (!user) {
        redirect('/login');
    }

    const missingSlugs = await getMissingContracts(user.id);

    if (missingSlugs.length === 0) {
        // All contracts signed. Return to the main status gateway to proceed
        // to documents or AI decision.
        redirect('/apply/status');
    }

    const nextSlug = missingSlugs[0];
    
    // Explicit route for the high-friction fraud penalty covenant
    if (nextSlug === 'fraud-penalty') {
        redirect('/apply/contracts/fraud-penalty');
    }

    redirect(`/apply/contracts/${nextSlug}`);
}
