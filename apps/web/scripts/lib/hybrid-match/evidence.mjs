import { asNumber, clamp } from './common.mjs';

function resolvePath(obj, pathStr) {
    if (!obj || !pathStr || typeof pathStr !== 'string') return undefined;
    const normalizedPath = pathStr.replace(/\[(\w+)\]/g, '.$1').replace(/^\./, '');
    const keys = normalizedPath.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return current;
}

function collectLeafPaths(source, prefix, out, depth = 0) {
    if (depth > 4 || source === null || source === undefined) return;
    if (typeof source === 'string' || typeof source === 'number' || typeof source === 'boolean') {
        out.push({ path: prefix, value: String(source) });
        return;
    }
    if (Array.isArray(source)) {
        if (source.length === 0) return;
        const primitiveItems = source
            .filter((item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean')
            .slice(0, 6)
            .map((item) => String(item).trim())
            .filter(Boolean);
        if (primitiveItems.length > 0 && prefix) {
            out.push({ path: prefix, value: primitiveItems.join(', ') });
        }
        source.slice(0, 4).forEach((item, index) => {
            collectLeafPaths(item, `${prefix}[${index}]`, out, depth + 1);
        });
        return;
    }
    if (typeof source === 'object') {
        const entries = Object.entries(source).slice(0, 20);
        for (const [key, value] of entries) {
            const nextPrefix = prefix ? `${prefix}.${key}` : key;
            collectLeafPaths(value, nextPrefix, out, depth + 1);
        }
    }
}

function normalizeText(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function extractTokens(value) {
    return normalizeText(value)
        .split(' ')
        .filter((token) => token.length >= 2);
}

function flattenComparable(value, depth = 0) {
    if (depth > 3 || value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    if (Array.isArray(value)) {
        return value.slice(0, 8).map((item) => flattenComparable(item, depth + 1)).join(' ');
    }
    if (typeof value === 'object') {
        return Object.values(value).slice(0, 12).map((item) => flattenComparable(item, depth + 1)).join(' ');
    }
    return '';
}

export function valueMatchScore(reportedValue, resolvedValue) {
    const reported = normalizeText(reportedValue);
    const resolved = normalizeText(flattenComparable(resolvedValue));
    if (!reported || !resolved) return 0;
    if (reported === resolved || resolved.includes(reported) || reported.includes(resolved)) return 1;
    const left = extractTokens(reported);
    const rightSet = new Set(extractTokens(resolved));
    if (left.length === 0 || rightSet.size === 0) return 0;
    let hit = 0;
    for (const token of left) {
        if (rightSet.has(token)) hit += 1;
    }
    return clamp(hit / left.length, 0, 1);
}

export function buildEvidenceAllowlist(targetTraits, targetVerified) {
    const raw = [];
    collectLeafPaths(targetTraits, 'traits_json', raw);
    collectLeafPaths(targetVerified, 'verified_feature', raw);

    const dedupMap = new Map();
    for (const item of raw) {
        if (!item.path || dedupMap.has(item.path)) continue;
        dedupMap.set(item.path, item.value);
    }
    const pathList = [...dedupMap.keys()].slice(0, 140);
    const pathSet = new Set(pathList);

    return {
        pathList,
        pathSet,
        promptList: pathList.slice(0, 90).join('\n'),
    };
}

export function validateEvidence(pred, targetTraits, targetVerified, allowlist) {
    const predicted = clamp(asNumber(pred?.predicted_score, 0), 1, 5);
    let confidence = clamp(asNumber(pred?.confidence, 0), 0, 1);
    const validEvidence = [];
    let dropped = 0;
    let valueMatchSum = 0;
    let lowMatchCount = 0;
    const seen = new Set();

    const rawEvidence = Array.isArray(pred?.evidence) ? pred.evidence.slice(0, 12) : [];
    for (const ev of rawEvidence) {
        if (!ev || typeof ev.field_path !== 'string' || typeof ev.why_tag !== 'string') {
            dropped += 1;
            continue;
        }
        if (!allowlist.pathSet.has(ev.field_path)) {
            dropped += 1;
            continue;
        }
        const sig = `${ev.field_path}|${String(ev.value ?? '')}`;
        if (seen.has(sig)) continue;
        seen.add(sig);

        let resolved = resolvePath(targetTraits, ev.field_path) ?? resolvePath(targetVerified, ev.field_path);
        if (resolved === undefined && ev.field_path.startsWith('verified_feature.')) {
            resolved = resolvePath(targetVerified, ev.field_path.replace('verified_feature.', ''));
        }
        if (resolved === undefined && ev.field_path.startsWith('traits_json.')) {
            resolved = resolvePath(targetTraits, ev.field_path.replace('traits_json.', ''));
        }

        if (resolved !== undefined) {
            const matchScore = valueMatchScore(ev.value ?? '', resolved);
            valueMatchSum += matchScore;
            if (matchScore <= 0.2) {
                lowMatchCount += 1;
            }
            validEvidence.push({
                field_path: ev.field_path,
                value: String(ev.value ?? ''),
                why_tag: ev.why_tag,
                match_score: Number(matchScore.toFixed(3)),
            });
        } else {
            dropped += 1;
        }
    }

    const rawCount = rawEvidence.length;
    const structuralValidity = rawCount > 0 ? validEvidence.length / rawCount : 0;
    const valueMatchAvg = validEvidence.length > 0 ? valueMatchSum / validEvidence.length : 0;
    let groundingScore = clamp((structuralValidity * 0.6) + (valueMatchAvg * 0.4), 0, 1);
    // Small evidence sets with a hard mismatch should not pass as "grounded".
    if (rawCount <= 2 && lowMatchCount > 0) {
        groundingScore = Math.min(groundingScore, clamp(valueMatchAvg - 0.01, 0, 1));
    }

    confidence = confidence * Math.pow(0.82, dropped);
    confidence = confidence * (0.65 + (groundingScore * 0.35));
    if (validEvidence.length === 0) confidence *= 0.25;
    if (validEvidence.length === 1) confidence *= 0.85;

    return {
        predicted_score: predicted,
        confidence: clamp(confidence, 0, 1),
        evidence: validEvidence,
        dropped,
        raw_evidence_count: rawCount,
        value_match_avg: Number(valueMatchAvg.toFixed(3)),
        grounding_score: Number(groundingScore.toFixed(3)),
    };
}
