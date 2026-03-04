import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

type MatchEvidence = {
    why_tag?: string;
};

export default async function AdminDashboardPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/');
    }

    // Verify Admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin) {
        redirect('/');
    }

    // 1. Fetch Scoring Stats (Bias Correction Matrix)
    const { data: stats } = await supabase
        .from('user_scoring_stats')
        .select('*');

    // 2. Fetch Latest Pending Matches (Proposals)
    const { data: matches } = await supabase
        .from('matches')
        .select(`
            id, user1_id, user2_id, match_score, match_meta, algorithm_version, created_at, status
        `)
        .order('match_score', { ascending: false })
        .limit(20);

    // 3. Fetch Active Model
    const { data: activeModels } = await supabase
        .from('match_model_registry')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('trained_at', { ascending: false })
        .limit(1);

    const activeModel = activeModels && activeModels.length > 0 ? activeModels[0] : null;

    return (
        <div className="space-y-8 text-[#1d1d1f]">
            <header className="space-y-3 border-b border-[#d2d2d7] pb-5">
                <h1 className="liquid-title text-[32px] font-semibold tracking-tight md:text-[36px]">
                    AGI Observer: Hybrid Engine
                </h1>
                <p className="liquid-copy text-sm">모델 상태, 편향 보정 지표, 매칭 후보를 운영 시점 기준으로 점검합니다.</p>
            </header>

            <section className="liquid-pane rounded-2xl border-[#e5e5e7] p-5 md:p-6">
                <h2 className="mb-4 text-xl font-semibold text-[#1d1d1f]">Self-Improving Engine Status</h2>
                {activeModel ? (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        <div className="liquid-pane-muted rounded-xl p-4">
                            <span className="mb-1 block text-xs text-[#6e6e73]">Active Version</span>
                            <span className="text-sm font-semibold text-[#1d1d1f]">{activeModel.version}</span>
                        </div>
                        <div className="liquid-pane-muted rounded-xl p-4">
                            <span className="mb-1 block text-xs text-[#6e6e73]">Eval Samples</span>
                            <span className="text-sm font-semibold text-[#1d1d1f]">{activeModel.eval_samples}</span>
                        </div>
                        <div className="liquid-pane-muted rounded-xl p-4">
                            <span className="mb-1 block text-xs text-[#6e6e73]">Pearson</span>
                            <span className="text-sm font-semibold text-[#06c]">{activeModel.metric_corr?.toFixed(4)}</span>
                        </div>
                        <div className="liquid-pane-muted rounded-xl p-4">
                            <span className="mb-1 block text-xs text-[#6e6e73]">Top-K Hit Rate</span>
                            <span className="text-sm font-semibold text-[#1d1d1f]">{(activeModel.metric_topk_hit * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm italic text-[#6e6e73]">No ACTIVE model found. Fallback: hybrid-v1.</p>
                )}
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <section className="liquid-pane custom-scrollbar max-h-[72dvh] overflow-y-auto rounded-2xl border-[#e5e5e7] p-4 md:max-h-[620px] md:p-6 lg:col-span-1">
                    <h2 className="mb-4 text-lg font-semibold text-[#1d1d1f]">Bias Stats (Given vs Recv)</h2>
                    <div className="space-y-3">
                        {stats?.map((s) => (
                            <div key={s.user_id} className="liquid-pane-muted flex items-center justify-between rounded-xl p-3 text-xs">
                                <div>
                                    <div className="font-semibold text-[#1d1d1f]">User {s.user_id.substring(0, 6)}...</div>
                                    <div className="mt-1 text-[#6e6e73]">
                                        Given:
                                        <span className={s.avg_given_score > s.mu ? 'text-[#06c]' : 'text-rose-600'}>
                                            {' '} {parseFloat(s.avg_given_score).toFixed(2)}
                                        </span>
                                        {' '}(N={s.given_count})
                                    </div>
                                </div>
                                <div className="text-right text-[#6e6e73]">
                                    Tier:
                                    <span className="font-semibold text-[#1d1d1f]">
                                        {' '} {parseFloat(s.avg_received_score).toFixed(2)}
                                    </span>
                                    {' '}(N={s.received_count})
                                </div>
                            </div>
                        ))}
                        {(!stats || stats.length === 0) && (
                            <div className="py-5 text-center text-sm text-[#6e6e73]">No review data yet.</div>
                        )}
                    </div>
                </section>

                <section className="liquid-pane custom-scrollbar max-h-[72dvh] overflow-y-auto rounded-2xl border-[#e5e5e7] p-4 md:max-h-[620px] md:p-6 lg:col-span-2">
                    <h2 className="mb-4 text-lg font-semibold text-[#1d1d1f]">Top Match Proposals</h2>
                    <div className="space-y-4">
                        {matches?.map((m) => (
                            <article
                                key={m.id}
                                className={`rounded-xl border p-4 md:p-5 ${m.match_meta?.exploration ? 'border-[#bcd8ff] bg-[#f2f7ff]' : 'border-[#e5e5e7] bg-[#fbfbfd]'}`}
                            >
                                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="rounded bg-[#f5f5f7] px-3 py-1 text-xs font-semibold text-[#1d1d1f]">
                                            {m.user1_id.substring(0, 4)} ↔ {m.user2_id.substring(0, 4)}
                                        </div>
                                        {m.match_meta?.exploration && (
                                            <span className="rounded bg-[#eaf3ff] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#06c]">
                                                Exploration
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-left sm:text-right">
                                        <div className="text-2xl font-semibold text-[#1d1d1f]">{Number(m.match_score).toFixed(2)}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-[#6e6e73]">Chem Score</div>
                                    </div>
                                </div>

                                {m.match_meta && (
                                    <div className="mb-3 grid grid-cols-1 gap-3 rounded-lg border border-[#e5e5e7] bg-white p-3 text-xs sm:grid-cols-2">
                                        <div>
                                            <div className="mb-1 text-[#6e6e73]">A → B</div>
                                            <div>
                                                Pred:
                                                <span className="text-[#1d1d1f]"> {m.match_meta.pred?.a_to_b?.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                Bias Δ:
                                                <span className="text-[#06c]">
                                                    {' '}{(m.match_meta.delta?.a_to_b > 0 ? '+' : '')}{m.match_meta.delta?.a_to_b?.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="mb-1 text-[#6e6e73]">B → A</div>
                                            <div>
                                                Pred:
                                                <span className="text-[#1d1d1f]"> {m.match_meta.pred?.b_to_a?.toFixed(2)}</span>
                                            </div>
                                            <div>
                                                Bias Δ:
                                                <span className="text-[#06c]">
                                                    {' '}{(m.match_meta.delta?.b_to_a > 0 ? '+' : '')}{m.match_meta.delta?.b_to_a?.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {m.match_meta?.reason_template && (
                                    <div className="rounded-md border-l-2 border-[#06c] bg-white p-3 text-sm text-[#3a3a3c]">
                                        &quot;{m.match_meta.reason_template}&quot;
                                    </div>
                                )}

                                {m.match_meta?.evidence && m.match_meta.evidence.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {m.match_meta.evidence.map((ev: MatchEvidence, idx: number) => (
                                            <span key={idx} className="liquid-chip rounded-full px-2 py-1 text-[10px] text-[#6e6e73]">
                                                {ev.why_tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </article>
                        ))}
                        {(!matches || matches.length === 0) && (
                            <div className="py-8 text-center text-sm text-[#6e6e73]">No match proposals generated yet.</div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
