import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    blendDirectionalPrediction,
    deterministicDirectionalPrediction,
} from './lib/hybrid-match/scoring.mjs';
import {
    buildEvidenceAllowlist,
    validateEvidence,
} from './lib/hybrid-match/evidence.mjs';
import { getExplorationNeed } from './lib/hybrid-match/self-development.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, '..');
const DEFAULT_FIXTURE_PATH = path.join(
    WEB_ROOT,
    'autoresearch',
    'fixtures',
    'hybrid-match-offline-v1.json',
);

const METRIC_NAME = 'offline_hybrid_score';

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function round(value, digits = 6) {
    return Number(Number(value).toFixed(digits));
}

function rank(values) {
    const indexed = values
        .map((value, index) => ({ value, index }))
        .sort((left, right) => right.value - left.value);

    const ranks = new Array(values.length).fill(0);
    let i = 0;
    while (i < indexed.length) {
        let j = i;
        while (j + 1 < indexed.length && indexed[j + 1].value === indexed[i].value) {
            j += 1;
        }
        const avgRank = (i + j + 2) / 2; // 1-based average rank
        for (let k = i; k <= j; k += 1) {
            ranks[indexed[k].index] = avgRank;
        }
        i = j + 1;
    }
    return ranks;
}

function pearson(x, y) {
    if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 2) {
        return 0;
    }
    const n = x.length;
    const meanX = x.reduce((acc, value) => acc + value, 0) / n;
    const meanY = y.reduce((acc, value) => acc + value, 0) / n;

    let numerator = 0;
    let denLeft = 0;
    let denRight = 0;
    for (let i = 0; i < n; i += 1) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;
        numerator += dx * dy;
        denLeft += dx * dx;
        denRight += dy * dy;
    }

    const denominator = Math.sqrt(denLeft * denRight);
    if (!Number.isFinite(denominator) || denominator === 0) return 0;
    return numerator / denominator;
}

function spearman(x, y) {
    if (x.length !== y.length || x.length < 2) return 0;
    const rankX = rank(x);
    const rankY = rank(y);
    return pearson(rankX, rankY);
}

function parseArgs(argv) {
    const out = {
        fixturePath: DEFAULT_FIXTURE_PATH,
        pretty: false,
        outPath: null,
        failUnder: null,
        allowUnsafeFixture: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--pretty') {
            out.pretty = true;
            continue;
        }
        if (token === '--fixture' && argv[index + 1]) {
            out.fixturePath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === '--out' && argv[index + 1]) {
            out.outPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === '--fail-under' && argv[index + 1]) {
            out.failUnder = Number(argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === '--allow-unsafe-fixture') {
            out.allowUnsafeFixture = true;
        }
    }

    return out;
}

