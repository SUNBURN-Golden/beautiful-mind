'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: '이메일과 비밀번호를 입력해주세요.' }
    }

    const supabase = await createClient()

    console.log('[DEBUG] Login Action Triggered')
    console.log('[DEBUG] URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[DEBUG] KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Present (length ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'UNDEFINED')

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        console.error('Login error:', error.message)
        return { error: error.message }
    }

    // 성공 시 대시보드(또는 온보딩)로 리다이렉트
    revalidatePath('/', 'layout')
    redirect('/onboarding')
}

export async function signup(prevState: any, formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
        return { error: '이메일과 비밀번호를 입력해주세요.' }
    }

    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        console.error('Signup error:', error.message)
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
