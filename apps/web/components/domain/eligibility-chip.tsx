import type { AppLocale } from '@/i18n/config';
import {
    getEligibilityChipCopy,
    type EligibilityChipKind,
} from '@/i18n/domain/eligibility-chip';
import { cn } from '@/lib/utils';

export type { EligibilityChipKind } from '@/i18n/domain/eligibility-chip';

export type EligibilityChipState = 'met' | 'pending' | 'locked';

type EligibilityChipProps = {
    kind: EligibilityChipKind;
    state: EligibilityChipState;
    locale: AppLocale;
    className?: string;
};

const ELIGIBILITY_STATE_CLASS: Record<EligibilityChipState, string> = {
    met: 'sb-vocab-chip-met',
    pending: 'sb-vocab-chip-pending',
    locked: 'sb-vocab-chip-locked',
};

export function EligibilityChip({
    kind,
    state,
    locale,
    className,
}: EligibilityChipProps) {
    const copy = getEligibilityChipCopy(locale);

    return (
        <span className={cn('sb-vocab-chip', ELIGIBILITY_STATE_CLASS[state], className)} lang={locale}>
            <span>{copy.kinds[kind]}</span>
            <span className="sb-type-meta whitespace-nowrap">{copy.states[state]}</span>
        </span>
    );
}
