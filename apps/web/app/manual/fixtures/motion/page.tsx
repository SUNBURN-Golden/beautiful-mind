'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

const motionIndexCopy = {
    en: {
        badge: 'Motion fixtures',
        title: 'Motion primitive index',
        description:
            'These routes isolate the Phase 5.2 primitives before any live surface adopts them.',
        routes: [
            {
                href: '/manual/fixtures/motion/blur-reveal',
                label: 'BlurReveal',
                description: 'Opacity with a restrained blur-to-clear and short vertical settle.',
            },
            {
                href: '/manual/fixtures/motion/soft-fade',
                label: 'SoftFade',
                description: 'Minimal opacity entry for low-friction content blocks.',
            },
            {
                href: '/manual/fixtures/motion/micro-slide',
                label: 'MicroSlide',
                description: 'Tiny directional translation for rows, rails, and quiet panels.',
            },
        ],
    },
    ko: {
        badge: '모션 픽스처',
        title: '모션 프리미티브 목록',
        description:
            '이 경로들은 어떤 라이브 화면에도 적용하기 전에 Phase 5.2 프리미티브를 개별적으로 검토합니다.',
        routes: [
            {
                href: '/manual/fixtures/motion/blur-reveal',
                label: 'BlurReveal',
                description: '절제된 블러 해제와 짧은 세로 정착을 함께 보여줍니다.',
            },
            {
                href: '/manual/fixtures/motion/soft-fade',
                label: 'SoftFade',
                description: '부담이 거의 없는 투명도 진입 전환을 보여줍니다.',
            },
            {
                href: '/manual/fixtures/motion/micro-slide',
                label: 'MicroSlide',
                description: '행, 레일, 패널에 맞는 작은 방향성 이동을 보여줍니다.',
            },
        ],
    },
} as const satisfies Record<
    AppLocale,
    {
        badge: string;
        title: string;
        description: string;
        routes: Array<{ href: string; label: string; description: string }>;
    }
>;

export default function MotionFixtureIndexPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = motionIndexCopy[locale];
                const manualCopy = getManualFixturesCopy(locale);

                return (
                    <section className={`sb-locale-${locale} space-y-6`} lang={locale}>
                        <header className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                            <div className="flex flex-wrap gap-2">
                                <span className="sb-vocab-badge">{copy.badge}</span>
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

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {copy.routes.map((route) => (
                                <article
                                    key={route.href}
                                    className="sb-space-document rounded-[1.25rem] p-5 sm:p-6"
                                >
                                    <h3 className="sb-type-headline">{route.label}</h3>
                                    <p className="sb-type-body mt-2">{route.description}</p>
                                    <div className="mt-4">
                                        <Link
                                            href={withLangQuery(route.href, locale, FIXTURE_DEFAULT_LOCALE)}
                                            className="sb-vocab-link"
                                        >
                                            {route.label}
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
