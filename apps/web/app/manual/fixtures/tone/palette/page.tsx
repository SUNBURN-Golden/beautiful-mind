'use client';

import Link from 'next/link';
import { FixtureLocaleBoundary } from '../../_components/fixture-locale-boundary';
import { FIXTURE_DEFAULT_LOCALE, withLangQuery, type AppLocale } from '@/i18n/config';
import { getManualFixturesCopy } from '@/i18n/manual-fixtures';

type ToneTile = {
    label: string;
    token: string;
    value: string;
    role: string;
    swatch: string;
    rule?: string;
    swatchTextColor?: string;
};

type ToneGroup = {
    title: string;
    description: string;
    items: ToneTile[];
};

const paletteCopy: Record<
    AppLocale,
    {
        badge: string;
        title: string;
        description: string;
        backToTone: string;
        groups: ToneGroup[];
    }
> = {
    en: {
        badge: 'Tone fixture',
        title: 'Palette catalog',
        description:
            'Every Antiquarian value is listed here with its token, hex or rgba value, and rule-bound role.',
        backToTone: 'Tone index',
        groups: [
            {
                title: 'Antiquarian accents',
                description: 'Controlled structural accents with explicit rule ownership.',
                items: [
                    {
                        label: 'Antiquarian orange',
                        token: '--sb-antiquarian-orange',
                        value: '#C15A2B',
                        role: 'Stage-only seal accent for single-instance emphasis.',
                        swatch: 'var(--sb-antiquarian-orange)',
                        rule: '§4',
                    },
                    {
                        label: 'Antiquarian green',
                        token: '--sb-antiquarian-green',
                        value: '#3B4A3E',
                        role: 'Stage backing family, never an accent.',
                        swatch: 'var(--sb-antiquarian-green)',
                        rule: '§6',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Antiquarian grey',
                        token: '--sb-antiquarian-grey',
                        value: '#8A8578',
                        role: 'Structural border and metadata workhorse.',
                        swatch: 'var(--sb-antiquarian-grey)',
                        rule: '§7',
                    },
                    {
                        label: 'Antiquarian burgundy',
                        token: '--sb-antiquarian-burgundy',
                        value: '#5C2A2A',
                        role: 'Warm/document seal accent in place of orange.',
                        swatch: 'var(--sb-antiquarian-burgundy)',
                        rule: '§5',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                ],
            },
            {
                title: 'Stage family',
                description: 'Depth and ink values for the stage room.',
                items: [
                    {
                        label: 'Stage depth',
                        token: '--sb-stage-depth',
                        value: '#1E2823',
                        role: 'Library-at-dusk background for stage pages.',
                        swatch: 'var(--sb-stage-depth)',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Stage ink strong',
                        token: '--sb-stage-ink-strong',
                        value: '#F1E9DB',
                        role: 'Lamp-lit paper text on stage depth.',
                        swatch: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Stage ink muted',
                        token: '--sb-stage-ink-muted',
                        value: 'rgba(241, 233, 219, 0.74)',
                        role: 'Secondary stage metadata and quiet copy.',
                        swatch: 'var(--sb-stage-ink-muted)',
                    },
                    {
                        label: 'Stage ink soft',
                        token: '--sb-stage-ink-soft',
                        value: 'rgba(241, 233, 219, 0.52)',
                        role: 'Low-emphasis stage labels and supporting detail.',
                        swatch: 'var(--sb-stage-ink-soft)',
                    },
                ],
            },
            {
                title: 'Warm family',
                description: 'Canvas and panel values for the warm room.',
                items: [
                    {
                        label: 'Warm canvas',
                        token: '--sb-surface-warm',
                        value: '#f7f1e8',
                        role: 'Primary warm-page canvas.',
                        swatch: 'var(--sb-surface-warm)',
                    },
                    {
                        label: 'Warm soft',
                        token: '--sb-surface-warm-soft',
                        value: '#fcf8f2',
                        role: 'Softer adjacent warm surface.',
                        swatch: 'var(--sb-surface-warm-soft)',
                    },
                    {
                        label: 'Warm panel',
                        token: '--sb-surface-warm-panel',
                        value: '#F0E5D2',
                        role: 'Drawer-inside-the-room panel depth.',
                        swatch: 'var(--sb-surface-warm-panel)',
                    },
                    {
                        label: 'Seal gold',
                        token: '--sb-accent-trust',
                        value: '#b89c6b',
                        role: 'Preserved warm-space signature and seal color.',
                        swatch: 'var(--sb-accent-trust)',
                    },
                ],
            },
            {
                title: 'Document family',
                description: 'Paper surfaces and ink for document reading.',
                items: [
                    {
                        label: 'Document panel',
                        token: '--sb-surface-panel',
                        value: '#ffffff',
                        role: 'Primary document panel surface.',
                        swatch: 'var(--sb-surface-panel)',
                    },
                    {
                        label: 'Document muted',
                        token: '--sb-surface-muted',
                        value: '#fbfbfd',
                        role: 'Muted document companion surface.',
                        swatch: 'var(--sb-surface-muted)',
                    },
                    {
                        label: 'Ink strong',
                        token: '--sb-text-warm-strong',
                        value: '#16120d',
                        role: 'Primary reading ink on warm and document surfaces.',
                        swatch: 'var(--sb-text-warm-strong)',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Ink muted',
                        token: '--sb-text-warm-muted',
                        value: 'rgba(49, 41, 32, 0.74)',
                        role: 'Secondary reading copy and metadata.',
                        swatch: 'rgba(49, 41, 32, 0.74)',
                    },
                    {
                        label: 'Ink soft',
                        token: '--sb-text-warm-soft',
                        value: 'rgba(49, 41, 32, 0.56)',
                        role: 'Low-emphasis labels and quiet detail.',
                        swatch: 'rgba(49, 41, 32, 0.56)',
                    },
                ],
            },
        ],
    },
    ko: {
        badge: '톤 픽스처',
        title: '팔레트 카탈로그',
        description:
            '여기에는 모든 Antiquarian 값이 토큰명, 헥스 또는 rgba 값, 규칙 기반 역할과 함께 정리됩니다.',
        backToTone: '톤 목록',
        groups: [
            {
                title: 'Antiquarian 강조색',
                description: '명시적인 규칙 소유권을 가진 통제된 구조 색입니다.',
                items: [
                    {
                        label: 'Antiquarian orange',
                        token: '--sb-antiquarian-orange',
                        value: '#C15A2B',
                        role: '한 번만 등장하는 stage 전용 seal 강조색입니다.',
                        swatch: 'var(--sb-antiquarian-orange)',
                        rule: '§4',
                    },
                    {
                        label: 'Antiquarian green',
                        token: '--sb-antiquarian-green',
                        value: '#3B4A3E',
                        role: 'stage 배경 계열이며 강조색으로 쓰지 않습니다.',
                        swatch: 'var(--sb-antiquarian-green)',
                        rule: '§6',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Antiquarian grey',
                        token: '--sb-antiquarian-grey',
                        value: '#8A8578',
                        role: '경계선과 메타데이터를 담당하는 구조 색입니다.',
                        swatch: 'var(--sb-antiquarian-grey)',
                        rule: '§7',
                    },
                    {
                        label: 'Antiquarian burgundy',
                        token: '--sb-antiquarian-burgundy',
                        value: '#5C2A2A',
                        role: 'warm/document 공간에서 orange를 대신하는 seal 강조색입니다.',
                        swatch: 'var(--sb-antiquarian-burgundy)',
                        rule: '§5',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                ],
            },
            {
                title: 'Stage 계열',
                description: 'stage 공간의 깊이와 ink 값입니다.',
                items: [
                    {
                        label: 'Stage depth',
                        token: '--sb-stage-depth',
                        value: '#1E2823',
                        role: 'stage 페이지의 library-at-dusk 배경입니다.',
                        swatch: 'var(--sb-stage-depth)',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Stage ink strong',
                        token: '--sb-stage-ink-strong',
                        value: '#F1E9DB',
                        role: 'stage depth 위의 본문 잉크입니다.',
                        swatch: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Stage ink muted',
                        token: '--sb-stage-ink-muted',
                        value: 'rgba(241, 233, 219, 0.74)',
                        role: '보조 메타데이터와 조용한 복사용 값입니다.',
                        swatch: 'var(--sb-stage-ink-muted)',
                    },
                    {
                        label: 'Stage ink soft',
                        token: '--sb-stage-ink-soft',
                        value: 'rgba(241, 233, 219, 0.52)',
                        role: '낮은 강조도의 라벨과 보조 정보에 씁니다.',
                        swatch: 'var(--sb-stage-ink-soft)',
                    },
                ],
            },
            {
                title: 'Warm 계열',
                description: 'warm 공간의 캔버스와 패널 값입니다.',
                items: [
                    {
                        label: 'Warm canvas',
                        token: '--sb-surface-warm',
                        value: '#f7f1e8',
                        role: '주요 warm 페이지 캔버스입니다.',
                        swatch: 'var(--sb-surface-warm)',
                    },
                    {
                        label: 'Warm soft',
                        token: '--sb-surface-warm-soft',
                        value: '#fcf8f2',
                        role: '더 부드러운 인접 warm 표면입니다.',
                        swatch: 'var(--sb-surface-warm-soft)',
                    },
                    {
                        label: 'Warm panel',
                        token: '--sb-surface-warm-panel',
                        value: '#F0E5D2',
                        role: '같은 방 안의 서랍처럼 읽히는 패널 깊이입니다.',
                        swatch: 'var(--sb-surface-warm-panel)',
                    },
                    {
                        label: 'Seal gold',
                        token: '--sb-accent-trust',
                        value: '#b89c6b',
                        role: '보존된 warm-space signature/seal 색입니다.',
                        swatch: 'var(--sb-accent-trust)',
                    },
                ],
            },
            {
                title: 'Document 계열',
                description: '문서용 표면과 읽기 잉크입니다.',
                items: [
                    {
                        label: 'Document panel',
                        token: '--sb-surface-panel',
                        value: '#ffffff',
                        role: '기본 문서 패널 표면입니다.',
                        swatch: 'var(--sb-surface-panel)',
                    },
                    {
                        label: 'Document muted',
                        token: '--sb-surface-muted',
                        value: '#fbfbfd',
                        role: '보조 문서 표면입니다.',
                        swatch: 'var(--sb-surface-muted)',
                    },
                    {
                        label: 'Ink strong',
                        token: '--sb-text-warm-strong',
                        value: '#16120d',
                        role: 'warm/document 공간의 기본 읽기 잉크입니다.',
                        swatch: 'var(--sb-text-warm-strong)',
                        swatchTextColor: 'var(--sb-stage-ink-strong)',
                    },
                    {
                        label: 'Ink muted',
                        token: '--sb-text-warm-muted',
                        value: 'rgba(49, 41, 32, 0.74)',
                        role: '보조 본문과 메타데이터용 잉크입니다.',
                        swatch: 'rgba(49, 41, 32, 0.74)',
                    },
                    {
                        label: 'Ink soft',
                        token: '--sb-text-warm-soft',
                        value: 'rgba(49, 41, 32, 0.56)',
                        role: '낮은 강조도의 라벨과 조용한 정보용 잉크입니다.',
                        swatch: 'rgba(49, 41, 32, 0.56)',
                    },
                ],
            },
        ],
    },
};

export default function TonePaletteFixturePage() {
    return (
        <FixtureLocaleBoundary>
            {(locale) => {
                const copy = paletteCopy[locale];
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

                        <div className="space-y-6">
                            {copy.groups.map((group) => (
                                <section key={group.title} className="sb-space-document rounded-[1.5rem] p-5 sm:p-6">
                                    <div className="space-y-2">
                                        <h3 className="sb-type-headline">{group.title}</h3>
                                        <p className="sb-type-body">{group.description}</p>
                                    </div>

                                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        {group.items.map((item) => {
                                            const rule = 'rule' in item ? item.rule : undefined;
                                            const swatchTextColor =
                                                'swatchTextColor' in item
                                                    ? item.swatchTextColor
                                                    : undefined;

                                            return (
                                                <article
                                                    key={`${group.title}-${item.token}`}
                                                    className="rounded-[1rem] border border-[color:var(--sb-antiquarian-grey-soft)] bg-[rgba(255,255,255,0.7)] p-4"
                                                >
                                                    <div
                                                        className="flex h-16 w-16 items-center justify-center rounded-xl border border-[color:var(--sb-antiquarian-grey-soft)] text-center text-[0.7rem] font-semibold"
                                                        style={{
                                                            background: item.swatch,
                                                            color: swatchTextColor ?? 'var(--sb-text-warm-strong)',
                                                        }}
                                                    >
                                                        {rule ?? item.value}
                                                    </div>
                                                    <div className="mt-4 space-y-2">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="sb-type-headline">{item.label}</p>
                                                            {rule ? (
                                                                <span className="sb-vocab-badge">{rule}</span>
                                                            ) : null}
                                                        </div>
                                                        <p className="break-all font-mono text-[0.8rem] text-[color:var(--sb-text-warm-muted)]">
                                                            {item.token}
                                                        </p>
                                                        <p className="font-mono text-[0.82rem] text-[color:var(--sb-text-warm-strong)]">
                                                            {item.value}
                                                        </p>
                                                        <p className="sb-type-body">{item.role}</p>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </section>
                );
            }}
        </FixtureLocaleBoundary>
    );
}
