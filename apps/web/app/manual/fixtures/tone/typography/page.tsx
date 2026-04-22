'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

const typographyCopy = {
    en: {
        badge: 'Tone fixture',
        title: 'Typography catalog',
        description:
            'The Antiquarian lock uses a classical serif for display and reading, with UI labels still reserved for the existing sans stack.',
        backToTone: 'Tone index',
        displayTitle: 'Serif display stack',
        readingTitle: 'Serif reading stack',
        comparisonTitle: 'Korean reading comparison',
        comparisonNote:
            'The Myeongjo reading stack carries document rhythm. Pretendard-style modern sans remains a UI label tool, not a reading substitute.',
        englishDisplay: 'We write the terms before we exchange a word.',
        koreanDisplay: '서로를 알기 전에, 먼저 약속을 적어둡니다.',
        englishReading:
            'This letter opens only when both signatures have arrived, and each sentence must read as a record rather than a prompt.',
        koreanReading:
            '이 편지는 두 사람의 서명이 모두 도착했을 때에만 열리며, 각 문장은 안내문이 아니라 기록처럼 읽혀야 합니다.',
        koreanSerifLabel: 'Myeongjo reading stack',
        koreanSansLabel: 'UI sans comparison',
        koreanComparison:
            '당신의 서명은 2026년 4월 17일 오후 2시 14분에 접수되었습니다.',
    },
    ko: {
        badge: '톤 픽스처',
        title: '타이포그래피 카탈로그',
        description:
            'Antiquarian 고정안은 디스플레이와 리딩에 고전적인 세리프를 쓰고, UI 라벨은 기존 sans 스택에 남겨둡니다.',
        backToTone: '톤 목록',
        displayTitle: '세리프 디스플레이 스택',
        readingTitle: '세리프 리딩 스택',
        comparisonTitle: '한글 리딩 비교',
        comparisonNote:
            'Myeongjo 리딩 스택은 문서의 호흡을 유지합니다. Pretendard 계열의 현대 sans는 UI 라벨 도구이지, 리딩 대체재가 아닙니다.',
        englishDisplay: 'We write the terms before we exchange a word.',
        koreanDisplay: '서로를 알기 전에, 먼저 약속을 적어둡니다.',
        englishReading:
            'This letter opens only when both signatures have arrived, and each sentence must read as a record rather than a prompt.',
        koreanReading:
            '이 편지는 두 사람의 서명이 모두 도착했을 때에만 열리며, 각 문장은 안내문이 아니라 기록처럼 읽혀야 합니다.',
        koreanSerifLabel: 'Myeongjo 리딩 스택',
        koreanSansLabel: 'UI sans 비교',
        koreanComparison:
            '당신의 서명은 2026년 4월 17일 오후 2시 14분에 접수되었습니다.',
    },
} as const satisfies Record<
    AppLocale,
    {
        badge: string;
        title: string;
        description: string;
        backToTone: string;
        displayTitle: string;
        readingTitle: string;
        comparisonTitle: string;
        comparisonNote: string;
        englishDisplay: string;
        koreanDisplay: string;
        englishReading: string;
        koreanReading: string;
        koreanSerifLabel: string;
        koreanSansLabel: string;
        koreanComparison: string;
    }
>;

export default function ToneTypographyFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = typographyCopy[locale];
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

                        <div className="grid gap-4 xl:grid-cols-2">
                            <section className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                                <h3 className="sb-type-headline">{copy.displayTitle}</h3>
                                <div className="mt-4 space-y-5">
                                    <div>
                                        <p className="sb-vocab-label">English display</p>
                                        <p className="sb-type-serif-display mt-3 text-[2rem] leading-[1.08] sm:text-[2.5rem]">
                                            {copy.englishDisplay}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="sb-vocab-label">Korean display</p>
                                        <p className="sb-type-serif-display mt-3 text-[2rem] leading-[1.18] sm:text-[2.35rem]">
                                            {copy.koreanDisplay}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <section className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                                <h3 className="sb-type-headline">{copy.readingTitle}</h3>
                                <div className="mt-4 space-y-5">
                                    <div>
                                        <p className="sb-vocab-label">English reading</p>
                                        <p className="sb-type-serif-reading mt-3 text-[color:var(--sb-text-warm-strong)]">
                                            {copy.englishReading}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="sb-vocab-label">Korean reading</p>
                                        <p className="sb-type-serif-reading mt-3 text-[color:var(--sb-text-warm-strong)]">
                                            {copy.koreanReading}
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <section className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                            <h3 className="sb-type-headline">{copy.comparisonTitle}</h3>
                            <p className="sb-type-body mt-2 max-w-3xl">{copy.comparisonNote}</p>
                            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                                <article className="rounded-[1rem] border border-[color:var(--sb-antiquarian-grey-soft)] bg-[rgba(255,255,255,0.7)] p-5">
                                    <p className="sb-vocab-label">{copy.koreanSerifLabel}</p>
                                    <p className="sb-type-serif-reading mt-4 text-[1.18rem] text-[color:var(--sb-text-warm-strong)]">
                                        {copy.koreanComparison}
                                    </p>
                                </article>
                                <article className="rounded-[1rem] border border-[color:var(--sb-antiquarian-grey-soft)] bg-[rgba(255,255,255,0.7)] p-5">
                                    <p className="sb-vocab-label">{copy.koreanSansLabel}</p>
                                    <p
                                        className="mt-4 text-[1rem] leading-[1.68] text-[color:var(--sb-text-warm-strong)]"
                                        style={{ fontFamily: 'var(--sb-font-body)' }}
                                    >
                                        {copy.koreanComparison}
                                    </p>
                                </article>
                            </div>
                        </section>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
