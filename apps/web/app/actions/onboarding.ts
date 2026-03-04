'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function saveProfile() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: '로그인이 필요합니다.' }
    }

    // UPSERT: profiles 테이블에 데이터 저장
    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            email: user.email,
            reputation_score: 100,
            verified: true
        })

    if (error) {
        console.error('Save Profile Error:', error)
        return { error: error.message }
    }

    redirect('/contract')
}

export async function saveContract(signatureBase64: string) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: '로그인이 필요합니다.' }
    }

    // 1. Storage 에 업로드 (contracts 버킷)
    // base64 를 buffer 로 변환
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    const fileName = `${user.id}_${Date.now()}.png`

    const { data: uploadData, error: uploadError } = await supabase
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

    redirect('/consent')
}

export async function saveConsents(consents: { osint: boolean; location: boolean; device: boolean }) {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { error: '로그인이 필요합니다.' }
    }

    const consentRecords = [
        { user_id: user.id, module: 'OSINT', is_granted: consents.osint, granted_at: consents.osint ? new Date().toISOString() : null },
        { user_id: user.id, module: 'LOCATION', is_granted: consents.location, granted_at: consents.location ? new Date().toISOString() : null },
        { user_id: user.id, module: 'DEVICE', is_granted: consents.device, granted_at: consents.device ? new Date().toISOString() : null }
    ]

    const { error } = await supabase
        .from('consents')
        .upsert(consentRecords, { onConflict: 'user_id,module' })

    if (error) {
        console.error('Consents DB Error:', error)
        return { error: error.message }
    }

    redirect('/osint')
}
