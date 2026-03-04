import Link from 'next/link';
import { Button } from '@/components/ui/button';

const TRUST_FLOW = [
    {
        title: '1) Self-Claim 발급',
        detail: '사용자가 자가 제출을 완료하면 LOW trust 배지가 발급됩니다. 빠른 온보딩을 위한 초기 단계입니다.',
    },
    {
        title: '2) Audit/Challenge 진입',
        detail: '랜덤 감사 또는 사용자 챌린지가 열리면 상태가 심사 모드로 전환되고 필요 시 Freeze가 적용됩니다.',
    },
    {
        title: '3) Due Process',
        detail: 'Freeze 상태에서 통지와 소명 기회를 거친 뒤 최종 결정을 내립니다.',
    },
    {
        title: '4) 결정 및 반영',
        detail: 'PASS면 HIGH trust 승급, FAIL이면 정책에 따라 제재/철회 절차를 진행합니다.',
    },
];

const PRINCIPLES = [
    '신뢰는 선언이 아니라 기록 가능한 절차로 획득한다.',
    '배지 상태 변경은 감사 가능해야 하며 사후 추적이 가능해야 한다.',
    '제재는 즉시 자동 집행보다 절차적 정당성(통지/소명/확정)을 우선한다.',
    '사용자는 항상 현재 단계와 상태를 화면에서 이해할 수 있어야 한다.',
];

export default function TrustModelPage() {
    return (
        <main className="liquid-shell px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="space-y-3">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        SoulBound Trust Model
                    </div>
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">
                        신뢰 모델 설계 개요
                    </h1>
                    <p className="liquid-copy text-[15px] sm:text-[16px]">
                        SoulBound가 설계한 LOW/HIGH trust 전환 방식과 분쟁 처리 원칙을 사용자 관점에서 설명합니다.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild className="h-11 px-5">
                            <Link href="/manual">매뉴얼 메인으로</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/onboarding/help">온보딩 도움말</Link>
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

                <section className="liquid-pane-muted rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[22px] font-semibold">사용자에게 중요한 점</h2>
                    <div className="mt-3 space-y-2 text-[14px] text-[#3a3a3c]">
                        <p>현재 내 계정이 LOW/HIGH/FROZEN 중 어디인지 대시보드에서 확인할 수 있습니다.</p>
                        <p>분쟁 상태에서는 기능 제한이 걸릴 수 있지만, 절차가 완료되기 전까지는 결과가 확정되지 않습니다.</p>
                        <p>진행이 막히면 /onboarding 또는 /onboarding/help에서 현재 단계 기준으로 재진입할 수 있습니다.</p>
                    </div>
                </section>
            </div>
        </main>
    );
}
