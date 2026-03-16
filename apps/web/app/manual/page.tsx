import Link from 'next/link';
import { Button } from '@/components/ui/button';

const VALUES = [
    {
        title: 'Admission 우선 접근제어',
        description: '최종 승인 전까지 핵심 기능 접근을 제한하고, 심사 절차를 SSOT로 일원화합니다.',
    },
    {
        title: '공식 문서 기반 검증',
        description: '졸업/소득/혼인/가족관계 문서로만 핵심 admission 근거를 수집합니다.',
    },
    {
        title: '즉시 파기 + 최소 보관',
        description: '원본 문서는 최종 결정 직후 삭제하고, 최소 검증 클레임만 유지합니다.',
    },
    {
        title: '불변 원장 이벤트',
        description: '승인/반려/재제출/발급/파기 상태 전이를 trust ledger 이벤트로 추적합니다.',
    },
];

const STEPS = [
    {
        title: '1) 로그인 및 신청 시작',
        details: ['`/login` 후 `/apply`에서 admission 신청을 시작합니다.'],
    },
    {
        title: '2) 신원 검증',
        details: ['`/apply/identity`에서 본인 확인을 완료합니다.'],
    },
    {
        title: '3) 실재 인물(liveness) 검증',
        details: ['`/apply/liveness`에서 real-person 검증을 제출합니다.'],
    },
    {
        title: '4) 분리 동의 + 확인문구 입력',
        details: ['`/apply/consents`에서 항목별 체크와 typed acknowledgement를 제출합니다.'],
    },
    {
        title: '5) 공식 문서 4종 업로드 + AI 판독',
        details: [
            '`/apply/documents`에서 졸업·소득·혼인·가족관계 문서를 제출합니다.',
            '문서별 교체/재업로드가 가능하며 AI 1차 판독이 실행됩니다.',
        ],
    },
    {
        title: '6) AI 결정 실행/확인',
        details: ['`/apply/review`는 AI admission engine 실행 상태를 확인하는 단계이며, 필요 시 재실행만 수행합니다.'],
    },
    {
        title: '7) 결과 확인 및 콜드패스',
        details: [
            '`/apply/status`에서 승인/반려/재제출 상태를 확인합니다.',
            '예외/항소/감사 케이스만 인간 리뷰 큐로 이동하며, 승인 시 SOUL trust credential이 발급되고 `ACTIVE`로 전환됩니다.',
        ],
    },
];

export default function ManualPage() {
    return (
        <main className="liquid-shell px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="space-y-3">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        SoulBound Admission Manual
                    </div>
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">
                        SoulBound 이용 매뉴얼
                    </h1>
                    <p className="liquid-copy max-w-3xl text-[15px] sm:text-[16px]">
                        SoulBound는 일반 온보딩 서비스가 아니라 admission-controlled trust network입니다.
                        승인 이전에는 핵심 기능이 잠기며, `/apply/*` 절차 완료 후에만 ACTIVE 상태로 전환됩니다.
                    </p>

                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button asChild className="h-11 px-5">
                            <Link href="/signup">회원가입</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/login">로그인</Link>
                        </Button>
                        <Button asChild variant="secondary" className="h-11 px-5">
                            <Link href="/apply">Admission 시작</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/manual/trust-model">Trust Model</Link>
                        </Button>
                    </div>
                </header>

                <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {VALUES.map((value) => (
                        <article key={value.title} className="liquid-pane rounded-2xl p-5 sm:p-6">
                            <h2 className="liquid-title text-[20px] font-semibold">{value.title}</h2>
                            <p className="liquid-copy mt-2 text-[14px]">{value.description}</p>
                        </article>
                    ))}
                </section>

                <section className="grid gap-4">
                    {STEPS.map((step) => (
                        <article key={step.title} className="liquid-pane liquid-rise rounded-2xl p-5 sm:p-6">
                            <h2 className="liquid-title text-[20px] font-semibold">{step.title}</h2>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[#3a3a3c]">
                                {step.details.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>

                <section className="liquid-pane-muted rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[20px] font-semibold">레거시 경로 안내 (호환성 전용)</h2>
                    <p className="mt-2 text-[14px] text-[#3a3a3c]">
                        `/onboarding/*`, `/interview`, `/contract`, `/consent`, `/osint`, `/admin-verify`는 더 이상 핵심 흐름이 아닙니다.
                        현재는 모두 admission 중심 경로로 리다이렉트됩니다.
                    </p>
                    <p className="mt-2 text-[14px] text-[#3a3a3c]">
                        `/match`, `/chat`, `/review`, `/report`, `/revoke`는 ACTIVE 계정 전용이며, API 계약 기반으로 동작합니다.
                    </p>
                </section>
            </div>
        </main>
    );
}
