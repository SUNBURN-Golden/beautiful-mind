#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '../../..');
const DEFAULT_CONTRACT_ROOT = 'apps/web/frontend-harness';
const IGNORED_CHANGED_FILE_PATTERNS = [
    'apps/web/.next/**',
    'apps/web/playwright-report/**',
    '.next/**',
    'playwright-report/**',
];

function printUsage() {
    console.log(`Usage:
  node apps/web/scripts/validate-frontend-harness.mjs --task path/to/task.json --changed-files path/to/changed-files.txt
  node apps/web/scripts/validate-frontend-harness.mjs --task path/to/task.json --changed-file apps/web/app/match/page.tsx --changed-file apps/web/components/ui/button.tsx

Options:
  --task <path>            Required. JSON task envelope to validate.
  --changed-files <path>   Optional. Text file with one changed path per line.
  --changed-file <path>    Optional. Repeatable repo-relative or absolute changed path.
  --help                   Show this help.

Notes:
  - Changed paths are normalized to repo-relative form.
  - Blank lines and lines starting with # are ignored in --changed-files inputs.
  - Generated artifacts under .next/ and playwright-report/ are ignored.
  - If no changed files are provided, the validator runs in envelope-only mode.`);
}

function parseArgs(argv) {
    const args = {
        task: null,
        changedFilesListPath: null,
        changedFiles: [],
        help: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--help' || arg === '-h') {
            args.help = true;
            continue;
        }
        if (arg === '--task') {
            args.task = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--changed-files') {
            args.changedFilesListPath = argv[index + 1] || null;
            index += 1;
            continue;
        }
        if (arg === '--changed-file') {
            const value = argv[index + 1] || null;
            if (value) args.changedFiles.push(value);
            index += 1;
            continue;
        }
        throw new Error(`Unknown argument: ${arg}`);
    }

    return args;
}

