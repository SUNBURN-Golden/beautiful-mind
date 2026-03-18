'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { z } from 'zod'

const authSchema = z.object({
    email: z.string().email('유효한 이메일 주소를 입력해주세요.'),
    password: z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다.'),
})

export type AuthState = { error?: string; success?: boolean };
const AUTH_UNAVAILABLE_MESSAGE = 'Authentication is temporarily unavailable. Please try again shortly.'
const SIGNUP_UNAVAILABLE_MESSAGE = 'Account creation is temporarily unavailable. Please try again shortly.'

async function tryCreateAuthClient(): Promise<Awaited<ReturnType<typeof createClient>> | null> {
    try {
        return await createClient()
    } catch (error) {
        console.error('Supabase auth client init failed:', error)
        return null
    }
}

export async function login(_prevState: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = authSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
    })

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { email, password } = parsed.data
    const supabase = await tryCreateAuthClient()
    if (!supabase) {
        return { error: AUTH_UNAVAILABLE_MESSAGE }
    }

    try {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            console.error('Login error:', error.message)
            return { error: error.message }
        }
    } catch (error) {
        console.error('Unexpected login failure:', error)
        return { error: AUTH_UNAVAILABLE_MESSAGE }
    }

    return { success: true }
}

export async function signup(_prevState: AuthState, formData: FormData): Promise<AuthState> {
    const parsed = authSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
    })

    if (!parsed.success) {
        return { error: parsed.error.issues[0].message }
    }

    const { email, password } = parsed.data
    const supabase = await tryCreateAuthClient()
    if (!supabase) {
        return { error: AUTH_UNAVAILABLE_MESSAGE }
    }

    try {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            console.error('Signup error:', error.message)
            return { error: error.message }
        }
    } catch (error) {
        console.error('Unexpected signup failure:', error)
        return { error: SIGNUP_UNAVAILABLE_MESSAGE }
    }

    return { success: true }
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}
