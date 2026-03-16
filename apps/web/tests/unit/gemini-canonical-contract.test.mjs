import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const WEB_ROOT = process.cwd();
const GEMINI_TS_PATH = path.join(WEB_ROOT, 'lib/gemini.ts');
const GEMINI_JS_PATH = path.join(WEB_ROOT, 'lib/gemini.js');

function walkFiles(dir, out = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory() && ['node_modules', '.next', 'playwright-report', 'test-results'].includes(entry.name)) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(fullPath, out);
            continue;
        }

        if (!/\.(ts|tsx|js|mjs)$/.test(entry.name)) {
            continue;
        }

        out.push(fullPath);
    }

    return out;
}

test('canonical Gemini module is TypeScript-only', () => {
    assert.equal(fs.existsSync(GEMINI_TS_PATH), true);
    assert.equal(fs.existsSync(GEMINI_JS_PATH), false);
});

test('canonical Gemini module exports expected schemas and helpers', async () => {
    const mod = await import('../../lib/gemini.ts');

    assert.equal(typeof mod.getGeminiClient, 'function');
    assert.equal(typeof mod.generateContentWithRetry, 'function');
    assert.equal(typeof mod.systemInstruction, 'string');

    assert.equal(mod.finalizeSchema?.type, 'OBJECT');
    assert.equal(mod.nextQuestionSchema?.type, 'OBJECT');
    assert.equal(mod.evaluateMatchSchema?.type, 'OBJECT');

    assert.ok(mod.finalizeSchema?.properties?.decision);
    assert.ok(mod.nextQuestionSchema?.properties?.next_question);
    assert.ok(mod.evaluateMatchSchema?.properties?.predicted_score);
});

test('canonical retry/fallback policy stays in one source', () => {
    const source = fs.readFileSync(GEMINI_TS_PATH, 'utf8');
    assert.equal(source.includes('DEFAULT_MODEL_CANDIDATES'), true);
    assert.equal(source.includes('gemini-2.5-flash-lite'), true);
    assert.equal(source.includes('gemini-2.0-flash'), true);
    assert.equal(source.includes('modelUsed'), true);
});

test('interview routes reference canonical Gemini path only', () => {
    const interviewRoutePath = path.join(WEB_ROOT, 'app/api/interview/route.ts');
    const nextRoutePath = path.join(WEB_ROOT, 'app/api/interview/next/route.ts');

    const interviewRouteSource = fs.readFileSync(interviewRoutePath, 'utf8');
    const nextRouteSource = fs.readFileSync(nextRoutePath, 'utf8');

    assert.equal(interviewRouteSource.includes("from '@/lib/gemini'"), true);
    assert.equal(nextRouteSource.includes("from '@/lib/gemini'"), true);
    assert.equal(interviewRouteSource.includes('function getGeminiClient()'), false);
});

test('app runtime does not instantiate GoogleGenAI outside canonical module', () => {
    const sourceRoots = [
        path.join(WEB_ROOT, 'app'),
        path.join(WEB_ROOT, 'lib'),
    ];
    const sourceFiles = sourceRoots.flatMap((root) => walkFiles(root));

    for (const filePath of sourceFiles) {
        const source = fs.readFileSync(filePath, 'utf8');
        const isCanonical = path.normalize(filePath) === path.normalize(GEMINI_TS_PATH);
        if (isCanonical) {
            continue;
        }

        assert.equal(
            source.includes('new GoogleGenAI('),
            false,
            `Found direct Gemini client creation in ${filePath}`
        );
        assert.equal(
            source.includes("from '@google/genai'"),
            false,
            `Found direct @google/genai import in ${filePath}`
        );
    }
});
