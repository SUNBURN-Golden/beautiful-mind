import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inject() {
    const { data: matches } = await s.from('matches').select('*').limit(3);
    if (!matches || matches.length === 0) return;

    const meta1 = {
        pred: { a_to_b: 4.8, b_to_a: 4.5 },
        delta: { a_to_b: 1.2, b_to_a: 0.9, chem: 2.1 },
        given_shrunk: { a: 3.6, b: 3.6 },
        recv_shrunk: { a: 3.6, b: 3.6 },
        evidence: [{ why_tag: '지적 호기심 수준 일치' }, { why_tag: '상호 보완적 에너지성' }],
        reason_template: '두 유저는 [지적 호기심 수준 일치] 등의 기반으로 높은 화학적 결합이 예측됩니다 (Δ=+2.10).',
        version: 'hybrid-v1',
        exploration: false,
        model: 'gemini-2.5-flash'
    };

    const meta2 = {
        pred: { a_to_b: 2.1, b_to_a: 1.5 },
        delta: { a_to_b: -0.8, b_to_a: -1.2, chem: -2.0 },
        given_shrunk: { a: 2.9, b: 2.7 },
        recv_shrunk: { a: 2.9, b: 2.7 },
        evidence: [{ why_tag: '극단적 라이프스타일 불일치' }, { why_tag: '소통 방식(직설/우회) 충돌' }],
        reason_template: '두 유저는 [극단적 라이프스타일 불일치] 등의 사유로 심각한 마찰 위험이 식별되었습니다 (Δ=-2.00).',
        version: 'hybrid-v1',
        exploration: true,
        model: 'gemini-2.5-flash'
    };

    if (matches[0]) await s.from('matches').update({ match_score: 2.1, match_meta: meta1 }).eq('id', matches[0].id);
    if (matches[1]) await s.from('matches').update({ match_score: -2.0, match_meta: meta2 }).eq('id', matches[1].id);

    console.log('Successfully injected mock meta for visualization');
}
inject();
