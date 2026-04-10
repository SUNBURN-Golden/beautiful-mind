'use server';

import { redirect } from 'next/navigation';
import { signContract } from '@/lib/server/contracts';
import { getUser } from '@/utils/supabase/server';

export async function submitContractSignature(formData: FormData) {
    const user = await getUser();
    if (!user) {
        throw new Error('Unauthorized');
    }

    const documentSlug = formData.get('documentSlug') as string;
    const versionId = formData.get('versionId') as string;
    const typedPhrase = formData.get('typedPhrase') as string | undefined;
    const secondaryConfirm = formData.get('secondaryConfirm') === 'on';

    await signContract({
        userId: user.id,
        documentSlug,
        versionId,
        typedPhrase: typedPhrase || undefined,
        secondaryConfirmed: secondaryConfirm,
    });

    // After signing, redirect back to the controller to find the next missing step
    redirect('/apply/contracts');
}
