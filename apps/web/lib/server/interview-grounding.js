function normalizeText(input) {
    return String(input ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenize(input) {
    return normalizeText(input)
        .split(' ')
        .filter((token) => token.length >= 2);
}

function collectStringValues(input, out, depth = 0) {
    if (depth > 3 || input === null || input === undefined) return;
    if (typeof input === 'string') {
        const value = input.trim();
        if (value.length > 0) out.push(value);
        return;
    }
    if (typeof input === 'number' || typeof input === 'boolean') {
        out.push(String(input));
        return;
    }
    if (Array.isArray(input)) {
        for (const item of input) {
            collectStringValues(item, out, depth + 1);
        }
        return;
    }
    if (typeof input === 'object') {
        for (const value of Object.values(input)) {
            collectStringValues(value, out, depth + 1);
        }
    }
}

function buildGroundingCorpus(transcript, verifiedProfile) {
    const transcriptUserLines = transcript
        .filter((item) => item.role === 'user' && typeof item.content === 'string' && item.content.trim().length > 0)
        .map((item) => item.content.trim());

    const verifiedStrings = [];
    collectStringValues(verifiedProfile, verifiedStrings);

    const evidenceSamples = [...transcriptUserLines.slice(-8), ...verifiedStrings.slice(0, 8)].slice(0, 12);
    const corpusTextRaw = [...transcriptUserLines, ...verifiedStrings].join(' ');
    const normalizedText = normalizeText(corpusTextRaw);
    const tokenSet = new Set(tokenize(corpusTextRaw));

    return { normalizedText, tokenSet, evidenceSamples };
}

function collectClaimCandidates(node) {
    const claims = [];
    const add = (value) => {
        if (typeof value === 'string' && value.trim().length > 1) {
            claims.push(value.trim());
        }
    };

    const raw = node.raw_preferences || {};
    const books = Array.isArray(raw.books) ? raw.books : [];
    const movies = Array.isArray(raw.movies) ? raw.movies : [];
    const exercise = Array.isArray(raw.exercise) ? raw.exercise : [];
    const mbti = raw.mbti;
    const derived = node.derived_traits || {};

    for (const item of books) {
        if (item && typeof item === 'object') {
            add(item.title);
            if (Array.isArray(item.why_tags)) {
                for (const tag of item.why_tags) add(tag);
            }
        }
    }
    for (const item of movies) {
        if (item && typeof item === 'object') {
            add(item.title);
            if (Array.isArray(item.why_tags)) {
                for (const tag of item.why_tags) add(tag);
            }
        }
    }
    for (const item of exercise) {
        if (item && typeof item === 'object') {
            add(item.modality);
            if (Array.isArray(item.why_tags)) {
                for (const tag of item.why_tags) add(tag);
            }
        }
    }
    if (mbti && typeof mbti === 'object') {
        if (mbti.self_reported === true) add(mbti.type);
    }
    if (Array.isArray(derived.vibe_tags)) {
        for (const tag of derived.vibe_tags) add(tag);
    }

    return [...new Set(claims)].slice(0, 40);
}

function isClaimSupported(claim, normalizedCorpus, tokenSet) {
    const normalizedClaim = normalizeText(claim);
    if (!normalizedClaim || normalizedClaim.length < 2) return true;
    if (normalizedCorpus.includes(normalizedClaim)) return true;

    const tokens = tokenize(claim);
    if (tokens.length === 0) return true;
    let hit = 0;
    for (const token of tokens) {
        if (tokenSet.has(token)) hit += 1;
    }
    const ratio = hit / tokens.length;
    const threshold = tokens.length <= 2 ? 1 : 0.6;
    return ratio >= threshold;
}

export function assessGrounding({ node, transcript, verifiedProfile }) {
    const claims = collectClaimCandidates(node);
    const { normalizedText, tokenSet, evidenceSamples } = buildGroundingCorpus(transcript, verifiedProfile);
    let supported = 0;
    const unsupportedClaims = [];

    for (const claim of claims) {
        if (isClaimSupported(claim, normalizedText, tokenSet)) {
            supported += 1;
        } else {
            unsupportedClaims.push(claim);
        }
    }

    const claimCount = claims.length;
    const coverage = claimCount === 0 ? 1 : supported / claimCount;
    return {
        claim_count: claimCount,
        supported_count: supported,
        unsupported_count: unsupportedClaims.length,
        coverage: Number(coverage.toFixed(3)),
        unsupported_claims: unsupportedClaims.slice(0, 8),
        evidence_samples: evidenceSamples,
    };
}

export function applyGroundingDecisionGuard(node, grounding) {
    const groundingRiskFlags = [];
    if (grounding.claim_count >= 3 && grounding.coverage < 0.65) {
        groundingRiskFlags.push('LOW_GROUNDING_COVERAGE');
    }
    if (grounding.unsupported_count >= 2) {
        groundingRiskFlags.push('UNSUPPORTED_CLAIMS_DETECTED');
    }

    let resolvedNode = {
        ...node,
        risk_flags: Array.from(new Set([...(node.risk_flags || []), ...groundingRiskFlags])),
    };
    if (groundingRiskFlags.length > 0 && resolvedNode.decision === 'PASS') {
        resolvedNode = { ...resolvedNode, decision: 'REVIEW' };
    }
    if (grounding.coverage < 0.5) {
        resolvedNode = {
            ...resolvedNode,
            score: Math.min(Number(resolvedNode.score ?? 0), 55),
            absolute_score: Math.min(Number(resolvedNode.absolute_score ?? 0), 55),
        };
    }

    return { resolvedNode, groundingRiskFlags };
}

export const __groundingInternal = {
    normalizeText,
    tokenize,
    collectStringValues,
    buildGroundingCorpus,
    collectClaimCandidates,
    isClaimSupported,
};
