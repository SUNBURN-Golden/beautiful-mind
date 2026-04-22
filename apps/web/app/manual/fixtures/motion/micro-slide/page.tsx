'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MicroSlide } from '@/components/motion';
import {
    MOTION_DISTANCE_LG,
    MOTION_DISTANCE_MD,
    MOTION_DISTANCE_SM,
    MOTION_DURATION_BASE,
    MOTION_DURATION_FAST,
} from '@/components/motion/motion-config';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';

const microSlideFixtureCopy = {
    en: {
        badge: 'Motion fixture',
        title: 'MicroSlide',
        description:
            'Use this wrapper when a row or rail needs a small directional entry without additional emphasis.',
        replay: 'Replay',
        backToMotion: 'Motion index',
        samples: [
            {
                key: 'vertical',
                title: 'Vertical',
                detail: 'Short y-axis travel for stacked rows.',
                props: { axis: 'y' as const, distance: MOTION_DISTANCE_SM as 8, delayMs: 0 },
            },
            {
                key: 'horizontal',
                title: 'Horizontal',
                detail: 'X-axis movement suitable for a rail or side block.',
                props: {
                    axis: 'x' as const,
                    distance: MOTION_DISTANCE_MD as 12,
                    delayMs: MOTION_DURATION_FAST,
                },
            },
            {
                key: 'longer',
                title: 'Longer distance',
                detail: 'The upper bound for this primitive.',
                props: {
                    axis: 'y' as const,
                    distance: MOTION_DISTANCE_LG as 16,
                    delayMs: MOTION_DURATION_BASE,
                },
            },
        ],
    },
    ko: {
        badge: '모션 픽스처',
        title: 'MicroSlide',
        description:
            '행이나 레일이 추가 강조 없이 작은 방향성 진입만 필요할 때 사용하는 래퍼입니다.',
        replay: '다시 보기',
        backToMotion: '모션 목록',
        samples: [
            {
                key: 'vertical',
                title: '세로',
                detail: '쌓인 행에 맞는 짧은 y축 이동입니다.',
                props: { axis: 'y' as const, distance: MOTION_DISTANCE_SM as 8, delayMs: 0 },
            },
            {
                key: 'horizontal',
                title: '가로',
                detail: '레일이나 측면 블록에 맞는 x축 이동입니다.',
                props: {
                    axis: 'x' as const,
                    distance: MOTION_DISTANCE_MD as 12,
                    delayMs: MOTION_DURATION_FAST,
                },
            },
            {
                key: 'longer',
                title: '긴 거리',
                detail: '이 프리미티브에서 허용하는 최대 거리입니다.',
                props: {
                    axis: 'y' as const,
                    distance: MOTION_DISTANCE_LG as 16,
                    delayMs: MOTION_DURATION_BASE,
                },
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
            props: {
                axis: 'x' | 'y';
                distance: 8 | 12 | 16;
                delayMs: number;
            };
        }>;
    }
>;

export default function MicroSlideFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => <MicroSlideFixtureContent locale={locale} />}
        </FixtureLocaleBoundary>
    );
}

function MicroSlideFixtureContent({ locale }: { locale: AppLocale }) {
    const copy = microSlideFixtureCopy[locale];
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
                    <MicroSlide
                        key={`${sample.key}-${replayKey}`}
                        className="h-full"
                        axis={sample.props.axis}
                        distance={sample.props.distance}
                        delayMs={sample.props.delayMs}
                    >
                        <article className="sb-space-document flex h-full flex-col rounded-[1.25rem] p-5 sm:p-6">
                            <p className="sb-vocab-label">Sample {index + 1}</p>
                            <h3 className="sb-type-headline mt-3">{sample.title}</h3>
                            <p className="sb-type-body mt-2">{sample.detail}</p>
                        </article>
                    </MicroSlide>
                ))}
            </div>
        </section>
    );
}
