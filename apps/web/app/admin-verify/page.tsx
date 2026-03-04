import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminVerifyPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    const { data: consents } = await supabase.from('consents').select('*').eq('user_id', user.id)
    const { data: contracts } = await supabase.from('contracts').select('*').eq('user_id', user.id)
    const { data: interviews } = await supabase.from('interviews').select('*').eq('user_id', user.id)

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold">인증 사용자 DB 무결성 검증 (Agent B)</h1>

            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-2">1. Auth User (auth.users)</h2>
                <pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(user, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-2">2. Profile (public.profiles)</h2>
                <pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(profile, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-2">3. Consents (public.consents)</h2>
                <pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(consents, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-2">4. Contracts & Storage (public.contracts)</h2>
                <pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(contracts, null, 2)}</pre>
            </div>

            <div className="bg-white p-4 rounded shadow">
                <h2 className="text-xl font-bold mb-2">5. AI Interviews (public.interviews)</h2>
                <pre className="text-sm bg-gray-100 p-2 rounded">{JSON.stringify(interviews, null, 2)}</pre>
            </div>
        </div>
    )
}
