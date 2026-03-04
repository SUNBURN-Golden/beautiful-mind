'use server'

import { createClient } from '@/utils/supabase/server'

export async function verifyIdentity(identityVerificationId: string) {
    try {
        const portoneApiSecret = process.env.PORTONE_API_SECRET

        // 1. PortOne API 를 호출하여 인증 내역 단건 조회
        const response = await fetch(`https://api.portone.io/identity-verifications/${encodeURIComponent(identityVerificationId)}`, {
            method: 'GET',
            headers: {
                'Authorization': `PortOne ${portoneApiSecret}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json()
            console.error('PortOne API Error:', errorData)
            return { success: false, error: '포트원 조회 실패' }
        }

        const verification = await response.json()

        if (verification.status !== 'VERIFIED') {
            return { success: false, error: '인증이 완료되지 않았습니다.' }
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ verified: true })
                .eq('id', user.id)

            if (updateError) {
                console.error('Profile update error:', updateError)
                return { success: false, error: '프로필 업데이트 실패' }
            }
        }

        return { success: true, verification }
    } catch (error: any) {
        console.error('Verification Exception:', error)
        return { success: false, error: error.message }
    }
}
