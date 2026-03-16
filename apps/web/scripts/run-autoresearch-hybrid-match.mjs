import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { evaluateHybridMatchOffline } from './eval-hybrid-match-offline.mjs';
import { proposeHybridMatchCandidate } from './propose-hybrid-match-candidate.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..');
const AUTORESEARCH_ROOT = path.join(WEB_ROOT, 'autoresearch');
const STATE_DIR = path.join(AUTORESEARCH_ROOT, '.state');
const SNAPSHOT_ROOT = path.join(STATE_DIR, 'baseline_snapshot');
const BASELINE_STATE_PATH = path.join(STATE_DIR, 'baseline.json');
const RESULTS_PATH = path.join(AUTORESEARCH_ROOT, 'results.jsonl');
const FIXTURE_PATH = path.join(AUTORESEARCH_ROOT, 'fixtures', 'hybrid-match-offline-v1.json');
const EVAL_HARNESS_PATH = path.join(WEB_ROOT, 'scripts', 'eval-hybrid-match-offline.mjs');
const PROPOSER_POLICY_PATH = path.join(AUTORESEARCH_ROOT, 'CANDIDATE_PROPOSER_POLICY.md');
const IMPROVEMENT_THRESHOLD = 0.005;
const DEFAULT_PROPOSER_MODEL = 'gpt-5-mini';

const OPTIMIZATION_ISLAND = [
    'apps/web/scripts/lib/hybrid-match/scoring.mjs',
    'apps/web/scripts/lib/hybrid-match/self-development.mjs',
    'apps/web/scripts/lib/hybrid-match/evidence.mjs',
];

function parseArgs(argv) {
    const [command = 'status', ...rest] = argv;
    const parsed = {
        command,
        note: '',
        forceRebaseline: false,
        model: DEFAULT_PROPOSER_MODEL,
    };

    for (let index = 0; index < rest.length; index += 1) {
        if (rest[index] === '--note' && rest[index + 1]) {
            parsed.note = rest[index + 1];
            index += 1;
            continue;
        }
        if (rest[index] === '--force-rebaseline') {
            parsed.forceRebaseline = true;
            continue;
        }
        if (rest[index] === '--model' && rest[index + 1]) {
            parsed.model = rest[index + 1];
            index += 1;
        }
    }

    return parsed;
}

function ensureDirs() {
    fs.mkdirSync(AUTORESEARCH_ROOT, { recursive: true });
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.mkdirSync(SNAPSHOT_ROOT, { recursive: true });
}

function readJsonIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, payload) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function safeExec(command) {
    try {
        return execSync(command, { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
            .toString('utf8')
            .trim();
    } catch {
        return null;
    }
}

function getGitMeta() {
    return {
        git_commit: safeExec('git rev-parse HEAD') || 'unknown',
        branch: safeExec('git rev-parse --abbrev-ref HEAD') || 'unknown',
    };
}

function relativeFromRepoRoot(absPath) {
    return path.relative(REPO_ROOT, absPath).replace(/\\/g, '/');
}

function sha256File(absPath) {
    if (!fs.existsSync(absPath)) return null;
    const raw = fs.readFileSync(absPath);
    return createHash('sha256').update(raw).digest('hex');
}

function captureIslandHashes() {
    const hashes = {};
    for (const rel of OPTIMIZATION_ISLAND) {
        const abs = path.resolve(REPO_ROOT, rel);
        hashes[rel] = sha256File(abs);
    }
    return hashes;
}

function getImmutableInputsSnapshot() {
    return {
        canonical_eval_harness_path: relativeFromRepoRoot(EVAL_HARNESS_PATH),
        canonical_eval_harness_sha256: sha256File(EVAL_HARNESS_PATH),
        canonical_fixture_path: relativeFromRepoRoot(FIXTURE_PATH),
        canonical_fixture_sha256: sha256File(FIXTURE_PATH),
    };
}

function snapshotIslandFiles() {
    for (const rel of OPTIMIZATION_ISLAND) {
        const sourceAbs = path.resolve(REPO_ROOT, rel);
        const targetAbs = path.join(SNAPSHOT_ROOT, rel);
        if (!fs.existsSync(sourceAbs)) continue;
        fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
        fs.copyFileSync(sourceAbs, targetAbs);
    }
}

function restoreIslandFilesFromSnapshot() {
    for (const rel of OPTIMIZATION_ISLAND) {
        const snapshotAbs = path.join(SNAPSHOT_ROOT, rel);
        const targetAbs = path.resolve(REPO_ROOT, rel);
        if (!fs.existsSync(snapshotAbs)) continue;
        fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
        fs.copyFileSync(snapshotAbs, targetAbs);
    }
}

function appendResultLog(entry) {
    fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
    if (!fs.existsSync(RESULTS_PATH)) {
        fs.writeFileSync(RESULTS_PATH, '');
    }
    fs.appendFileSync(RESULTS_PATH, `${JSON.stringify(entry)}\n`);
}

function getRecentResultsTail(maxLines = 8) {
    if (!fs.existsSync(RESULTS_PATH)) return '';
    const lines = fs.readFileSync(RESULTS_PATH, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    return lines.slice(-maxLines).join('\n');
}

function getIslandFileContents() {
    const payload = {};
    for (const rel of OPTIMIZATION_ISLAND) {
        const abs = path.resolve(REPO_ROOT, rel);
        payload[rel] = fs.readFileSync(abs, 'utf8');
    }
    return payload;
}

function verifyImmutableInputsAgainstBaseline(baselineState) {
    const snapshot = getImmutableInputsSnapshot();
    const expected = baselineState?.integrity || {};

    const checks = {
        offline_loop_no_db_target_required: true,
        canonical_harness_path_locked: expected.canonical_eval_harness_path === snapshot.canonical_eval_harness_path,
        canonical_fixture_path_locked: expected.canonical_fixture_path === snapshot.canonical_fixture_path,
        canonical_harness_hash_match: expected.canonical_eval_harness_sha256 === snapshot.canonical_eval_harness_sha256,
        canonical_fixture_hash_match: expected.canonical_fixture_sha256 === snapshot.canonical_fixture_sha256,
    };

    const errors = Object.entries(checks)
        .filter(([, passed]) => !passed)
        .map(([name]) => name);

    return {
        ok: errors.length === 0,
        checks,
        errors,
        snapshot,
    };
}

function applyProposalPatch(changes) {
    const allowed = new Set(OPTIMIZATION_ISLAND);
    const stagedContents = new Map();
    const touchedFiles = new Set();

    for (const [index, change] of changes.entries()) {
        const rel = String(change.file || '').replace(/\\/g, '/').trim();
        if (!allowed.has(rel)) {
            throw new Error(`proposal change[${index}] targets forbidden file: ${rel}`);
        }

        const find = String(change.find || '');
        const replace = String(change.replace || '');
        if (!find) {
            throw new Error(`proposal change[${index}] has empty find snippet`);
        }

        const abs = path.resolve(REPO_ROOT, rel);
        if (!stagedContents.has(rel)) {
            stagedContents.set(rel, fs.readFileSync(abs, 'utf8'));
        }
        const current = stagedContents.get(rel);
        const firstIndex = current.indexOf(find);
        if (firstIndex === -1) {
            throw new Error(`proposal change[${index}] find snippet not found in ${rel}`);
        }
        const secondIndex = current.indexOf(find, firstIndex + find.length);
        if (secondIndex !== -1) {
            throw new Error(`proposal change[${index}] find snippet is ambiguous in ${rel}`);
        }

        const next = `${current.slice(0, firstIndex)}${replace}${current.slice(firstIndex + find.length)}`;
        stagedContents.set(rel, next);
        touchedFiles.add(rel);
    }

    for (const rel of touchedFiles) {
        const abs = path.resolve(REPO_ROOT, rel);
        fs.writeFileSync(abs, stagedContents.get(rel));
    }

    return {
        patch_target_files: [...touchedFiles],
    };
}

function runEval() {
    return evaluateHybridMatchOffline({ fixturePath: FIXTURE_PATH });
}

function buildSafetyChecks(params) {
    const evalResult = params.evalResult || {};
    const extra = params.extraChecks || {};

    const checks = {
        eval_local_offline_only: evalResult.local_offline_only === true,
        eval_no_supabase_writes: evalResult.supabase_writes_used === false,
        eval_canonical_fixture_path: path.resolve(evalResult.fixture_path || '') === FIXTURE_PATH,
        eval_no_fixture_override: evalResult.fixture_override_used !== true,
        db_target_required_is_false: true,
        db_target_is_na_offline: true,
        fcqs_excluded: true,
        ...extra,
    };

    return {
        checks,
        safety_verified: Object.values(checks).every((value) => value === true),
    };
}

function buildLogEntry(params) {
    const now = new Date().toISOString();
    const git = getGitMeta();
    const safety = buildSafetyChecks({
        evalResult: params.evalResult,
        extraChecks: params.extraSafetyChecks,
    });
    const proposal = params.proposalContext || {};

    return {
        timestamp: now,
        git_commit: git.git_commit,
        branch: git.branch,
        optimization_island: OPTIMIZATION_ISLAND,
        baseline_metric: params.baseline_metric,
        candidate_metric: params.candidate_metric,
        delta: params.delta,
        decision: params.decision,
        short_note: params.short_note || '',
        run_status: params.run_status,
        environment_target: 'local-offline-no-db',
        db_target: 'N/A_OFFLINE_ONLY',
        cjmn_required: false,
        fcqs_excluded: true,
        safety_verified: safety.safety_verified,
        safety_checks: safety.checks,
        fixture_path: relativeFromRepoRoot(FIXTURE_PATH),
        metric_name: params.metric_name,
        force_rebaseline: params.forceRebaseline === true,
        proposal_source: proposal.proposal_source ?? null,
        proposal_model: proposal.proposal_model ?? null,
        proposal_policy_version: proposal.prompt_policy_version ?? null,
        proposal_patch_target_files: proposal.proposal_patch_target_files ?? [],
        patch_application_succeeded: params.patchApplicationSucceeded ?? null,
        evaluation_succeeded: params.evaluationSucceeded ?? null,
    };
}

function runBaseline(note, options = {}) {
    const existing = readJsonIfExists(BASELINE_STATE_PATH);
    if (existing && options.forceRebaseline !== true) {
        throw new Error('baseline already exists; rerun with --force-rebaseline to overwrite baseline anchor.');
    }

    const evalResult = runEval();
    const integritySnapshot = getImmutableInputsSnapshot();

    snapshotIslandFiles();
    const statePayload = {
        metric_name: evalResult.metric_name,
        baseline_metric: evalResult.metric,
        threshold: IMPROVEMENT_THRESHOLD,
        fixture_version: evalResult.fixture_version,
        fixture_path: relativeFromRepoRoot(FIXTURE_PATH),
        captured_at: new Date().toISOString(),
        island_hashes: captureIslandHashes(),
        integrity: integritySnapshot,
    };
    writeJson(BASELINE_STATE_PATH, statePayload);

    const rebaseline = Boolean(existing);
    const logEntry = buildLogEntry({
        baseline_metric: evalResult.metric,
        candidate_metric: evalResult.metric,
        delta: 0,
        decision: rebaseline ? 'REBASELINE' : 'BASELINE',
        short_note: note || (rebaseline ? 'forced rebaseline snapshot captured' : 'baseline snapshot captured'),
        run_status: 'SUCCESS',
        metric_name: evalResult.metric_name,
        evalResult,
        extraSafetyChecks: {
            immutable_harness_hash_captured: Boolean(integritySnapshot.canonical_eval_harness_sha256),
            immutable_fixture_hash_captured: Boolean(integritySnapshot.canonical_fixture_sha256),
        },
        forceRebaseline: options.forceRebaseline === true,
        patchApplicationSucceeded: false,
        evaluationSucceeded: true,
    });
    appendResultLog(logEntry);

    return {
        mode: 'baseline',
        rebaseline,
        state: statePayload,
        eval: evalResult,
        log: logEntry,
    };
}

function runCandidate(note, options = {}) {
    const baselineState = readJsonIfExists(BASELINE_STATE_PATH);
    if (!baselineState) {
        throw new Error('baseline state not found. run baseline first.');
    }

    const preflight = verifyImmutableInputsAgainstBaseline(baselineState);
    if (!preflight.ok) {
        const blockedLog = buildLogEntry({
            baseline_metric: Number(baselineState.baseline_metric),
            candidate_metric: null,
            delta: null,
            decision: 'BLOCKED',
            short_note: `immutable preflight failed: ${preflight.errors.join(', ')}`,
            run_status: 'FAILED_SAFETY',
            metric_name: baselineState.metric_name || 'offline_hybrid_score',
            evalResult: {
                local_offline_only: true,
                supabase_writes_used: false,
                fixture_path: FIXTURE_PATH,
                fixture_override_used: false,
            },
            extraSafetyChecks: preflight.checks,
            proposalContext: options.proposalContext,
            patchApplicationSucceeded: options.patchApplicationSucceeded ?? null,
            evaluationSucceeded: false,
        });
        appendResultLog(blockedLog);
        throw new Error(`candidate blocked by immutable integrity check: ${preflight.errors.join(', ')}`);
    }

    const evalResult = runEval();
    const delta = Number((evalResult.metric - Number(baselineState.baseline_metric)).toFixed(6));
    const keep = delta >= IMPROVEMENT_THRESHOLD;

    if (keep) {
        snapshotIslandFiles();
        const nextState = {
            ...baselineState,
            baseline_metric: evalResult.metric,
            captured_at: new Date().toISOString(),
            island_hashes: captureIslandHashes(),
            integrity: getImmutableInputsSnapshot(),
        };
        writeJson(BASELINE_STATE_PATH, nextState);
    } else {
        restoreIslandFilesFromSnapshot();
    }

    const decision = keep ? 'KEEP' : 'DISCARD';
    const logEntry = buildLogEntry({
        baseline_metric: Number(baselineState.baseline_metric),
        candidate_metric: evalResult.metric,
        delta,
        decision,
        short_note: note || `threshold=${IMPROVEMENT_THRESHOLD}`,
        run_status: 'SUCCESS',
        metric_name: evalResult.metric_name,
        evalResult,
        extraSafetyChecks: preflight.checks,
        proposalContext: options.proposalContext,
        patchApplicationSucceeded: options.patchApplicationSucceeded ?? null,
        evaluationSucceeded: true,
    });
    appendResultLog(logEntry);

    return {
        mode: 'candidate',
        threshold: IMPROVEMENT_THRESHOLD,
        baseline_metric: Number(baselineState.baseline_metric),
        candidate_metric: evalResult.metric,
        delta,
        decision,
        restored: !keep,
        eval: evalResult,
        log: logEntry,
    };
}

function runReset(note) {
    restoreIslandFilesFromSnapshot();
    const baselineState = readJsonIfExists(BASELINE_STATE_PATH);

    const logEntry = buildLogEntry({
        baseline_metric: baselineState?.baseline_metric ?? null,
        candidate_metric: baselineState?.baseline_metric ?? null,
        delta: 0,
        decision: 'RESET',
        short_note: note || 'manual baseline restore',
        run_status: 'SUCCESS',
        metric_name: baselineState?.metric_name || 'offline_hybrid_score',
        evalResult: {
            local_offline_only: true,
            supabase_writes_used: false,
            fixture_path: FIXTURE_PATH,
            fixture_override_used: false,
        },
        extraSafetyChecks: baselineState?.integrity
            ? verifyImmutableInputsAgainstBaseline(baselineState).checks
            : {
                canonical_harness_path_locked: false,
                canonical_fixture_path_locked: false,
                canonical_harness_hash_match: false,
                canonical_fixture_hash_match: false,
            },
        patchApplicationSucceeded: false,
        evaluationSucceeded: false,
    });
    appendResultLog(logEntry);

    return {
        mode: 'reset',
        restored: true,
        baseline: baselineState,
        log: logEntry,
    };
}

async function runProposeCandidate(note, options = {}) {
    const baselineState = readJsonIfExists(BASELINE_STATE_PATH);
    if (!baselineState) {
        throw new Error('baseline state not found. run baseline first.');
    }

    let proposalContext = null;
    try {
        const proposal = await proposeHybridMatchCandidate({
            model: options.model || DEFAULT_PROPOSER_MODEL,
            policyPath: PROPOSER_POLICY_PATH,
            baselineMetric: baselineState.baseline_metric,
            threshold: IMPROVEMENT_THRESHOLD,
            note,
            allowedFiles: OPTIMIZATION_ISLAND,
            recentResultsTail: getRecentResultsTail(8),
            fileContents: getIslandFileContents(),
        });

        const patchResult = applyProposalPatch(proposal.proposal_changes);
        proposalContext = {
            ...proposal,
            proposal_patch_target_files: patchResult.patch_target_files,
        };
    } catch (error) {
        const failureLog = buildLogEntry({
            baseline_metric: Number(baselineState.baseline_metric),
            candidate_metric: null,
            delta: null,
            decision: 'PROPOSAL_FAILED',
            short_note: `openai proposal failed: ${error?.message || String(error)}`,
            run_status: 'FAILED_PROPOSAL',
            metric_name: baselineState.metric_name || 'offline_hybrid_score',
            evalResult: {
                local_offline_only: true,
                supabase_writes_used: false,
                fixture_path: FIXTURE_PATH,
                fixture_override_used: false,
            },
            proposalContext,
            patchApplicationSucceeded: false,
            evaluationSucceeded: false,
        });
        appendResultLog(failureLog);

        return {
            mode: 'propose-candidate',
            status: 'failed',
            error: error?.message || String(error),
            log: failureLog,
        };
    }

    try {
        const candidate = runCandidate(
            note || `openai proposal: ${proposalContext.proposal_summary}`,
            {
                proposalContext,
                patchApplicationSucceeded: true,
            },
        );

        return {
            mode: 'propose-candidate',
            status: 'completed',
            proposal: proposalContext,
            candidate,
        };
    } catch (error) {
        restoreIslandFilesFromSnapshot();

        if (String(error?.message || '').includes('candidate blocked by immutable integrity check')) {
            return {
                mode: 'propose-candidate',
                status: 'blocked',
                error: error?.message || String(error),
                proposal: proposalContext,
            };
        }

        const failureLog = buildLogEntry({
            baseline_metric: Number(baselineState.baseline_metric),
            candidate_metric: null,
            delta: null,
            decision: 'PROPOSAL_EVAL_FAILED',
            short_note: `candidate evaluation failed: ${error?.message || String(error)}`,
            run_status: 'FAILED_EVAL',
            metric_name: baselineState.metric_name || 'offline_hybrid_score',
            evalResult: {
                local_offline_only: true,
                supabase_writes_used: false,
                fixture_path: FIXTURE_PATH,
                fixture_override_used: false,
            },
            proposalContext,
            patchApplicationSucceeded: true,
            evaluationSucceeded: false,
        });
        appendResultLog(failureLog);

        return {
            mode: 'propose-candidate',
            status: 'failed',
            error: error?.message || String(error),
            proposal: proposalContext,
            log: failureLog,
        };
    }
}

function runStatus() {
    const baselineState = readJsonIfExists(BASELINE_STATE_PATH);
    let lastLog = null;
    if (fs.existsSync(RESULTS_PATH)) {
        const lines = fs.readFileSync(RESULTS_PATH, 'utf8')
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        if (lines.length > 0) {
            try {
                lastLog = JSON.parse(lines[lines.length - 1]);
            } catch {
                lastLog = null;
            }
        }
    }
    return {
        mode: 'status',
        baseline_state_exists: Boolean(baselineState),
        baseline: baselineState,
        last_log: lastLog,
        threshold: IMPROVEMENT_THRESHOLD,
        optimization_island: OPTIMIZATION_ISLAND,
        fixture_path: relativeFromRepoRoot(FIXTURE_PATH),
        eval_harness_path: relativeFromRepoRoot(EVAL_HARNESS_PATH),
        proposer_policy_path: relativeFromRepoRoot(PROPOSER_POLICY_PATH),
        db_target_required: false,
        db_target: 'N/A_OFFLINE_ONLY',
    };
}

async function main() {
    ensureDirs();
    const args = parseArgs(process.argv.slice(2));

    let output;
    if (args.command === 'baseline') {
        output = runBaseline(args.note, { forceRebaseline: args.forceRebaseline });
    } else if (args.command === 'candidate') {
        output = runCandidate(args.note);
    } else if (args.command === 'propose-candidate') {
        output = await runProposeCandidate(args.note, { model: args.model });
    } else if (args.command === 'reset') {
        output = runReset(args.note);
    } else if (args.command === 'status') {
        output = runStatus();
    } else {
        throw new Error(`unknown command: ${args.command}`);
    }

    console.log(JSON.stringify(output, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error?.message || error);
        process.exit(1);
    });
}
