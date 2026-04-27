import {
    formatContractIdentifierLabel,
    normalizeStatusCopyLocale,
    type DisplayAudience,
    type StatusCopyLocale,
} from '../contracts/status-copy.ts';

export type { DisplayAudience };

type IdentifierKind =
    | 'hash'
    | 'commit'
    | 'build'
    | 'packet'
    | 'contract'
    | 'receipt'
    | 'support';

type RevealMode = 'full' | 'truncated';

type MaskInternalIdentifierOptions = {
    kind: IdentifierKind;
    locale?: string;
    audience?: DisplayAudience;
    reveal?: RevealMode;
};

type ReferenceOptions = {
    audience?: DisplayAudience;
    reveal?: RevealMode;
};

const MASK_COPY: Record<StatusCopyLocale, Record<string, string>> = {
    en: {
        buildReference: 'Build reference available to support',
        contractReference: 'Contract reference on file',
        evidenceHash: 'Evidence hash on file',
        packetReference: 'Packet reference available to support',
        recordReference: 'Record reference on file',
        supportReference: 'Support reference on file',
        timestampReference: 'Recorded time on file',
        confidenceMissing: 'Confidence not recorded',
        confidenceHigh: 'High confidence',
        confidenceMedium: 'Moderate confidence',
        confidenceReview: 'Needs human review',
    },
    ko: {
        buildReference: '지원용 빌드 참조 보관됨',
        contractReference: '계약 참조가 보관됨',
        evidenceHash: '증거 해시 보관됨',
        packetReference: '지원용 패킷 참조 보관됨',
        recordReference: '기록 참조가 보관됨',
        supportReference: '지원 참조가 보관됨',
        timestampReference: '기록 시각이 보관됨',
        confidenceMissing: '신뢰도 기록 없음',
        confidenceHigh: '높은 신뢰도',
        confidenceMedium: '중간 신뢰도',
        confidenceReview: '인간 검토 필요',
    },
};

function isOrdinaryAudience(audience?: DisplayAudience): boolean {
    return (audience || 'ordinary') === 'ordinary';
}

function normalizeValue(value: string | number | Date | null | undefined): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'number') return String(value);
    return value || '';
}

function truncateValue(value: string, visible = 6): string {
    if (value.length <= visible * 2 + 3) return value;
    return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

function revealValue(value: string | number | Date | null | undefined, reveal: RevealMode = 'truncated'): string {
    const normalized = normalizeValue(value);
    if (!normalized) return '';
    return reveal === 'full' ? normalized : truncateValue(normalized);
}

function copy(locale: StatusCopyLocale, key: keyof typeof MASK_COPY.en): string {
    return MASK_COPY[locale][key];
}

export function formatSupportReference(
    value: string | number | null | undefined,
    locale?: string,
    options?: ReferenceOptions,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (isOrdinaryAudience(options?.audience)) {
        return copy(normalizedLocale, 'supportReference');
    }
    return revealValue(value, options?.reveal);
}

export function maskInternalIdentifier(
    value: string | number | null | undefined,
    options: MaskInternalIdentifierOptions,
): string {
    const locale = normalizeStatusCopyLocale(options.locale);
    switch (options.kind) {
        case 'hash':
            return formatHashReference(value, locale, options.audience, options.reveal);
        case 'commit':
            return formatCommitReference(value, locale, options.audience, options.reveal);
        case 'build':
            return formatBuildReference(value, locale, options.audience, options.reveal);
        case 'packet':
            return formatPacketReference(value, locale, options.audience, options.reveal);
        case 'contract':
            return formatContractReference(value, locale, options.audience, options.reveal);
        case 'receipt':
            return formatReceiptReference(value, locale, options.audience, options.reveal);
        case 'support':
            return formatSupportReference(value, locale, {
                audience: options.audience,
                reveal: options.reveal,
            });
        default:
            return formatSupportReference(value, locale, {
                audience: options.audience,
                reveal: options.reveal,
            });
    }
}

export function formatHashReference(
    value: string | number | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
    reveal?: RevealMode,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (isOrdinaryAudience(audience)) {
        return copy(normalizedLocale, 'evidenceHash');
    }
    return revealValue(value, reveal);
}

export function formatCommitReference(
    value: string | number | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
    reveal?: RevealMode,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (isOrdinaryAudience(audience)) {
        return copy(normalizedLocale, 'buildReference');
    }
    return revealValue(value, reveal);
}

export function formatBuildReference(
    value: string | number | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
    reveal?: RevealMode,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (isOrdinaryAudience(audience)) {
        return copy(normalizedLocale, 'buildReference');
    }
    return revealValue(value, reveal);
}

export function formatPacketReference(
    value: string | number | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
    reveal?: RevealMode,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (isOrdinaryAudience(audience)) {
        return copy(normalizedLocale, 'packetReference');
    }
    return revealValue(value, reveal);
}

export function formatContractReference(
    value: string | number | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
    reveal?: RevealMode,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    const normalizedValue = normalizeValue(value);
    if (isOrdinaryAudience(audience)) {
        return formatContractIdentifierLabel(normalizedValue, normalizedLocale);
    }
    return revealValue(normalizedValue, reveal);
}

export function formatReceiptReference(
    value: string | number | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
    reveal?: RevealMode,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (isOrdinaryAudience(audience)) {
        return copy(normalizedLocale, 'recordReference');
    }
    return revealValue(value, reveal);
}

export function formatConfidenceForDisplay(
    value: string | number | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (value === null || typeof value === 'undefined' || value === '') {
        return copy(normalizedLocale, 'confidenceMissing');
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
        return copy(normalizedLocale, 'confidenceMissing');
    }
    if (!isOrdinaryAudience(audience)) {
        return parsed.toFixed(2);
    }
    if (parsed >= 0.9) {
        return copy(normalizedLocale, 'confidenceHigh');
    }
    if (parsed >= 0.7) {
        return copy(normalizedLocale, 'confidenceMedium');
    }
    return copy(normalizedLocale, 'confidenceReview');
}

export function formatTimestampForDisplay(
    value: string | number | Date | null | undefined,
    locale?: string,
    audience?: DisplayAudience,
): string {
    const normalizedLocale = normalizeStatusCopyLocale(locale);
    if (!isOrdinaryAudience(audience)) {
        return normalizeValue(value);
    }
    const date = value instanceof Date ? value : new Date(normalizeValue(value));
    if (Number.isNaN(date.getTime())) {
        return copy(normalizedLocale, 'timestampReference');
    }
    return new Intl.DateTimeFormat(normalizedLocale === 'ko' ? 'ko-KR' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date);
}
