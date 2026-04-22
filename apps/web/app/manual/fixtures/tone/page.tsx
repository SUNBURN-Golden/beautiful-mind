'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

const toneIndexCopy = {
    en: {
        badge: 'Tone fixtures',
        title: 'Tone catalog index',
        description:
            'These routes lock the Antiquarian tone, palette, typography, space, and copy rules before any live redesign begins.',
        routes: [
            {
                href: '/manual/fixtures/tone/palette',
                label: 'Palette',
                description: 'Authoritative color tokens, hex values, and usage roles.',
            },
            {
                href: '/manual/fixtures/tone/typography',
                label: 'Typography',
                description: 'Display and reading stacks in English and Korean.',
            },
            {
                href: '/manual/fixtures/tone/space',
                label: 'Space',
                description: 'Stage, warm, and document rooms rendered side by side in sequence.',
            },
            {
                href: '/manual/fixtures/tone/copy-voice',
                label: 'Copy voice',
                description: 'Permitted and forbidden phrasing for the locked tone.',
            },
        ],
    },
    ko: {
        badge: '톤 픽스처',
        title: '톤 카탈로그 목록',
        description:
            '이 경로들은 어떤 라이브 재설계보다 먼저 Antiquarian 톤, 팔레트, 서체, 공간, 카피 규칙을 고정합니다.',
        routes: [
            {
                href: '/manual/fixtures/tone/palette',
                label: 'Palette',
                description: '권위 있는 색상 토큰, 헥스 값, 사용 역할을 정리합니다.',
            },
            {
                href: '/manual/fixtures/tone/typography',
                label: 'Typography',
                description: '영문과 한글의 디스플레이/리딩 스택을 보여줍니다.',
            },
            {
                href: '/manual/fixtures/tone/space',
                label: 'Space',
                description: 'stage, warm, document 공간을 순서대로 렌더링합니다.',
            },
            {
                href: '/manual/fixtures/tone/copy-voice',
                label: 'Copy voice',
                description: '고정된 톤에서 허용되는 문장과 금지되는 문장을 나눠 보여줍니다.',
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

export default function ToneFixtureIndexPage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = toneIndexCopy[locale];
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

                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
