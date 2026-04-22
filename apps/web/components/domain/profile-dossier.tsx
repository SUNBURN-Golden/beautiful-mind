import type { AppLocale } from '@/i18n/config';
import { getProfileDossierCopy } from '@/i18n/domain/profile-dossier';
import { cn } from '@/lib/utils';
import { EligibilityChip, type EligibilityChipKind, type EligibilityChipState } from './eligibility-chip';
import { TrustRibbon, type TrustRibbonEvidence, type TrustRibbonLevel } from './trust-ribbon';

// NOTE: minimal-only in Phase 7.
// The extended mode exists only to reserve vocabulary.
// Richer dossier scope is an undecided product question.
// Do NOT populate written answers, photos, activity signals, or conversation snippets here.
// If you think this file should become richer, stop and ask the human.

export type ProfileDossierEligibility = {
    kind: EligibilityChipKind;
    state: EligibilityChipState;
};

export type ProfileDossierReference = {
    label: string;
    value: string;
};

export type ProfileDossierRecord = {
    displayName: string;
    jurisdiction: string;
    standingNote: string;
    trustLevel: TrustRibbonLevel;
    trustEvidence?: TrustRibbonEvidence[];
    eligibility: ProfileDossierEligibility[];
    references: ProfileDossierReference[];
};

type ProfileDossierProps = {
    locale: AppLocale;
    profile: ProfileDossierRecord;
    mode?: 'minimal' | 'extended';
    className?: string;
};

export function ProfileDossier({
    locale,
    profile,
    mode = 'minimal',
    className,
}: ProfileDossierProps) {
    const copy = getProfileDossierCopy(locale);

    if (mode === 'extended') {
        // TODO: Reserve the extended dossier branch until product scope is decided.
        return null;
    }

    return (
        <section className={cn('sb-space-warm rounded-[1.5rem] p-5 sm:p-6', className)} lang={locale}>
            <div className="space-y-5">
                <header className="space-y-2">
                    <span className="sb-vocab-badge">{copy.badge}</span>
                    <h2 className="sb-type-display-lg">
                        {copy.title}
                    </h2>
                    <p className="sb-type-body-lg max-w-2xl">
                        {copy.description}
                    </p>
                </header>

                <div className="sb-space-document rounded-[1rem] p-4">
                    <div className="space-y-2">
                        <p className="sb-type-headline">
                            {profile.displayName}
                        </p>
                        <p className="sb-type-meta">
                            {copy.labels.jurisdiction}: {profile.jurisdiction}
                        </p>
                        <p className="sb-type-body">{profile.standingNote}</p>
                        <p className="sb-type-meta">{copy.labels.minimalOnly}</p>
                    </div>
                </div>

                <TrustRibbon
                    locale={locale}
                    level={profile.trustLevel}
                    evidence={profile.trustEvidence}
                />

                <div className="space-y-3">
                    <p className="sb-vocab-label">{copy.labels.eligibilityTitle}</p>
                    {profile.eligibility.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {profile.eligibility.map((item) => (
                                <EligibilityChip
                                    key={`${item.kind}-${item.state}`}
                                    locale={locale}
                                    kind={item.kind}
                                    state={item.state}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="sb-type-meta">{copy.labels.emptyEligibility}</p>
                    )}
                </div>

                <div className="space-y-3">
                    <p className="sb-vocab-label">{copy.labels.referencesTitle}</p>
                    <dl className="grid gap-3 sm:grid-cols-2">
                        {profile.references.map((reference) => (
                            <div key={`${reference.label}-${reference.value}`} className="sb-space-document rounded-[1rem] p-4">
                                <dt className="sb-vocab-label">{reference.label}</dt>
                                <dd className="sb-type-hash mt-2">{reference.value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </div>
        </section>
    );
}
