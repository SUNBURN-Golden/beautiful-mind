import Link from 'next/link';
import { Button } from '@/components/ui/button';

const VALUES = [
    {
        title: '명시적 동의 우선',
        description: '데이터 수집과 처리 권한은 사용자가 직접 체크하고 제출할 때만 활성화됩니다.',
    },
    {
        title: '신뢰는 단계적으로 획득',
        description: '자가 제출은 LOW trust, 감사/챌린지 통과 시 HIGH trust로 승급됩니다.',
    },
    {
        title: '기록은 남기고 임의 수정은 막음',
        description: '주요 상태 변경은 감사 로그/원장 이벤트에 남겨 사후 검증이 가능합니다.',
    },
    {
        title: '제재도 절차를 거쳐 집행',
        description: 'Freeze → 통지/소명 → 확정 → 집행 순서를 따르며, 즉시 자동 슬래시는 지양합니다.',
    },
];

const STEPS = [
    {
        title: '1) 회원가입',
        summary: '이메일과 비밀번호로 계정을 생성합니다.',
        details: [
            '/signup 에서 이메일/비밀번호를 입력 후 가입합니다.',
            '이미 계정이 있다면 /login 으로 바로 로그인하세요.',
        ],
    },
    {
        title: '2) 본인 인증(KYC)',
        summary: 'PortOne 실명 인증을 1회 완료합니다.',
        details: [
            '온보딩 시작 시 /onboarding/verify 단계로 이동합니다.',
            '인증 완료 후 자동으로 다음 단계로 진행됩니다.',
        ],
    },
    {
        title: '3) 자격 서류 제출',
        summary: '요구된 서류 타입을 업로드합니다.',
        details: [
            '화면에 표시되는 제출 대상(예: RESIDENCE, PHYSICAL, CAREER)을 확인합니다.',
            'JPG/PNG/PDF 파일을 업로드하면 자동 1차 검토가 진행됩니다.',
        ],
    },
    {
        title: '4) 약관 동의',
        summary: '필수 약관 및 개인정보 동의를 완료합니다.',
        details: [
            '/onboarding/consent 에서 두 가지 필수 항목을 체크합니다.',
            '약관 원문은 /terms, 개인정보 처리방침은 /privacy 에서 확인 가능합니다.',
        ],
    },
    {
        title: '5) 전자서명',
        summary: '계약 내용을 확인하고 전자서명을 제출합니다.',
        details: [
            '/onboarding/sign 에서 서명을 입력합니다.',
            '제출 후 영수증/기록이 생성되며 인터뷰 단계로 이동합니다.',
        ],
    },
    {
        title: '6) AI 인터뷰',
        summary: '질문에 답변하고 최종 제출합니다.',
        details: [
            '/interview 에서 질문에 순서대로 답변합니다.',
            '진행도 완료 후 인터뷰 제출 버튼을 눌러 마무리합니다.',
        ],
    },
    {
        title: '7) 대시보드 확인',
        summary: '신뢰 레벨/상태/최근 기록을 확인합니다.',
        details: [
            '/dashboard 에서 현재 신뢰 상태와 요약 정보를 확인합니다.',
            '진행 단계가 다른 경우 시스템이 자동으로 맞는 페이지로 안내합니다.',
        ],
    },
];

const STATUS_GUIDE = [
    { label: 'LOW TRUST', description: '자가 제출/기초 검증 기반의 초기 신뢰 배지 상태입니다.' },
    { label: 'HIGH TRUST', description: '감사(Audit) 또는 챌린지(Challenge)를 통과한 검증 완료 상태입니다.' },
    { label: 'FROZEN', description: '분쟁/심사 중 임시 제한 상태이며, 절차 확정 전 자동 영구 제재는 지양합니다.' },
    { label: 'DISHONORED/REVOKED', description: '확정 실패 또는 철회 처리 상태이며, 결과는 기록으로 추적 가능합니다.' },
];

export default function ManualPage() {
    return (
        <main className="liquid-shell px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-5xl space-y-8">
                <header className="space-y-3">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        SoulBound Usage Manual
                    </div>
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">
                        SoulBound 이용 매뉴얼
                    </h1>
                    <p className="liquid-copy max-w-3xl text-[15px] sm:text-[16px]">
                        SoulBound가 설계한 핵심 가치와 실제 사용 흐름을 한 번에 확인할 수 있도록 정리했습니다.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-1">
                        <Button asChild className="h-11 px-5">
                            <Link href="/signup">회원가입 바로가기</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/login">로그인 바로가기</Link>
                        </Button>
                        <Button asChild variant="secondary" className="h-11 px-5">
                            <Link href="/onboarding">온보딩 상태 확인</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/manual/trust-model">Trust Model 자세히 보기</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/onboarding/help">온보딩 도움말</Link>
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
                            <p className="liquid-copy mt-1 text-[14px]">{step.summary}</p>
                            <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[#3a3a3c]">
                                {step.details.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>

                <section className="liquid-pane rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[20px] font-semibold">신뢰 상태(Trust Status) 해설</h2>
                    <div className="mt-4 grid gap-3">
                        {STATUS_GUIDE.map((item) => (
                            <div key={item.label} className="rounded-xl border border-[#e5e5e7] bg-white p-4">
                                <p className="text-[13px] font-semibold uppercase tracking-wide text-[#1d1d1f]">{item.label}</p>
                                <p className="mt-1 text-[14px] text-[#3a3a3c]">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="liquid-pane-muted rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[20px] font-semibold">자주 묻는 질문</h2>
                    <div className="mt-3 space-y-3 text-[14px] text-[#3a3a3c]">
                        <p><strong>Q.</strong> 중간에 페이지가 바뀌면 오류인가요?<br /><strong>A.</strong> 아닙니다. 현재 계정 상태에 맞는 단계로 자동 이동하는 정상 동작입니다.</p>
                        <p><strong>Q.</strong> 어떤 서류를 제출해야 할지 모르겠어요.<br /><strong>A.</strong> 자격 제출 화면 상단의 “현재 제출 대상” 문구를 기준으로 준비하면 됩니다.</p>
                        <p><strong>Q.</strong> 진행이 막히면 어디서 다시 시작하나요?<br /><strong>A.</strong> /onboarding 에서 현재 단계 기준으로 즉시 재진입할 수 있습니다.</p>
                        <p><strong>Q.</strong> LOW/HIGH trust 차이가 뭔가요?<br /><strong>A.</strong> LOW는 빠른 초기 배지, HIGH는 감사/챌린지 절차 통과로 획득하는 검증 배지입니다.</p>
                    </div>
                </section>
            </div>
        </main>
    );
}
