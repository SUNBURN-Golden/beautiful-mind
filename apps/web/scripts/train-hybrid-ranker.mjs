import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

function asNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function calculateCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return 0;
    const n = x.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;
    let sumY2 = 0;
    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];
    }
    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    if (denominator === 0) return 0;
    return numerator / denominator;
}

function calculateTopKHit(predicted, actual, k = 10) {
    if (predicted.length === 0) return 0;
    const safeK = Math.min(k, predicted.length);
    const sortedPred = predicted
        .map((val, idx) => ({ val, idx }))
        .sort((a, b) => b.val - a.val)
        .map((o) => o.idx);
    const sortedAct = actual
        .map((val, idx) => ({ val, idx }))
        .sort((a, b) => b.val - a.val)
        .map((o) => o.idx);

    const topKPred = new Set(sortedPred.slice(0, safeK));
    const topKAct = sortedAct.slice(0, safeK);
    let hits = 0;
    for (const idx of topKAct) {
        if (topKPred.has(idx)) hits++;
    }
    return hits / safeK;
}

function calculateMAE(predicted, actual) {
    if (predicted.length !== actual.length || predicted.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < predicted.length; i++) {
        sum += Math.abs(predicted[i] - actual[i]);
    }
    return sum / predicted.length;
}

function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

async function runAutoTrain() {
    console.log('--- STARTING AUTO-TRAIN AND EVALUATION (v2) ---');

    const { data: activeModels } = await supabaseAdmin
        .from('match_model_registry')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('trained_at', { ascending: false })
        .limit(1);

    const activeModel = activeModels && activeModels.length > 0 ? activeModels[0] : null;
    const windowStart = activeModel ? activeModel.train_window_end : new Date('2000-01-01').toISOString();

    const [{ data: reviews, error: reviewErr }, { data: stats }, { data: matches, error: matchErr }] = await Promise.all([
        supabaseAdmin.from('match_reviews').select('*'),
        supabaseAdmin.from('user_scoring_stats').select('*'),
        supabaseAdmin.from('matches').select('user1_id,user2_id,match_score,algorithm_version,status,updated_at'),
    ]);

    if (reviewErr || !reviews || reviews.length < 50) {
        console.log(`Not enough total reviews to train (Count: ${reviews ? reviews.length : 0}). Aborting.`);
        return;
    }
    if (matchErr || !matches) {
        console.log('Failed to load matches for evaluation. Aborting.', matchErr);
        return;
    }

    const globalMu = stats && stats.length > 0 ? asNumber(stats[0].mu, 3.0) : 3.0;
    const statsMap = {};
    if (stats) {
        for (const s of stats) {
            const givenCount = asNumber(s.given_count, 0);
            const recvCount = asNumber(s.received_count, 0);
            const mu = asNumber(s.mu, globalMu);
            const avgGiven = asNumber(s.avg_given_score, mu);
            const avgRecv = asNumber(s.avg_received_score, mu);
            statsMap[s.user_id] = {
                given_shrunk: ((givenCount / (givenCount + 10)) * avgGiven) + ((10 / (givenCount + 10)) * mu),
                recv_shrunk: ((recvCount / (recvCount + 10)) * avgRecv) + ((10 / (recvCount + 10)) * mu)
            };
        }
    }

    const pairedReviews = {};
    for (const r of reviews) {
        const key = pairKey(r.reviewer_id, r.target_id);
        if (!pairedReviews[key]) {
            pairedReviews[key] = {
                userA: key.split('|')[0],
                userB: key.split('|')[1],
                scores: {}
            };
        }
        pairedReviews[key].scores[`${r.reviewer_id}->${r.target_id}`] = asNumber(r.score, 3);
    }

    const predictedByPair = {};
    for (const m of matches) {
        const key = pairKey(m.user1_id, m.user2_id);
        if (predictedByPair[key] === undefined || asNumber(m.match_score, -999) > asNumber(predictedByPair[key], -999)) {
            predictedByPair[key] = asNumber(m.match_score, 0);
        }
    }

    const dataset = [];
    for (const key of Object.keys(pairedReviews)) {
        const pair = pairedReviews[key];
        const scoreA2B = pair.scores[`${pair.userA}->${pair.userB}`];
        const scoreB2A = pair.scores[`${pair.userB}->${pair.userA}`];
        if (scoreA2B === undefined || scoreB2A === undefined) continue;

        const statA = statsMap[pair.userA] || { given_shrunk: globalMu, recv_shrunk: globalMu };
        const statB = statsMap[pair.userB] || { given_shrunk: globalMu, recv_shrunk: globalMu };
        const deltaA2B = scoreA2B - statA.given_shrunk - statB.recv_shrunk + globalMu;
        const deltaB2A = scoreB2A - statB.given_shrunk - statA.recv_shrunk + globalMu;
        const actualChem = deltaA2B + deltaB2A;

        const predictedChem =
            predictedByPair[key] !== undefined
                ? predictedByPair[key]
                : globalMu;

        dataset.push({
            pairId: key,
            actualChem,
            predictedChem
        });
    }

    if (dataset.length < 10) {
        console.log(`Insufficient bi-directional feedback pairs (${dataset.length}). Aborting.`);
        return;
    }

    const actualScores = dataset.map((d) => d.actualChem);
    const predictedScores = dataset.map((d) => d.predictedChem);

    const corr = calculateCorrelation(predictedScores, actualScores);
    const topK = calculateTopKHit(predictedScores, actualScores, 10);
    const mae = calculateMAE(predictedScores, actualScores);
    const calibration = Math.max(0, 1 - (mae / 3)); // 0~1 normalization for rough calibration signal

    console.log(`Eval pairs=${dataset.length}`);
    console.log(`Metrics -> Pearson R=${corr.toFixed(4)}, Top-K Hit=${topK.toFixed(4)}, MAE=${mae.toFixed(4)}, Calibration=${calibration.toFixed(4)}`);

    const nextVersion = `hybrid-v3.train.${Math.floor(Date.now() / 1000)}`;
    const failReason = [];
    let status = 'CANDIDATE';

    if (corr < 0.15) failReason.push('Correlation < 0.15');
    if (topK < 0.1) failReason.push('Top-K Hit < 0.10');
    if (dataset.length < 100) failReason.push('Insufficient Eval Samples (<100)');
    if (calibration < 0.35) failReason.push('Calibration < 0.35');

    if (activeModel && activeModel.metric_corr !== null && asNumber(activeModel.metric_corr) > corr + 0.02) {
        failReason.push('Regression vs active correlation');
    }

    if (failReason.length === 0) {
        status = 'ACTIVE';
        if (activeModel) {
            await supabaseAdmin.from('match_model_registry')
                .update({ status: 'RETIRED' })
                .eq('id', activeModel.id);
        }
    }

    const { error: regErr } = await supabaseAdmin.from('match_model_registry').insert({
        algo: 'hybrid-ranker',
        version: nextVersion,
        status,
        train_window_start: windowStart,
        train_window_end: new Date().toISOString(),
        train_samples: dataset.length,
        eval_samples: dataset.length,
        metric_corr: corr,
        metric_topk_hit: topK,
        metric_calibration: calibration,
        notes: {
            reasoning: 'Auto-trained against realized bidirectional review deltas',
            gates_failed: failReason,
            mae
        }
    });

    if (regErr) {
        console.error('Failed to save model registry row:', regErr);
    } else {
        console.log(`Saved model ${nextVersion} as ${status}.`);
    }
}

runAutoTrain();