export function evaluateHybridMatchOffline(options = {}) {
    const requestedFixturePath = options.fixturePath
        ? path.resolve(process.cwd(), options.fixturePath)
        : DEFAULT_FIXTURE_PATH;
    const fixtureOverrideUsed = requestedFixturePath !== DEFAULT_FIXTURE_PATH;
    const allowUnsafeFixture = options.allowUnsafeFixture === true;

    if (fixtureOverrideUsed && !allowUnsafeFixture) {
        throw new Error(
            'fixture override is blocked by default. use --allow-unsafe-fixture for manual debugging only.',
        );
    }

    const fixturePath = requestedFixturePath;

    const raw = fs.readFileSync(fixturePath, 'utf8');
    const fixture = JSON.parse(raw);

    const rankingCases = Array.isArray(fixture.ranking_cases) ? fixture.ranking_cases : [];
    const evidenceCases = Array.isArray(fixture.evidence_cases) ? fixture.evidence_cases : [];
    const explorationCases = Array.isArray(fixture.exploration_cases) ? fixture.exploration_cases : [];
    const minGroundingScore = Number.isFinite(fixture.min_grounding_score)
        ? fixture.min_grounding_score
        : 0.45;

    const rankingRows = [];
    for (const row of rankingCases) {
        const targetTraits = row?.target?.traits_json ?? {};
        const targetVerified = row?.target?.verified_feature ?? {};

        const allowlist = buildEvidenceAllowlist(targetTraits, targetVerified);
        const validated = validateEvidence(
            row.llm_prediction,
            targetTraits,
            targetVerified,
            allowlist,
        );
        const deterministic = deterministicDirectionalPrediction(row.viewer, row.target);
        const blended = blendDirectionalPrediction(validated, deterministic, {
            minGroundingScore,
        });

        rankingRows.push({
            id: String(row.id || `rank_${rankingRows.length + 1}`),
            label_score: Number(row.label_score),
            predicted_score: round(blended.predicted_score, 6),
            confidence: round(blended.confidence, 6),
            grounding_score: round(validated.grounding_score, 6),
            source: blended.source,
        });
    }

    const labelScores = rankingRows.map((row) => row.label_score);
    const predictedScores = rankingRows.map((row) => row.predicted_score);
    const spearmanR = rankingRows.length >= 2 ? spearman(predictedScores, labelScores) : 0;
    const spearmanNorm = clamp((spearmanR + 1) / 2, 0, 1);

    const evidenceRows = [];
    for (const row of evidenceCases) {
        const targetTraits = row?.target_traits ?? {};
        const targetVerified = row?.target_verified ?? {};
        const threshold = Number.isFinite(row?.threshold)
            ? Number(row.threshold)
            : minGroundingScore;
        const expectedValid = row?.expected_valid !== false;

        const allowlist = buildEvidenceAllowlist(targetTraits, targetVerified);
        const validated = validateEvidence(
            row.prediction,
            targetTraits,
            targetVerified,
            allowlist,
        );

        const actualValid = validated.grounding_score >= threshold;
        const passed = expectedValid ? actualValid : !actualValid;

        evidenceRows.push({
            id: String(row.id || `evidence_${evidenceRows.length + 1}`),
            threshold: round(threshold, 6),
            expected_valid: expectedValid,
            actual_valid: actualValid,
            grounding_score: round(validated.grounding_score, 6),
            passed,
        });
    }

    const evidencePassRate = evidenceRows.length === 0
        ? 0
        : evidenceRows.filter((row) => row.passed).length / evidenceRows.length;

    const explorationRows = [];
    for (const row of explorationCases) {
        const need = getExplorationNeed(row.self_dev);
        const expectedMin = Number.isFinite(row.expected_min) ? Number(row.expected_min) : 0;
        const expectedMax = Number.isFinite(row.expected_max) ? Number(row.expected_max) : 1;
        const passed = need >= expectedMin && need <= expectedMax;
        explorationRows.push({
            id: String(row.id || `explore_${explorationRows.length + 1}`),
            expected_min: round(expectedMin, 6),
            expected_max: round(expectedMax, 6),
            need: round(need, 6),
            passed,
        });
    }

    const explorationPassRate = explorationRows.length === 0
        ? 0
        : explorationRows.filter((row) => row.passed).length / explorationRows.length;

    const offlineHybridScore = clamp(
        (spearmanNorm * 0.75) + (evidencePassRate * 0.15) + (explorationPassRate * 0.1),
        0,
        1,
    );

    return {
        metric_name: METRIC_NAME,
        metric: round(offlineHybridScore, 6),
        fixture_version: fixture.version || 'unknown',
        fixture_path: fixturePath,
        canonical_fixture_path: DEFAULT_FIXTURE_PATH,
        fixture_override_used: fixtureOverrideUsed,
        optimization_island: 'apps/web/scripts/lib/hybrid-match/{scoring,self-development,evidence}.mjs',
        components: {
            ranking_spearman: round(spearmanR, 6),
            ranking_spearman_norm: round(spearmanNorm, 6),
            evidence_pass_rate: round(evidencePassRate, 6),
            exploration_pass_rate: round(explorationPassRate, 6),
            weights: {
                ranking_spearman_norm: 0.75,
                evidence_pass_rate: 0.15,
                exploration_pass_rate: 0.1,
            },
        },
        counts: {
            ranking_cases: rankingRows.length,
            evidence_cases: evidenceRows.length,
            exploration_cases: explorationRows.length,
        },
        details: {
            ranking: rankingRows,
            evidence: evidenceRows,
            exploration: explorationRows,
        },
        local_offline_only: true,
        supabase_writes_used: false,
        safety_verified: !fixtureOverrideUsed,
        generated_at: new Date().toISOString(),
    };
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const result = evaluateHybridMatchOffline({
        fixturePath: args.fixturePath,
        allowUnsafeFixture: args.allowUnsafeFixture,
    });

    if (args.outPath) {
        fs.mkdirSync(path.dirname(args.outPath), { recursive: true });
        fs.writeFileSync(args.outPath, JSON.stringify(result, null, 2));
    }

    if (args.pretty) {
        console.log(JSON.stringify(result, null, 2));
    } else {
        console.log(JSON.stringify(result));
    }

    if (Number.isFinite(args.failUnder) && result.metric < args.failUnder) {
        process.exit(2);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main();
}
