export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

export function asNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

export function normalizeTagList(value) {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item) => typeof item === 'string' && item.trim().length > 0)
        .map((item) => item.trim());
}

export function intersectionSize(left, right) {
    if (left.length === 0 || right.length === 0) return 0;
    const set = new Set(left.map((item) => item.toLowerCase()));
    let count = 0;
    for (const item of right) {
        if (set.has(String(item).toLowerCase())) count += 1;
    }
    return count;
}

export function pairKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
