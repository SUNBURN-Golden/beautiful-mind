import Link from 'next/link';
import { Button } from '@/components/ui/button';

const TRUST_FLOW = [
    {
        title: '1) Admission 신청',
        detail: '신원 + liveness + 분리 동의 + 공식 문서 4종 제출을 완료합니다.',
    },
    {
        title: '2) AI 1차 심사',
        detail: '결정 규칙 기반 AI 판독으로 문서를 정규화하고 정책 입력을 생성합니다.',
    },
    {
        title: '3) Deterministic Final Gate',
        detail: '정책 엔진이 APPROVE/REJECT/RESUBMIT_REQUIRED/EXCEPTION_REQUIRED를 자동으로 확정합니다.',
    },
    {
        title: '4) 자동 발급 + 콜드패스 분리',
        detail: 'AI 승인 시 SOUL trust credential이 즉시 발급되며, 인간은 appeal/exception/audit 케이스에서만 개입합니다.',
    },
];

const PRINCIPLES = [
    '승인 이전에는 핵심 기능 접근을 허용하지 않는다.',
    '원본 문서는 최종 결정 직후 즉시 파기한다.',
    '검증 결과는 최소 클레임 형태로만 유지한다.',
    '모든 상태 전이는 감사로그/원장 이벤트로 추적 가능해야 한다.',
];

export default function TrustModelPage() {
    return (
        <main className="liquid-shell px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="space-y-3">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        SoulBound Trust Model
                    </div>
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">Admission Trust Model</h1>
                    <p className="liquid-copy text-[15px] sm:text-[16px]">
                        SoulBound의 신뢰 모델은 일반 온보딩이 아닌 admission 최종 승인 기반 credential 발급 체계입니다.
                        핵심 진입 경로는 `/apply/*`이며, 레거시 `/onboarding/*`는 호환성 리다이렉트만 유지합니다.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild className="h-11 px-5">
                            <Link href="/manual">매뉴얼 메인</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/apply">Admission 시작</Link>
                        </Button>
                    </div>
                </header>

                <section className="liquid-pane rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[22px] font-semibold">핵심 원칙</h2>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[#3a3a3c]">
                        {PRINCIPLES.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                </section>

                <section className="grid gap-4">
                    {TRUST_FLOW.map((item) => (
                        <article key={item.title} className="liquid-pane liquid-rise rounded-2xl p-5 sm:p-6">
                            <h3 className="liquid-title text-[20px] font-semibold">{item.title}</h3>
                            <p className="liquid-copy mt-2 text-[14px]">{item.detail}</p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}
