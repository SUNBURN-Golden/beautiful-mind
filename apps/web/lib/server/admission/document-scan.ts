import { maskValue } from './attestation.ts';
import type { AdmissionDocumentType } from './constants.ts';

export type AdmissionScanResult = {
    aiResult: string;
    aiConfidence: number;
    processingStatus: 'AI_PASSED' | 'AI_REJECTED' | 'RESUBMIT_REQUIRED';
    finalResult: 'PENDING' | 'RESUBMIT_REQUIRED';
    extractedClaims: Record<string, unknown>;
};

function normalizeDocumentText(buffer: Buffer): string {
    return buffer.toString('utf8').replace(/\u0000/g, ' ').replace(/\s+/g, ' ').slice(0, 12_000);
}

function detectHighlySensitivePII(text: string): string | null {
    if (/\b\d{6}-\d{7}\b/.test(text)) {
        return 'RRN_DASH_PATTERN';
    }
    if (/\b\d{13}\b/.test(text)) {
        return 'RRN_COMPACT_PATTERN';
    }
    return null;
}

function hasAnomalyKeyword(text: string): boolean {
    return /(ANOMALY|SUSPICIOUS|MISMATCH|UNREADABLE|BLURRY)/i.test(text);
}

function hasForgeryKeyword(text: string): boolean {
    return /(FORGED|FAKE_DOC|TAMPERED)/i.test(text);
}

function inferIncomeBand(text: string): string {
    if (/1[0-9]{2},?[0-9]{3},?[0-9]{3}|100,000,000/.test(text)) return '100M_PLUS';
    if (/8[0-9],?[0-9]{3},?[0-9]{3}|80,000,000/.test(text)) return '80M_100M';
    if (/6[0-9],?[0-9]{3},?[0-9]{3}|60,000,000/.test(text)) return '60M_80M';
    if (/4[0-9],?[0-9]{3},?[0-9]{3}|40,000,000/.test(text)) return '40M_60M';
    return 'UNDER_40M_OR_UNCONFIRMED';
}

export function scanAdmissionDocument(buffer: Buffer, documentType: AdmissionDocumentType): AdmissionScanResult {
    const text = normalizeDocumentText(buffer);
    const piiReason = detectHighlySensitivePII(text);
    if (piiReason) {
        return {
            aiResult: `AUTO_REJECT:${piiReason}`,
            aiConfidence: 1,
            processingStatus: 'RESUBMIT_REQUIRED',
            finalResult: 'RESUBMIT_REQUIRED',
            extractedClaims: {},
        };
    }

    if (hasAnomalyKeyword(text)) {
        return {
            aiResult: `ANOMALY:LOW_CONFIDENCE:${documentType}`,
            aiConfidence: 0.34,
            processingStatus: 'AI_PASSED',
            finalResult: 'PENDING',
            extractedClaims: {},
        };
    }

    if (hasForgeryKeyword(text)) {
        return {
            aiResult: `AUTO_REJECT:FORGED:${documentType}`,
            aiConfidence: 0.05,
            processingStatus: 'AI_REJECTED',
            finalResult: 'PENDING',
            extractedClaims: {},
        };
    }

    if (documentType === 'GRADUATION_CERTIFICATE') {
        const normalizedSchool = (() => {
            const hit = text.match(/([A-Za-z0-9\u3131-\uD79D\s]{2,40})(대학교|대학|고등학교|UNIVERSITY|COLLEGE)/i);
            return hit?.[0] ? maskValue(hit[0].trim(), 2) : null;
        })();
        return {
            aiResult: 'AI_PASS:GRADUATION_CERTIFICATE',
            aiConfidence: 0.76,
            processingStatus: 'AI_PASSED',
            finalResult: 'PENDING',
            extractedClaims: {
                school_name_masked: normalizedSchool,
                graduate_verified: true,
            },
        };
    }

    if (documentType === 'INCOME_CERTIFICATE') {
        const currentYear = new Date().getUTCFullYear();
        const yearHit = text.match(/\b(20[0-3][0-9])\b/);
        const year = yearHit ? Number.parseInt(yearHit[1], 10) : currentYear - 1;
        return {
            aiResult: 'AI_PASS:INCOME_CERTIFICATE',
            aiConfidence: 0.73,
            processingStatus: 'AI_PASSED',
            finalResult: 'PENDING',
            extractedClaims: {
                income_year: year,
                income_band: inferIncomeBand(text),
                income_verified: true,
            },
        };
    }

    if (documentType === 'MARRIAGE_CERTIFICATE') {
        const married = /(혼인|MARRIAGE|MARRIED)/i.test(text);
        const divorced = /(이혼|DIVORCE|DIVORCED)/i.test(text);
        return {
            aiResult: 'AI_PASS:MARRIAGE_CERTIFICATE',
            aiConfidence: 0.71,
            processingStatus: 'AI_PASSED',
            finalResult: 'PENDING',
            extractedClaims: {
                marital_status: married ? 'MARRIED' : 'UNCONFIRMED',
                divorced_flag: divorced,
                marriage_verified: true,
            },
        };
    }

    const hasChildren = /(자녀|CHILD|CHILDREN|녀|남)/i.test(text);
    return {
        aiResult: 'AI_PASS:FAMILY_RELATION_CERTIFICATE',
        aiConfidence: 0.69,
        processingStatus: 'AI_PASSED',
        finalResult: 'PENDING',
        extractedClaims: {
            has_children: hasChildren,
            children_count_band: hasChildren ? '1_OR_MORE' : 'NONE_OR_UNCONFIRMED',
            family_relation_verified: true,
        },
    };
}
