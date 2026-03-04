'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

type SaveProfileInput = {
    displayName?: string;
    bio?: string;
};

const textSchema = (max: number, msg: string) =>
    z.string().trim().min(1, msg).max(max, msg)

const profileSchema = z.object({
    displayName: textSchema(40, '이름은 1~40자 내로 입력해주세요.').optional(),
    bio: textSchema(200, '소개 문구는 1~200자 내로 입력해주세요.').optional(),
}).optional()

export async function saveProfile(input?: SaveProfileInput) {
    const parsed = profileSchema.safeParse(input)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { displayName, bio } = parsed.data || {}

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: '로그인이 필요합니다.' }
    }

    const profilePayload: {
        id: string;
        email?: string;
        reputation_score: number;
        verified: boolean;
        display_name?: string;
        bio?: string;
    } = {
        id: user.id,
        email: user.email,
        reputation_score: 100,
        verified: true,
    }

    if (displayName) {
        profilePayload.display_name = displayName
    }
    if (bio) {
        profilePayload.bio = bio
    }

    // UPSERT: profiles 테이블에 데이터 저장
    const { error } = await supabase
        .from('profiles')
        .upsert(profilePayload)

    if (error) {
        console.error('Save Profile Error:', error)
        return { error: error.message }
    }

    redirect('/onboarding/verify')
}

const contractSchema = z.string().min(1, '서명 데이터가 필요합니다.')

export async function saveContract(signatureBase64: string) {
    const parsed = contractSchema.safeParse(signatureBase64)
    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: '로그인이 필요합니다.' }
    }

    // 1. Storage 에 업로드 (contracts 버킷)
    // base64 를 buffer 로 변환
    const base64Data = parsed.data.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const fileName = `${user.id}_${Date.now()}.png`

    const { error: uploadError } = await supabase
        .storage
        .from('contracts')
        .upload(fileName, buffer, {
            contentType: 'image/png',
            upsert: true
        })

    if (uploadError) {
        console.error('Storage Upload Error:', uploadError)
        // 버킷이 없다면 실패할 수 있음 (에러 반환)
        return { error: '서명 업로드 실패: ' + uploadError.message }
    }

    // 2. Public URL 가져오기
    const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName)

    // 3. contracts 테이블에 저장
    const { error: dbError } = await supabase
        .from('contracts')
        .insert({
            user_id: user.id,
            signature_base64: publicUrl, // 명세에 따라 URL을 이 필드에 저장
            agreed_to_terms: true
        })

    if (dbError) {
        console.error('Contract DB Error:', dbError)
        return { error: dbError.message }
    }

    redirect('/onboarding/consent')
}

const consentsSchema = z.object({
    osint: z.boolean(),
    location: z.boolean(),
    device: z.boolean()
})

export async function saveConsents(consents: { osint: boolean; location: boolean; device: boolean }) {
    const parsed = consentsSchema.safeParse(consents)
    if (!parsed.success) {
        return { error: '형식이 올바르지 않습니다.' }
    }

    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: '로그인이 필요합니다.' }
    }

    const { osint, location, device } = parsed.data
    const consentRecords = [
        { user_id: user.id, module: 'OSINT', is_granted: osint, granted_at: osint ? new Date().toISOString() : null },
        { user_id: user.id, module: 'LOCATION', is_granted: location, granted_at: location ? new Date().toISOString() : null },
        { user_id: user.id, module: 'DEVICE', is_granted: device, granted_at: device ? new Date().toISOString() : null }
    ]

    const { error } = await supabase
        .from('consents')
        .upsert(consentRecords, { onConflict: 'user_id,module' })

    if (error) {
        console.error('Consents DB Error:', error)
        return { error: error.message }
    }

    redirect('/onboarding/sign')
}
