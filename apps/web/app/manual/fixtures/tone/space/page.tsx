'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

const spaceCopy = {
    en: {
        badge: 'Tone fixture',
        title: 'Space catalog',
        description:
            'A page belongs to one room at a time: stage, warm, or document, each with a different signature logic.',
        backToTone: 'Tone index',
        cards: [
            {
                label: 'Stage',
                className: 'sb-space-stage-antiquarian',
                sentence: 'We write the terms before we exchange a word.',
            },
            {
                label: 'Warm',
                className: 'sb-space-warm',
                sentence: 'Your signature was received at 2:14 PM on the seventeenth of April.',
            },
            {
                label: 'Document',
                className: 'sb-space-document',
                sentence: 'This letter opens only when both signatures have arrived.',
            },
        ],
    },
    ko: {
        badge: '톤 픽스처',
        title: '공간 카탈로그',
        description:
            '한 페이지는 한 번에 하나의 방에 속합니다. stage, warm, document는 서로 다른 signature 규칙을 가집니다.',
        backToTone: '톤 목록',
        cards: [
            {
                label: 'Stage',
                className: 'sb-space-stage-antiquarian',
                sentence: '서로를 알기 전에, 먼저 약속을 적어둡니다.',
            },
            {
                label: 'Warm',
                className: 'sb-space-warm',
                sentence: '당신의 서명은 2026년 4월 17일 오후 2시 14분에 접수되었습니다.',
            },
            {
                label: 'Document',
                className: 'sb-space-document',
                sentence: '이 편지는 두 사람의 서명이 모두 도착했을 때에만 열립니다.',
            },
        ],
    },
} as const satisfies Record<
    AppLocale,
    {
        badge: string;
        title: string;
        description: string;
        backToTone: string;
        cards: Array<{
            label: string;
            className: 'sb-space-stage-antiquarian' | 'sb-space-warm' | 'sb-space-document';
            sentence: string;
        }>;
    }
>;

export default function ToneSpaceFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = spaceCopy[locale];
                const manualCopy = getManualFixturesCopy(locale);

                return (
                    <section className={`sb-locale-${locale} space-y-6`} lang={locale}>
                        <header className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                            <div className="flex flex-wrap gap-2">
                                <span className="sb-vocab-badge">{copy.badge}</span>
                                <Link
                                    href={withLangQuery('/manual/fixtures/tone', locale, FIXTURE_DEFAULT_LOCALE)}
                                    className="sb-vocab-link"
                                >
                                    {copy.backToTone}
                                </Link>
                                <Link
                                    href={withLangQuery('/manual/fixtures', locale, FIXTURE_DEFAULT_LOCALE)}
                                    className="sb-vocab-link"
                                >
                                    {manualCopy.scene.backToIndex}
                                </Link>
                            </div>
                            <h2 className="sb-type-display-lg mt-4">{copy.title}</h2>
                            <p className="sb-type-body-lg mt-2 max-w-3xl">{copy.description}</p>
                        </header>

                        <div className="space-y-4">
                            {copy.cards.map((card) => (
                                <article
                                    key={card.label}
                                    className={`${card.className} rounded-[1.5rem] border p-5 sm:p-6`}
                                    style={{
                                        borderColor:
                                            card.className === 'sb-space-stage-antiquarian'
                                                ? 'var(--sb-antiquarian-green)'
                                                : 'var(--sb-antiquarian-grey-soft)',
                                    }}
                                >
                                    <p className="sb-vocab-label">{card.label}</p>
                                    <p
                                        className="mt-4 max-w-3xl"
                                        style={{
                                            fontFamily:
                                                card.className === 'sb-space-document'
                                                    ? 'var(--sb-font-serif-reading)'
                                                    : 'var(--sb-font-serif-display)',
                                            fontSize:
                                                card.className === 'sb-space-document'
                                                    ? '1.02rem'
                                                    : '1.55rem',
                                            lineHeight:
                                                card.className === 'sb-space-document'
                                                    ? '1.72'
                                                    : '1.18',
                                            color:
                                                card.className === 'sb-space-stage-antiquarian'
                                                    ? 'var(--sb-stage-ink-strong)'
                                                    : 'var(--sb-text-warm-strong)',
                                        }}
                                    >
                                        {card.sentence}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
