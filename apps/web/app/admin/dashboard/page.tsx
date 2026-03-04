import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

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
        <div className="min-h-screen bg-neutral-950 text-neutral-200 p-8 font-mono text-sm">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-indigo-500 mb-8 border-b border-neutral-800 pb-4">
                AGI Observer: Phase 2.5 Hybrid Engine
            </h1>

            {/* Model Registry Panel */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mb-8 hover:border-indigo-500/50 transition-colors">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="text-indigo-400">●</span> Self-Improving Engine Status
                </h2>
                {activeModel ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                            <span className="text-neutral-500 block mb-1">Active Version</span>
                            <span className="text-teal-400 font-bold">{activeModel.version}</span>
                        </div>
                        <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                            <span className="text-neutral-500 block mb-1">Eval Samples</span>
                            <span className="text-white">{activeModel.eval_samples}</span>
                        </div>
                        <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                            <span className="text-neutral-500 block mb-1">Pearson (Corr)</span>
                            <span className="text-indigo-400 font-bold">{activeModel.metric_corr?.toFixed(4)}</span>
                        </div>
                        <div className="bg-neutral-950 p-4 rounded-lg border border-neutral-800">
                            <span className="text-neutral-500 block mb-1">Top-K Hit Rate</span>
                            <span className="text-purple-400 font-bold">{(activeModel.metric_topk_hit * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ) : (
                    <div className="text-neutral-500 italic">No ACTIVE model found. Falling back to hybrid-v1.</div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Bias Correction Matrix (Stats) */}
                <div className="lg:col-span-1 bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-[600px] overflow-y-auto custom-scrollbar">
                    <h2 className="text-xl font-semibold text-white mb-4">Bias Stats (Given vs Recv)</h2>
                    <div className="space-y-4">
                        {stats?.map((s) => (
                            <div key={s.user_id} className="p-3 bg-neutral-950 rounded border border-neutral-800/50 flex justify-between items-center text-xs">
                                <div>
                                    <div className="text-neutral-400 font-bold">User {s.user_id.substring(0, 6)}...</div>
                                    <div className="text-neutral-500 mt-1">Given: <span className={s.avg_given_score > s.mu ? 'text-teal-400' : 'text-rose-400'}>{parseFloat(s.avg_given_score).toFixed(2)}</span> (N={s.given_count})</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-neutral-500">Tier: <span className="text-white font-bold">{parseFloat(s.avg_received_score).toFixed(2)}</span> (N={s.received_count})</div>
                                </div>
                            </div>
                        ))}
                        {(!stats || stats.length === 0) && (
                            <div className="text-neutral-500 py-4 text-center">No review data yet. Run feedback simulator.</div>
                        )}
                    </div>
                </div>

                {/* Match Proposals */}
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6 h-[600px] overflow-y-auto custom-scrollbar">
                    <h2 className="text-xl font-semibold text-white mb-4">Top Match Proposals</h2>
                    <div className="space-y-6">
                        {matches?.map((m) => (
                            <div key={m.id} className={`p-5 rounded-lg border ${m.match_meta?.exploration ? 'border-purple-500/50 bg-purple-900/10' : 'border-neutral-700 bg-neutral-950'}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="px-3 py-1 bg-neutral-800 rounded text-xs font-bold shrink-0">
                                            {m.user1_id.substring(0, 4)} ↔ {m.user2_id.substring(0, 4)}
                                        </div>
                                        {m.match_meta?.exploration && (
                                            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-[10px] rounded uppercase tracking-wider font-bold">Exploration</span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-teal-400">{Number(m.match_score).toFixed(2)}</div>
                                        <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Chem Score</div>
                                    </div>
                                </div>

                                {/* Math Breakdown */}
                                {m.match_meta && (
                                    <div className="grid grid-cols-2 gap-4 mb-4 text-xs font-mono bg-black/50 p-3 rounded border border-neutral-800">
                                        <div>
                                            <div className="text-neutral-500 mb-1">A → B</div>
                                            <div>Pred: <span className="text-white">{m.match_meta.pred?.a_to_b?.toFixed(2)}</span></div>
                                            <div>Bias Δ: <span className="text-indigo-400">{(m.match_meta.delta?.a_to_b > 0 ? '+' : '')}{m.match_meta.delta?.a_to_b?.toFixed(2)}</span></div>
                                        </div>
                                        <div>
                                            <div className="text-neutral-500 mb-1">B → A</div>
                                            <div>Pred: <span className="text-white">{m.match_meta.pred?.b_to_a?.toFixed(2)}</span></div>
                                            <div>Bias Δ: <span className="text-indigo-400">{(m.match_meta.delta?.b_to_a > 0 ? '+' : '')}{m.match_meta.delta?.b_to_a?.toFixed(2)}</span></div>
                                        </div>
                                    </div>
                                )}

                                {/* Evidence Template */}
                                {m.match_meta?.reason_template && (
                                    <div className="text-sm text-neutral-300 bg-neutral-800/50 p-3 rounded-md border-l-2 border-teal-500">
                                        "{m.match_meta.reason_template}"
                                    </div>
                                )}

                                {/* Raw Evidence Tags */}
                                {m.match_meta?.evidence && m.match_meta.evidence.length > 0 && (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {m.match_meta.evidence.map((ev: any, idx: number) => (
                                            <span key={idx} className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-[10px] text-neutral-400">
                                                {ev.why_tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {(!matches || matches.length === 0) && (
                            <div className="text-neutral-500 py-10 text-center">No match proposals generated yet. Run the hybrid match engine.</div>
                        )}
                    </div>
                </div>
            </div>
        </div >
    );
}
