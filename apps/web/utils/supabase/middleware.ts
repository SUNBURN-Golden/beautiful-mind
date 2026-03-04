import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPublicSupabaseEnv } from './env'

export async function updateSession(request: NextRequest) {
    const protectedRoutes = ['/dashboard', '/onboarding', '/contract', '/consent', '/osint', '/interview', '/match', '/chat', '/review', '/banned']
    const isProtectedRoute = protectedRoutes.some((route) => request.nextUrl.pathname.startsWith(route))
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')

    const publicEnv = getPublicSupabaseEnv()
    if (!publicEnv) {
        // Fail closed for protected/admin paths when auth backend is misconfigured.
        if (isProtectedRoute || isAdminRoute) {
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'SERVER_MISCONFIG')
            return NextResponse.redirect(url)
        }
        return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        publicEnv.url,
        publicEnv.anonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user && (isProtectedRoute || isAdminRoute)) {
        // no user, potentially respond by redirecting the user to the login page
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    if (user && (isProtectedRoute || isAdminRoute)) {
        // check profile metadata (admin & ban status)
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, banned, is_frozen')
            .eq('id', user.id)
            .single()

        if (profile?.banned) {
            // User is banned, redirect to an error or logout
            await supabase.auth.signOut();
            const url = request.nextUrl.clone()
            url.pathname = '/login'
            url.searchParams.set('error', 'Account has been banned.')
            return NextResponse.redirect(url)
        }

        if (profile?.is_frozen && request.nextUrl.pathname !== '/banned') {
            const url = request.nextUrl.clone()
            url.pathname = '/banned'
            return NextResponse.redirect(url)
        }

        if (!profile?.is_frozen && request.nextUrl.pathname === '/banned') {
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard'
            return NextResponse.redirect(url)
        }

        if (isAdminRoute && !profile?.is_admin) {
            // Not an admin, redirect to dashboard or home
            const url = request.nextUrl.clone()
            url.pathname = '/'
            return NextResponse.redirect(url)
        }
    }

    // 로그인 된 유저가 /login 또는 /signup 접근 시 대시보드로 리다이렉트
    if (user && (request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/signup'))) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard' // 현재는 라우팅 설계 상 onboarding 이나 메인 등으로 갈 수 있음
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
