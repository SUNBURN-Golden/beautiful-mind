import { createHash } from 'crypto';

export function maskValue(value: string, visibleTail = 4): string {
    if (value.length <= visibleTail) {
        return '*'.repeat(Math.max(2, value.length));
    }
    return `${'*'.repeat(Math.max(2, value.length - visibleTail))}${value.slice(-visibleTail)}`;
}

export function buildAttestationHash(
    userId: string,
    claimType: string,
    claimValueNormalized: Record<string, unknown>,
): string {
    return createHash('sha256')
        .update(`${userId}|${claimType}|${JSON.stringify(claimValueNormalized)}`)
        .digest('hex');
}
