import fs from 'node:fs';
import path from 'node:path';
import * as dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WEB_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..', '..');

const DEFAULT_MODEL = 'gemini-2.5-flash';
const DEFAULT_POLICY_PATH = path.join(WEB_ROOT, 'autoresearch', 'CANDIDATE_PROPOSER_POLICY.md');
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const GEMINI_RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        summary: { type: 'STRING' },
        changes: {
            type: 'ARRAY',
            items: {
                type: 'OBJECT',
                properties: {
                    file: { type: 'STRING' },
                    find: { type: 'STRING' },
                    replace: { type: 'STRING' },
                    rationale: { type: 'STRING' },
                },
                required: ['file', 'find', 'replace', 'rationale'],
            },
        },
    },
    required: ['summary', 'changes'],
};

loadProposerEnv();

function loadProposerEnv() {
    const envPaths = [
        path.join(REPO_ROOT, '.env.local'),
        path.join(WEB_ROOT, '.env.local'),
        path.join(REPO_ROOT, '.env.test.local'),
        path.join(WEB_ROOT, '.env.test.local'),
    ];

    for (const envPath of envPaths) {
        dotenv.config({ path: envPath, quiet: true });
    }
}

function parseArgs(argv) {
    const out = {
        model: DEFAULT_MODEL,
        policyPath: DEFAULT_POLICY_PATH,
        baselineMetric: null,
        threshold: null,
        note: '',
        payloadPath: null,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === '--model' && argv[index + 1]) {
            out.model = argv[index + 1];
            index += 1;
            continue;
        }
        if (token === '--policy' && argv[index + 1]) {
            out.policyPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === '--baseline-metric' && argv[index + 1]) {
            out.baselineMetric = Number(argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === '--threshold' && argv[index + 1]) {
            out.threshold = Number(argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === '--note' && argv[index + 1]) {
            out.note = argv[index + 1];
            index += 1;
            continue;
        }
        if (token === '--payload' && argv[index + 1]) {
            out.payloadPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
        }
    }

    return out;
}

function parsePolicyVersion(policyText) {
    const match = policyText.match(/^policy_version:\s*([^\s]+)\s*$/im);
    return match ? match[1] : 'unknown';
}

function readJsonIfExists(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function extractResponseText(payload) {
    if (typeof payload?.output_text === 'string' && payload.output_text.trim().length > 0) {
        return payload.output_text;
    }
    if (Array.isArray(payload?.output)) {
        for (const item of payload.output) {
            const content = Array.isArray(item?.content) ? item.content : [];
            for (const chunk of content) {
                if (typeof chunk?.text === 'string' && chunk.text.trim().length > 0) {
                    return chunk.text;
                }
            }
        }
    }
    throw new Error('OpenAI response did not include text output');
}

function getGeminiApiKey() {
    return process.env.GEMINI_API_KEY
        || process.env.GOOGLE_API_KEY
        || process.env.GOOGLE_GENERATIVE_AI_API_KEY
        || null;
}

function inferProposalProvider(model) {
    const normalized = String(model || '').trim().toLowerCase();
    if (normalized.startsWith('gemini-')) {
        return 'gemini';
    }
    return 'openai';
}

function assertProposalShape(proposal) {
    if (!proposal || typeof proposal !== 'object') {
        throw new Error('proposal is not an object');
    }
    if (typeof proposal.summary !== 'string' || proposal.summary.trim().length === 0) {
        throw new Error('proposal.summary is required');
    }
    if (!Array.isArray(proposal.changes) || proposal.changes.length < 1 || proposal.changes.length > 3) {
        throw new Error('proposal.changes must be an array of 1..3 items');
    }
    for (const [index, change] of proposal.changes.entries()) {
        if (!change || typeof change !== 'object') {
            throw new Error(`proposal.changes[${index}] is not an object`);
        }
        if (typeof change.file !== 'string' || change.file.trim().length === 0) {
            throw new Error(`proposal.changes[${index}].file is required`);
        }
        if (typeof change.find !== 'string' || change.find.length === 0) {
            throw new Error(`proposal.changes[${index}].find is required`);
        }
        if (typeof change.replace !== 'string') {
            throw new Error(`proposal.changes[${index}].replace must be string`);
        }
        if (typeof change.rationale !== 'string' || change.rationale.trim().length === 0) {
            throw new Error(`proposal.changes[${index}].rationale is required`);
        }
    }
}

async function callOpenAIForProposal(options) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required for proposal generation');
    }

    const body = {
        model: options.model,
        input: [
            {
                role: 'system',
                content: [
                    {
                        type: 'text',
                        text: `You are proposing exactly one safe hybrid-match candidate patch.\nFollow policy strictly:\n\n${options.policyText}`,
                    },
                ],
            },
            {
                role: 'user',
                content: [
                    {
                        type: 'text',
                        text: options.userPrompt,
                    },
                ],
            },
        ],
        text: {
            format: {
                type: 'json_schema',
                name: 'hybrid_match_candidate_patch',
                strict: true,
                schema: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['summary', 'changes'],
                    properties: {
                        summary: { type: 'string' },
                        changes: {
                            type: 'array',
                            minItems: 1,
                            maxItems: 3,
                            items: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['file', 'find', 'replace', 'rationale'],
                                properties: {
                                    file: { type: 'string' },
                                    find: { type: 'string' },
                                    replace: { type: 'string' },
                                    rationale: { type: 'string' },
                                },
                            },
                        },
                    },
                },
            },
        },
        max_output_tokens: 1800,
    };

    const response = await fetch(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error (${response.status}): ${errorText.slice(0, 500)}`);
    }

    const payload = await response.json();
    const text = extractResponseText(payload);
    const proposal = JSON.parse(text);
    assertProposalShape(proposal);

    return {
        proposal,
        responseId: payload?.id || null,
    };
}

async function callGeminiForProposal(options) {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
        throw new Error(
            'GEMINI_API_KEY (or GOOGLE_API_KEY/GOOGLE_GENERATIVE_AI_API_KEY) is required for Gemini proposal generation',
        );
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
        model: options.model,
        contents: options.userPrompt,
        config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: GEMINI_RESPONSE_SCHEMA,
            systemInstruction: `You are proposing exactly one safe hybrid-match candidate patch.\nFollow policy strictly:\n\n${options.policyText}`,
        },
    });

    const text = response?.text || '{}';
    const proposal = JSON.parse(text);
    assertProposalShape(proposal);

    return {
        proposal,
        responseId: response?.responseId || null,
    };
}

function buildUserPrompt(options) {
    return [
        'Goal: propose one small code patch to improve offline_hybrid_score.',
        `Baseline metric: ${options.baselineMetric}`,
        `Keep threshold: ${options.threshold}`,
        `Note: ${options.note || 'N/A'}`,
        'Your `find` snippet must be copied exactly from the current file contents, including whitespace and punctuation.',
        'Prefer a single focused change with a contiguous `find` snippet of 5-20 lines.',
        'Do not use ellipses, summaries, or invented context in `find` or `replace`.',
        '',
        'Allowed files:',
        ...options.allowedFiles.map((file) => `- ${file}`),
        '',
        'Recent experiment logs (JSONL tail):',
        options.recentResultsTail || '(none)',
        '',
        'Current allowed file contents:',
        JSON.stringify(options.fileContents, null, 2),
    ].join('\n');
}

export async function proposeHybridMatchCandidate(options) {
    const policyPath = options.policyPath
        ? path.resolve(process.cwd(), options.policyPath)
        : DEFAULT_POLICY_PATH;

    const policyText = fs.readFileSync(policyPath, 'utf8');
    const policyVersion = parsePolicyVersion(policyText);

    const userPrompt = buildUserPrompt({
        baselineMetric: options.baselineMetric,
        threshold: options.threshold,
        note: options.note,
        allowedFiles: options.allowedFiles,
        recentResultsTail: options.recentResultsTail,
        fileContents: options.fileContents,
    });

    const proposalModel = options.model || DEFAULT_MODEL;
    const provider = inferProposalProvider(proposalModel);
    const proposalCall = provider === 'gemini'
        ? callGeminiForProposal
        : callOpenAIForProposal;

    const { proposal, responseId } = await proposalCall({
        model: proposalModel,
        policyText,
        userPrompt,
    });

    return {
        proposal_source: provider === 'gemini' ? 'gemini_api' : 'openai_api',
        proposal_model: proposalModel,
        prompt_policy_path: path.relative(REPO_ROOT, policyPath).replace(/\\/g, '/'),
        prompt_policy_version: policyVersion,
        proposal_generated_at: new Date().toISOString(),
        proposal_response_id: responseId,
        proposal_summary: proposal.summary,
        proposal_changes: proposal.changes,
    };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const payloadFromFile = readJsonIfExists(args.payloadPath);
    const input = payloadFromFile || {
        model: args.model,
        policyPath: args.policyPath,
        baselineMetric: args.baselineMetric,
        threshold: args.threshold,
        note: args.note,
        allowedFiles: [],
        recentResultsTail: '',
        fileContents: {},
    };

    const result = await proposeHybridMatchCandidate(input);
    console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch((error) => {
        console.error(error?.message || error);
        process.exit(1);
    });
}
