'use client';

import Link from 'next/link';
import { useState } from 'react';
import { SoftFade } from '@/components/motion';
import {
    MOTION_DURATION_BASE,
    MOTION_DURATION_FAST,
} from '@/components/motion/motion-config';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';

const softFadeFixtureCopy = {
    en: {
        badge: 'Motion fixture',
        title: 'SoftFade',
        description:
            'Use this wrapper when the content should settle in with minimal emphasis and no directional push.',
        replay: 'Replay',
        backToMotion: 'Motion index',
        samples: [
            {
                key: 'default',
                title: 'Default',
                detail: 'Immediate opacity entry for the primary block.',
                delayMs: 0,
            },
            {
                key: 'delayed',
                title: 'Delayed',
                detail: 'A second block held briefly to preserve reading order.',
                delayMs: MOTION_DURATION_FAST,
            },
            {
                key: 'quiet',
                title: 'Quiet stack',
                detail: 'A later entry suitable for secondary notes.',
                delayMs: MOTION_DURATION_BASE,
            },
        ],
    },
    ko: {
        badge: '모션 픽스처',
        title: 'SoftFade',
        description:
            '방향성 강조 없이 콘텐츠가 가볍게 정착해야 할 때 사용하는 래퍼입니다.',
        replay: '다시 보기',
        backToMotion: '모션 목록',
        samples: [
            {
                key: 'default',
                title: '기본',
                detail: '주요 블록에 즉시 적용되는 투명도 진입입니다.',
                delayMs: 0,
            },
            {
                key: 'delayed',
                title: '지연',
                detail: '읽기 순서를 지키기 위해 짧게 기다리는 보조 블록입니다.',
                delayMs: MOTION_DURATION_FAST,
            },
            {
                key: 'quiet',
                title: '조용한 스택',
                detail: '보조 메모에 맞는 늦은 진입입니다.',
                delayMs: MOTION_DURATION_BASE,
            },
        ],
    },
} as const satisfies Record<
    AppLocale,
    {
        badge: string;
        title: string;
        description: string;
        replay: string;
        backToMotion: string;
        samples: Array<{
            key: string;
            title: string;
            detail: string;
            delayMs: number;
        }>;
    }
>;

export default function SoftFadeFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => <SoftFadeFixtureContent locale={locale} />}
        </FixtureLocaleBoundary>
    );
}

function SoftFadeFixtureContent({ locale }: { locale: AppLocale }) {
    const copy = softFadeFixtureCopy[locale];
    const manualCopy = getManualFixturesCopy(locale);
    const [replayKey, setReplayKey] = useState(0);

    return (
        <section className={`sb-locale-${locale} space-y-6`} lang={locale}>
            <header className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                <div className="flex flex-wrap gap-2">
                    <span className="sb-vocab-badge">{copy.badge}</span>
                    <Link
                        href={withLangQuery('/manual/fixtures/motion', locale, FIXTURE_DEFAULT_LOCALE)}
                        className="sb-vocab-link"
                    >
                        {copy.backToMotion}
                    </Link>
                    <Link
                        href={withLangQuery('/manual/fixtures', locale, FIXTURE_DEFAULT_LOCALE)}
                        className="sb-vocab-link"
                    >
                        {manualCopy.scene.backToIndex}
                    </Link>
                    <button
                        type="button"
                        className="sb-vocab-link"
                        onClick={() => setReplayKey((current) => current + 1)}
                    >
                        {copy.replay}
                    </button>
                </div>
                <h2 className="sb-type-display-lg mt-4">{copy.title}</h2>
                <p className="sb-type-body-lg mt-2 max-w-3xl">{copy.description}</p>
            </header>

            <div className="grid gap-4 lg:grid-cols-3">
                {copy.samples.map((sample, index) => (
                    <SoftFade key={`${sample.key}-${replayKey}`} className="h-full" delayMs={sample.delayMs}>
                        <article className="sb-space-document flex h-full flex-col rounded-[1.25rem] p-5 sm:p-6">
                            <p className="sb-vocab-label">Sample {index + 1}</p>
                            <h3 className="sb-type-headline mt-3">{sample.title}</h3>
                            <p className="sb-type-body mt-2">{sample.detail}</p>
                        </article>
                    </SoftFade>
                ))}
            </div>
        </section>
    );
}