function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFileRequired(filePath, label) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`${label} not found: ${path.relative(REPO_ROOT, filePath) || filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

function readJsonRequired(filePath, label) {
    const raw = readFileRequired(filePath, label);
    try {
        return JSON.parse(raw);
    } catch (error) {
        throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
}

function normalizeRepoPath(inputPath) {
    const raw = String(inputPath || '').trim();
    if (!raw) return '';

    let normalized;
    if (path.isAbsolute(raw)) {
        normalized = path.relative(REPO_ROOT, raw);
    } else {
        normalized = raw;
    }

    normalized = path.normalize(normalized).replace(/\\/g, '/');
    normalized = normalized.replace(/^\.\/+/, '');

    return normalized;
}

function escapeRegexChar(char) {
    return /[|\\{}()[\]^$+?.]/.test(char) ? `\\${char}` : char;
}

function globToRegExp(glob) {
    let pattern = '^';
    for (let index = 0; index < glob.length; index += 1) {
        const char = glob[index];
        const next = glob[index + 1];
        if (char === '*' && next === '*') {
            pattern += '.*';
            index += 1;
            continue;
        }
        if (char === '*') {
            pattern += '[^/]*';
            continue;
        }
        if (char === '?') {
            pattern += '[^/]';
            continue;
        }
        pattern += escapeRegexChar(char);
    }
    pattern += '$';
    return new RegExp(pattern);
}

function matchesPattern(value, pattern) {
    return globToRegExp(pattern).test(value);
}

function matchesAnyPattern(value, patterns) {
    for (const pattern of patterns || []) {
        if (matchesPattern(value, pattern)) {
            return pattern;
        }
    }
    return null;
}

function hasGlob(pattern) {
    return /[*?]/.test(String(pattern || ''));
}

function getLiteralPatternPrefix(pattern) {
    const normalized = normalizeRepoPath(pattern);
    if (!normalized) return '';
    const firstGlobIndex = normalized.search(/[*?]/);
    const prefix = firstGlobIndex === -1 ? normalized : normalized.slice(0, firstGlobIndex);
    return prefix.replace(/\/+$/, '');
}

function patternsOverlap(patternA, patternB) {
    const normalizedA = normalizeRepoPath(patternA);
    const normalizedB = normalizeRepoPath(patternB);
    if (!normalizedA || !normalizedB) return false;

    const aHasGlob = hasGlob(normalizedA);
    const bHasGlob = hasGlob(normalizedB);

    if (!aHasGlob && !bHasGlob) {
        return normalizedA === normalizedB;
    }
    if (!aHasGlob) {
        return matchesPattern(normalizedA, normalizedB);
    }
    if (!bHasGlob) {
        return matchesPattern(normalizedB, normalizedA);
    }

    const prefixA = getLiteralPatternPrefix(normalizedA);
    const prefixB = getLiteralPatternPrefix(normalizedB);
    if (!prefixA || !prefixB) return false;
    return prefixA.startsWith(prefixB) || prefixB.startsWith(prefixA);
}

function findOverlappingPattern(pattern, patterns) {
    for (const candidate of patterns || []) {
        if (patternsOverlap(pattern, candidate)) {
            return candidate;
        }
    }
    return null;
}

function loadContracts() {
    const harnessConfigPath = path.join(REPO_ROOT, DEFAULT_CONTRACT_ROOT, 'harness.config.json');
    const harnessConfig = readJsonRequired(harnessConfigPath, 'harness config');

    const contracts = {};
    for (const [key, relativePath] of Object.entries(harnessConfig.contracts || {})) {
        const absolutePath = path.join(REPO_ROOT, relativePath);
        contracts[key] = readJsonRequired(absolutePath, `${key} contract`);
    }

    return {
        harnessConfig,
        surfaces: contracts.surfaces,
        fileBoundaries: contracts.file_boundaries,
        semanticGuard: contracts.semantic_guard,
        styleGuard: contracts.style_guard,
        visualRegression: contracts.visual_regression,
        taskSchema: contracts.task_request_schema,
    };
}

function matchesSchemaType(value, typeName) {
    if (typeName === 'null') return value === null;
    if (typeName === 'array') return Array.isArray(value);
    if (typeName === 'object') return isPlainObject(value);
    return typeof value === typeName;
}

function pushSchemaError(errors, schemaPath, message) {
    errors.push(`${schemaPath}: ${message}`);
}

function validateAgainstSchema(value, schema, schemaPath = '$') {
    const errors = [];
    validateSchemaNode(value, schema, schemaPath, errors);
    return errors;
}

function validateSchemaNode(value, schema, schemaPath, errors) {
    if (!isPlainObject(schema)) {
        pushSchemaError(errors, schemaPath, 'invalid schema node');
        return;
    }

    if (schema.type !== undefined) {
        const allowedTypes = Array.isArray(schema.type) ? schema.type : [schema.type];
        const matches = allowedTypes.some((typeName) => matchesSchemaType(value, typeName));
        if (!matches) {
            pushSchemaError(errors, schemaPath, `expected type ${allowedTypes.join(' | ')}`);
            return;
        }
    }

    if (schema.enum) {
        const serializedValue = JSON.stringify(value);
        const allowed = schema.enum.some((entry) => JSON.stringify(entry) === serializedValue);
        if (!allowed) {
            pushSchemaError(errors, schemaPath, `value is not in enum`);
            return;
        }
    }

    if (typeof value === 'string') {
        if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
            pushSchemaError(errors, schemaPath, `must have minLength ${schema.minLength}`);
        }
        if (schema.pattern) {
            const regex = new RegExp(schema.pattern);
            if (!regex.test(value)) {
                pushSchemaError(errors, schemaPath, `must match pattern ${schema.pattern}`);
            }
        }
    }

    if (Array.isArray(value)) {
        if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
            pushSchemaError(errors, schemaPath, `must have minItems ${schema.minItems}`);
        }
        if (schema.uniqueItems) {
            const seen = new Set();
            for (const item of value) {
                const key = JSON.stringify(item);
                if (seen.has(key)) {
                    pushSchemaError(errors, schemaPath, 'must have uniqueItems');
                    break;
                }
                seen.add(key);
            }
        }
        if (schema.items) {
            value.forEach((item, index) => {
                validateSchemaNode(item, schema.items, `${schemaPath}[${index}]`, errors);
            });
        }
    }

    if (isPlainObject(value)) {
        const properties = schema.properties || {};
        const required = Array.isArray(schema.required) ? schema.required : [];
        for (const key of required) {
            if (!(key in value)) {
                pushSchemaError(errors, schemaPath, `missing required property "${key}"`);
            }
        }
        if (schema.additionalProperties === false) {
            for (const key of Object.keys(value)) {
                if (!(key in properties)) {
                    pushSchemaError(errors, `${schemaPath}.${key}`, 'additional property is not allowed');
                }
            }
        }
        for (const [key, propertySchema] of Object.entries(properties)) {
            if (key in value) {
                validateSchemaNode(value[key], propertySchema, `${schemaPath}.${key}`, errors);
            }
        }
    }
}

function loadTask(taskArg) {
    if (!taskArg) {
        throw new Error('missing required --task argument');
    }
    const taskPath = path.isAbsolute(taskArg)
        ? taskArg
        : path.resolve(process.cwd(), taskArg);
    const task = readJsonRequired(taskPath, 'task file');
    return {
        task,
        taskPath,
        repoRelativeTaskPath: normalizeRepoPath(taskPath),
    };
}

function loadChangedFileInputs(args) {
    const changed = [];
    if (args.changedFilesListPath) {
        const listPath = path.isAbsolute(args.changedFilesListPath)
            ? args.changedFilesListPath
            : path.resolve(process.cwd(), args.changedFilesListPath);
        const raw = readFileRequired(listPath, 'changed files list');
        for (const line of raw.split(/\r?\n/)) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            changed.push(trimmed);
        }
    }
    changed.push(...args.changedFiles);
    return changed;
}

function classifyChangedFiles(rawInputs) {
    const actionable = [];
    const ignored = [];
    const invalid = [];
    const seen = new Set();

    for (const input of rawInputs) {
        const repoPath = normalizeRepoPath(input);
        if (!repoPath) continue;
        if (repoPath.startsWith('..')) {
            invalid.push(`${input} (outside repo)`);
            continue;
        }
        if (seen.has(repoPath)) continue;
        seen.add(repoPath);

        const ignoredPattern = matchesAnyPattern(repoPath, IGNORED_CHANGED_FILE_PATTERNS);
        if (ignoredPattern) {
            ignored.push({ path: repoPath, pattern: ignoredPattern });
            continue;
        }
        actionable.push(repoPath);
    }

    return { actionable, ignored, invalid };
}

function buildSurfaceMap(surfacesContract) {
    const map = new Map();
    for (const surface of surfacesContract.surfaces || []) {
        map.set(surface.id, surface);
    }
    return map;
}

function getSurfaceOwnedFiles(surface) {
    const ownedFiles = [];
    if (typeof surface?.owner_file === 'string' && surface.owner_file) {
        ownedFiles.push(normalizeRepoPath(surface.owner_file));
    }

    const groupedFiles = ['surface_files', 'i18n_files', 'fixture_files'];
    for (const groupKey of groupedFiles) {
        for (const filePath of surface?.[groupKey] || []) {
            const normalized = normalizeRepoPath(filePath);
            if (normalized) ownedFiles.push(normalized);
        }
    }
    return [...new Set(ownedFiles)];
}

function validateSurfaceContracts(surfaceMap, errors) {
    const fileArrayKeys = ['surface_files', 'i18n_files', 'fixture_files'];

    for (const surface of surfaceMap.values()) {
        if (surface.status === 'live') {
            if (typeof surface.owner_file !== 'string' || !surface.owner_file) {
                errors.push(`surface "${surface.id}" is live but has no owner_file`);
                continue;
            }
            const ownerPath = path.join(REPO_ROOT, surface.owner_file);
            if (!fs.existsSync(ownerPath)) {
                errors.push(`surface "${surface.id}" owner_file does not exist: ${surface.owner_file}`);
            }
            if (!Array.isArray(surface.surface_files) || surface.surface_files.length === 0) {
                errors.push(`surface "${surface.id}" is live but has no surface_files`);
                continue;
            }
            for (const fileArrayKey of fileArrayKeys) {
                if (surface[fileArrayKey] === undefined) continue;
                if (!Array.isArray(surface[fileArrayKey])) {
                    errors.push(`surface "${surface.id}" has invalid ${fileArrayKey}; expected array`);
                    continue;
                }
                for (const surfaceFile of surface[fileArrayKey]) {
                    const surfaceFilePath = path.join(REPO_ROOT, surfaceFile);
                    if (!fs.existsSync(surfaceFilePath)) {
                        errors.push(`surface "${surface.id}" ${fileArrayKey.slice(0, -1)} does not exist: ${surfaceFile}`);
                    }
                }
            }
        }
    }
}

function validateAllowedFileEntries(task, contracts, surface) {
    const errors = [];
    const modeRules = contracts.fileBoundaries.mode_rules?.[task.mode];
    if (!modeRules) {
        errors.push(`mode "${task.mode}" has no file boundary rule`);
        return errors;
    }

    const surfaceOwnedFiles = new Set(getSurfaceOwnedFiles(surface));

    for (const rawEntry of task.allowed_files || []) {
        const entry = normalizeRepoPath(rawEntry);
        if (!entry) {
            errors.push('task.allowed_files contains an empty path entry');
            continue;
        }
        if (entry.startsWith('..')) {
            errors.push(`task.allowed_files entry is outside repo: "${rawEntry}"`);
            continue;
        }

        const sharedForbidden = findOverlappingPattern(entry, contracts.fileBoundaries.shared_forbidden_patterns || []);
        if (sharedForbidden) {
            errors.push(`task.allowed_files entry "${entry}" overlaps globally forbidden pattern "${sharedForbidden}"`);
        }

        const modeForbidden = findOverlappingPattern(entry, modeRules.forbidden_patterns || []);
        if (modeForbidden) {
            errors.push(`task.allowed_files entry "${entry}" overlaps mode-forbidden pattern "${modeForbidden}"`);
        }

        const sharedAllowed = findOverlappingPattern(entry, contracts.fileBoundaries.shared_allowed_patterns || []);
        if (!sharedAllowed) {
            errors.push(`task.allowed_files entry "${entry}" is outside shared_allowed_patterns`);
        }

        const modeAllowed = findOverlappingPattern(entry, modeRules.allowed_patterns || []);
        if (!modeAllowed) {
            errors.push(`task.allowed_files entry "${entry}" is outside allowed patterns for mode "${task.mode}"`);
        }

        if (isUiOnlyTask(task)) {
            const dependencyForbidden = findOverlappingPattern(
                entry,
                contracts.styleGuard.dependency_policy?.forbidden_manifest_files || [],
            );
            if (dependencyForbidden) {
                errors.push(`UI-only task cannot declare manifest or lockfile "${entry}" in task.allowed_files`);
            }
        }

        if (task.mode !== 'system_update') {
            if (hasGlob(entry)) {
                errors.push(`task.allowed_files entry "${entry}" must be an exact surface-owned file for mode "${task.mode}"`);
                continue;
            }
            if (!surfaceOwnedFiles.has(entry)) {
                errors.push(`task.allowed_files entry "${entry}" is not owned by surface "${surface.id}"`);
            }
        }
    }

    return errors;
}

function validateTaskEnvelope(task, contracts) {
    const errors = [];
    const schemaErrors = validateAgainstSchema(task, contracts.taskSchema, '$');
    errors.push(...schemaErrors.map((message) => `task schema violation: ${message}`));

    const surfaceMap = buildSurfaceMap(contracts.surfaces);
    validateSurfaceContracts(surfaceMap, errors);

    const allowedModes = contracts.harnessConfig.task_modes || [];
    if (!allowedModes.includes(task.mode)) {
        errors.push(`task mode "${task.mode}" is not registered in harness.config.json`);
    }

    const surface = surfaceMap.get(task.surface_id);
    if (!surface) {
        errors.push(`surface "${task.surface_id}" is not registered in surfaces.json`);
        return { errors, surface: null };
    }

    if (surface.status !== 'live') {
        errors.push(`surface "${surface.id}" is "${surface.status}" and cannot be edited`);
    }

    if (!Array.isArray(surface.allowed_modes) || !surface.allowed_modes.includes(task.mode)) {
        errors.push(`mode "${task.mode}" is not allowed for surface "${surface.id}"`);
    }

    const requiredStates = Array.isArray(surface.required_visible_states) ? surface.required_visible_states : [];
    if (task.fixture_state !== null && task.fixture_state !== 'pending' && !requiredStates.includes(task.fixture_state)) {
        errors.push(`fixture_state "${task.fixture_state}" is not registered for surface "${surface.id}"`);
    }

    if (!Array.isArray(task.allowed_files) || task.allowed_files.length === 0) {
        errors.push('task.allowed_files must contain at least one repo-relative path or pattern');
    }
    errors.push(...validateAllowedFileEntries(task, contracts, surface));

    return { errors, surface };
}

function isUiOnlyTask(_task) {
    return true;
}

function validateChangedFiles(task, contracts, surface, actionableChangedFiles) {
    const errors = [];
    const modeRules = contracts.fileBoundaries.mode_rules?.[task.mode];
    if (!modeRules) {
        errors.push(`mode "${task.mode}" has no file boundary rule`);
        return errors;
    }

    const surfaceOwnedFiles = new Set(getSurfaceOwnedFiles(surface));

    if (actionableChangedFiles.length > modeRules.max_touched_files) {
        errors.push(
            `mode "${task.mode}" allows at most ${modeRules.max_touched_files} changed files, received ${actionableChangedFiles.length}`,
        );
    }

    for (const repoPath of actionableChangedFiles) {
        const absolutePath = path.join(REPO_ROOT, repoPath);
        if (!fs.existsSync(absolutePath)) {
            errors.push(`changed file does not exist locally: ${repoPath}`);
            continue;
        }

        const sharedForbidden = matchesAnyPattern(repoPath, contracts.fileBoundaries.shared_forbidden_patterns || []);
        if (sharedForbidden) {
            errors.push(`changed file "${repoPath}" matches globally forbidden pattern "${sharedForbidden}"`);
        }

        const taskForbidden = matchesAnyPattern(repoPath, task.forbidden_files || []);
        if (taskForbidden) {
            errors.push(`changed file "${repoPath}" matches task.forbidden_files pattern "${taskForbidden}"`);
        }

        const taskAllowed = matchesAnyPattern(repoPath, task.allowed_files || []);
        if (!taskAllowed) {
            errors.push(`changed file "${repoPath}" is outside task.allowed_files`);
        }

        const sharedAllowed = matchesAnyPattern(repoPath, contracts.fileBoundaries.shared_allowed_patterns || []);
        if (!sharedAllowed) {
            errors.push(`changed file "${repoPath}" is outside shared_allowed_patterns`);
        }

        const modeForbidden = matchesAnyPattern(repoPath, modeRules.forbidden_patterns || []);
        if (modeForbidden) {
            errors.push(`changed file "${repoPath}" matches mode-forbidden pattern "${modeForbidden}"`);
        }

        const modeAllowed = matchesAnyPattern(repoPath, modeRules.allowed_patterns || []);
        if (!modeAllowed) {
            errors.push(`changed file "${repoPath}" is outside allowed patterns for mode "${task.mode}"`);
        }

        if (task.mode !== 'system_update' && !surfaceOwnedFiles.has(repoPath)) {
            errors.push(`changed file "${repoPath}" is not owned by surface "${surface.id}"`);
        }

        if (isUiOnlyTask(task)) {
            const dependencyForbidden = matchesAnyPattern(
                repoPath,
                contracts.styleGuard.dependency_policy?.forbidden_manifest_files || [],
            );
            if (dependencyForbidden) {
                errors.push(`UI-only task cannot change manifest or lockfile "${repoPath}"`);
            }
        }
    }

    return errors;
}

function isFrontendTextFile(repoPath) {
    const normalized = repoPath.replace(/\\/g, '/');
    if (
        !(
            normalized.startsWith('apps/web/app/')
            || normalized.startsWith('apps/web/components/')
            || normalized.startsWith('apps/web/i18n/')
            || normalized.startsWith('apps/web/dev-fixtures/')
        )
    ) {
        return false;
    }
    return /\.(tsx|ts|jsx|js|css)$/i.test(normalized);
}

function getHeadFileContent(repoPath) {
    const result = spawnSync(
        'git',
        ['show', `HEAD:${repoPath}`],
        {
            cwd: REPO_ROOT,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
        },
    );
    if (result.status !== 0) {
        return '';
    }
    return result.stdout;
}

function getCurrentFileContent(repoPath) {
    const absolutePath = path.join(REPO_ROOT, repoPath);
    return fs.readFileSync(absolutePath, 'utf8');
}

function getAddedLines(repoPath) {
    const currentContent = getCurrentFileContent(repoPath);
    const baseContent = getHeadFileContent(repoPath);
    const currentLines = currentContent.split(/\r?\n/);
    const baseSet = new Set(baseContent.split(/\r?\n/));
    return currentLines.filter((line) => !baseSet.has(line));
}

function containsCaseInsensitive(haystack, needle) {
    return haystack.toLowerCase().includes(String(needle).toLowerCase());
}

function scanForLiteralList(sourceName, textLines, literals, kind, errors) {
    const loweredLines = textLines.map((line) => line.toLowerCase());
    for (const literal of literals || []) {
        const lowered = String(literal).toLowerCase();
        const lineIndex = loweredLines.findIndex((line) => line.includes(lowered));
        if (lineIndex >= 0) {
            errors.push(`${sourceName}: ${kind} "${literal}" found in added content`);
        }
    }
}

function buildFieldRegexVariants(fieldName) {
    const escaped = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const humanized = fieldName.replace(/_/g, ' ');
    const escapedHumanized = humanized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (['age', 'height', 'income', 'religion', 'politics'].includes(fieldName)) {
        return [
            new RegExp(`['"\`]${escaped}['"\`]`, 'i'),
            new RegExp(`['"\`]${fieldName[0].toUpperCase()}${fieldName.slice(1)}['"\`]`, 'i'),
            new RegExp(`label\\s*:\\s*['"\`]${fieldName[0].toUpperCase()}${fieldName.slice(1)}['"\`]`, 'i'),
            new RegExp(`title\\s*[:=]\\s*['"\`]${fieldName[0].toUpperCase()}${fieldName.slice(1)}['"\`]`, 'i'),
        ];
    }
    return [
        new RegExp(escaped, 'i'),
        new RegExp(escapedHumanized, 'i'),
    ];
}

