'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BlurReveal } from '@/components/motion';
import {
    MOTION_DISTANCE_MD,
    MOTION_DISTANCE_SM,
    MOTION_DURATION_BASE,
    MOTION_DURATION_FAST,
} from '@/components/motion/motion-config';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';

const blurRevealFixtureCopy = {
    en: {
        badge: 'Motion fixture',
        title: 'BlurReveal',
        description:
            'Use this wrapper when a heading or entry block benefits from a short fade and a restrained settle.',
        replay: 'Replay',
        backToMotion: 'Motion index',
        samples: [
            {
                key: 'default',
                title: 'Default',
                detail: 'Base distance with a low blur value.',
                props: { delayMs: 0, distance: MOTION_DISTANCE_SM as 8, blurPx: 4 as 4 },
            },
            {
                key: 'delayed',
                title: 'Delayed',
                detail: 'Same reveal with a short delay for a secondary block.',
                props: {
                    delayMs: MOTION_DURATION_FAST,
                    distance: MOTION_DISTANCE_MD as 12,
                    blurPx: 6 as 6,
                },
            },
            {
                key: 'low-emphasis',
                title: 'Low emphasis',
                detail: 'Fade only, with blur and translation removed.',
                props: { delayMs: MOTION_DURATION_BASE, distance: 0 as 0, blurPx: 0 as 0 },
            },
        ],
    },
    ko: {
        badge: '모션 픽스처',
        title: 'BlurReveal',
        description:
            '제목이나 진입 블록에 짧은 페이드와 절제된 정착이 필요할 때 사용하는 래퍼입니다.',
        replay: '다시 보기',
        backToMotion: '모션 목록',
        samples: [
            {
                key: 'default',
                title: '기본',
                detail: '기본 거리와 낮은 블러 값입니다.',
                props: { delayMs: 0, distance: MOTION_DISTANCE_SM as 8, blurPx: 4 as 4 },
            },
            {
                key: 'delayed',
                title: '지연',
                detail: '보조 블록에 짧은 지연을 둔 같은 전환입니다.',
                props: {
                    delayMs: MOTION_DURATION_FAST,
                    distance: MOTION_DISTANCE_MD as 12,
                    blurPx: 6 as 6,
                },
            },
            {
                key: 'low-emphasis',
                title: '약한 강조',
                detail: '블러와 이동을 제거한 페이드 전용 상태입니다.',
                props: { delayMs: MOTION_DURATION_BASE, distance: 0 as 0, blurPx: 0 as 0 },
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
                delayMs?: number;
                distance: 0 | 8 | 12;
                blurPx: 0 | 4 | 6;
            };
        }>;
    }
>;

export default function BlurRevealFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => <BlurRevealFixtureContent locale={locale} />}
        </FixtureLocaleBoundary>
    );
}

function BlurRevealFixtureContent({ locale }: { locale: AppLocale }) {
    const copy = blurRevealFixtureCopy[locale];
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
                    <BlurReveal
                        key={`${sample.key}-${replayKey}`}
                        className="h-full"
                        delayMs={sample.props.delayMs}
                        distance={sample.props.distance}
                        blurPx={sample.props.blurPx}
                    >
                        <article className="sb-space-document flex h-full flex-col rounded-[1.25rem] p-5 sm:p-6">
                            <p className="sb-vocab-label">Sample {index + 1}</p>
                            <h3 className="sb-type-headline mt-3">{sample.title}</h3>
                            <p className="sb-type-body mt-2">{sample.detail}</p>
                        </article>
                    </BlurReveal>
                ))}
            </div>
        </section>
    );
}
