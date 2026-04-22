'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

const copyVoiceCopy = {
    en: {
        badge: 'Tone fixture',
        title: 'Copy voice catalog',
        description:
            'Permitted sentences stay documentary and declarative; forbidden sentences drift into cheer, speed, or social-app grammar.',
        backToTone: 'Tone index',
        permittedTitle: 'Permitted examples',
        forbiddenTitle: 'Forbidden patterns',
        permittedEn: [
            'We write the terms before we exchange a word.',
            'This letter opens only when both signatures have arrived.',
            'Your signature was received at 2:14 PM on the seventeenth of April.',
            'This room is not yet open.',
        ],
        permittedKo: [
            '서로를 알기 전에, 먼저 약속을 적어둡니다.',
            '이 편지는 두 사람의 서명이 모두 도착했을 때에만 열립니다.',
            '당신의 서명은 2026년 4월 17일 오후 2시 14분에 접수되었습니다.',
            '이 방은 아직 닫혀 있습니다.',
        ],
        forbiddenEn: [
            'Welcome back!',
            'Have a great day',
            'Congratulations!',
            'Almost there',
            'Easily',
            'Quickly',
            'New counterpart',
        ],
        forbiddenKo: [
            '환영합니다, 민지 님!',
            '오늘도 좋은 하루 되세요',
            '축하합니다!',
            '거의 다 왔어요',
            '간편하게',
            '새로운 상대',
            '다음',
        ],
    },
    ko: {
        badge: '톤 픽스처',
        title: '카피 보이스 카탈로그',
        description:
            '허용 문장은 기록처럼 차분하게 남고, 금지 문장은 축하, 속도, 소셜 앱 문법으로 기울어집니다.',
        backToTone: '톤 목록',
        permittedTitle: '허용 예시',
        forbiddenTitle: '금지 패턴',
        permittedEn: [
            'We write the terms before we exchange a word.',
            'This letter opens only when both signatures have arrived.',
            'Your signature was received at 2:14 PM on the seventeenth of April.',
            'This room is not yet open.',
        ],
        permittedKo: [
            '서로를 알기 전에, 먼저 약속을 적어둡니다.',
            '이 편지는 두 사람의 서명이 모두 도착했을 때에만 열립니다.',
            '당신의 서명은 2026년 4월 17일 오후 2시 14분에 접수되었습니다.',
            '이 방은 아직 닫혀 있습니다.',
        ],
        forbiddenEn: [
            'Welcome back!',
            'Have a great day',
            'Congratulations!',
            'Almost there',
            'Easily',
            'Quickly',
            'New counterpart',
        ],
        forbiddenKo: [
            '환영합니다, 민지 님!',
            '오늘도 좋은 하루 되세요',
            '축하합니다!',
            '거의 다 왔어요',
            '간편하게',
            '새로운 상대',
            '다음',
        ],
    },
} as const satisfies Record<
    AppLocale,
    {
        badge: string;
        title: string;
        description: string;
        backToTone: string;
        permittedTitle: string;
        forbiddenTitle: string;
        permittedEn: string[];
        permittedKo: string[];
        forbiddenEn: string[];
        forbiddenKo: string[];
    }
>;

export default function ToneCopyVoiceFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = copyVoiceCopy[locale];
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
                                <h3 className="sb-type-headline">{copy.permittedTitle}</h3>
                                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                    <article className="rounded-[1rem] border border-[color:var(--sb-antiquarian-grey-soft)] bg-[rgba(255,255,255,0.7)] p-5">
                                        <p className="sb-vocab-label">English</p>
                                        <ul className="mt-4 space-y-3">
                                            {copy.permittedEn.map((item) => (
                                                <li key={item} className="sb-type-body">{item}</li>
                                            ))}
                                        </ul>
                                    </article>
                                    <article className="rounded-[1rem] border border-[color:var(--sb-antiquarian-grey-soft)] bg-[rgba(255,255,255,0.7)] p-5">
                                        <p className="sb-vocab-label">Korean</p>
                                        <ul className="mt-4 space-y-3">
                                            {copy.permittedKo.map((item) => (
                                                <li key={item} className="sb-type-body">{item}</li>
                                            ))}
                                        </ul>
                                    </article>
                                </div>
                            </section>

                            <section className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                                <h3 className="sb-type-headline">{copy.forbiddenTitle}</h3>
                                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                    <article className="rounded-[1rem] border border-[color:var(--sb-antiquarian-grey-soft)] bg-[rgba(255,255,255,0.7)] p-5">
                                        <p className="sb-vocab-label">English</p>
                                        <ul className="mt-4 space-y-3">
                                            {copy.forbiddenEn.map((item) => (
                                                <li key={item} className="sb-type-body line-through decoration-[1px]">
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                    <article className="rounded-[1rem] border border-[color:var(--sb-antiquarian-grey-soft)] bg-[rgba(255,255,255,0.7)] p-5">
                                        <p className="sb-vocab-label">Korean</p>
                                        <ul className="mt-4 space-y-3">
                                            {copy.forbiddenKo.map((item) => (
                                                <li key={item} className="sb-type-body line-through decoration-[1px]">
                                                    {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </article>
                                </div>
                            </section>
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