function scanTaskText(task, semanticGuard) {
    const errors = [];
    const taskTextLines = [
        `goal: ${task.goal || ''}`,
        ...(task.acceptance_checks || []).map((entry) => `acceptance_checks: ${entry}`),
        ...(task.reviewer_notes || []).map((entry) => `reviewer_notes: ${entry}`),
    ];

    scanForLiteralList(
        'task envelope',
        taskTextLines,
        semanticGuard.copy_rules?.banned_user_facing_terms || [],
        'banned user-facing term',
        errors,
    );
    scanForLiteralList(
        'task envelope',
        taskTextLines,
        semanticGuard.copy_rules?.banned_user_facing_ctas || [],
        'banned CTA',
        errors,
    );
    scanForLiteralList(
        'task envelope',
        taskTextLines,
        semanticGuard.copy_rules?.ban_if_not_repo_backed || [],
        'unbacked claim',
        errors,
    );

    for (const pattern of semanticGuard.interaction_rules?.banned_patterns || []) {
        const variants = [pattern, pattern.replace(/_/g, ' '), pattern.replace(/_/g, '-')];
        scanForLiteralList('task envelope', taskTextLines, variants, 'banned interaction pattern', errors);
    }

    return errors;
}

function validateChangedFileSemanticAndStyle(task, contracts, actionableChangedFiles) {
    const errors = [];
    const authoritativeStyleSources = contracts.styleGuard.token_first_policy?.authoritative_style_sources || [];
    const modeRawLiteralPolicy = contracts.styleGuard.raw_literal_policy?.[task.mode] || {};
    const allowNewColors = modeRawLiteralPolicy.allow_new_color_literals === true;

    const colorLiteralRegex = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\(|hsla?\(|oklch\(/;
    const framerMotionRegex = /\bframer-motion\b|\bmotion\/react\b/;

    for (const repoPath of actionableChangedFiles) {
        if (!isFrontendTextFile(repoPath)) continue;

        const addedLines = getAddedLines(repoPath)
            .map((line) => line.trim())
            .filter(Boolean);
        if (addedLines.length === 0) continue;

        scanForLiteralList(
            repoPath,
            addedLines,
            contracts.semanticGuard.copy_rules?.banned_user_facing_terms || [],
            'banned user-facing term',
            errors,
        );
        scanForLiteralList(
            repoPath,
            addedLines,
            contracts.semanticGuard.copy_rules?.banned_user_facing_ctas || [],
            'banned CTA',
            errors,
        );
        scanForLiteralList(
            repoPath,
            addedLines,
            contracts.semanticGuard.copy_rules?.ban_if_not_repo_backed || [],
            'unbacked claim',
            errors,
        );

        for (const pattern of contracts.semanticGuard.interaction_rules?.banned_patterns || []) {
            const variants = [pattern, pattern.replace(/_/g, ' '), pattern.replace(/_/g, '-')];
            scanForLiteralList(repoPath, addedLines, variants, 'banned interaction pattern', errors);
        }

        for (const fieldName of contracts.semanticGuard.field_rules?.forbidden_unbacked_examples || []) {
            const regexes = buildFieldRegexVariants(fieldName);
            const lineIndex = addedLines.findIndex((line) => regexes.some((regex) => regex.test(line)));
            if (lineIndex >= 0) {
                errors.push(`${repoPath}: unbacked member field "${fieldName}" found in added content`);
            }
        }

        const isAuthoritativeStyleSource = matchesAnyPattern(repoPath, authoritativeStyleSources);
        if (!allowNewColors && !isAuthoritativeStyleSource) {
            const lineIndex = addedLines.findIndex((line) => colorLiteralRegex.test(line));
            if (lineIndex >= 0) {
                errors.push(`${repoPath}: raw color literal found outside authoritative style sources`);
            }
        }

        for (const effectPattern of contracts.styleGuard.forbidden_effect_patterns || []) {
            const lineIndex = addedLines.findIndex((line) => containsCaseInsensitive(line, effectPattern));
            if (lineIndex >= 0) {
                errors.push(`${repoPath}: forbidden style effect "${effectPattern}" found in added content`);
            }
        }

        const framerLine = addedLines.findIndex((line) => framerMotionRegex.test(line));
        if (framerLine >= 0) {
            errors.push(`${repoPath}: Framer Motion import or usage is not allowed by the current harness`);
        }
    }

    return errors;
}

function main() {
    try {
        const args = parseArgs(process.argv.slice(2));
        if (args.help) {
            printUsage();
            process.exit(0);
        }

        const contracts = loadContracts();
        const { task } = loadTask(args.task);
        const rawChangedInputs = loadChangedFileInputs(args);
        const changedFiles = classifyChangedFiles(rawChangedInputs);
        const validationMode = rawChangedInputs.length > 0 ? 'full-diff' : 'envelope-only';
        const envelopeErrors = [];
        const diffErrors = [];
        if (changedFiles.invalid.length > 0) {
            for (const invalidEntry of changedFiles.invalid) {
                diffErrors.push(`invalid changed-file input: ${invalidEntry}`);
            }
        }

        const taskEnvelope = validateTaskEnvelope(task, contracts);
        envelopeErrors.push(...taskEnvelope.errors);
        envelopeErrors.push(...scanTaskText(task, contracts.semanticGuard));

        if (validationMode === 'full-diff' && taskEnvelope.surface) {
            diffErrors.push(...validateChangedFiles(task, contracts, taskEnvelope.surface, changedFiles.actionable));
            diffErrors.push(...validateChangedFileSemanticAndStyle(task, contracts, changedFiles.actionable));
        }

        const errors = [...envelopeErrors, ...diffErrors];
        if (errors.length > 0) {
            console.error('FAIL frontend harness validation');
            console.error(`validation_mode: ${validationMode}`);
            if (envelopeErrors.length > 0) {
                console.error('envelope_violations:');
                for (const error of envelopeErrors) {
                    console.error(`- ${error}`);
                }
            }
            if (diffErrors.length > 0) {
                console.error('changed_file_violations:');
                for (const error of diffErrors) {
                    console.error(`- ${error}`);
                }
            }
            process.exit(1);
        }

        console.log('PASS frontend harness validation');
        console.log(`validation_mode: ${validationMode}`);
        console.log(`task_id: ${task.task_id}`);
        console.log(`surface: ${task.surface_id}`);
        console.log(`mode: ${task.mode}`);
        if (validationMode === 'envelope-only') {
            console.log('changed_files: not provided');
        } else {
            console.log(`changed_files: ${changedFiles.actionable.length} actionable, ${changedFiles.ignored.length} ignored`);
        }
        if (validationMode === 'full-diff' && changedFiles.ignored.length > 0) {
            const ignoredSummary = changedFiles.ignored.map((entry) => entry.path).join(', ');
            console.log(`ignored_generated_artifacts: ${ignoredSummary}`);
        }
    } catch (error) {
        console.error('FAIL frontend harness validation');
        console.error(`- ${error instanceof Error ? error.message : String(error)}`);
        console.error('');
        printUsage();
        process.exit(1);
    }
}

main();
