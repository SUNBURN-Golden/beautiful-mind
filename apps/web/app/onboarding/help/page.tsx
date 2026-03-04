import Link from 'next/link';
import { Button } from '@/components/ui/button';

const TROUBLESHOOTING = [
    {
        title: '로그인 후 다시 로그인 화면으로 돌아와요',
        answer: '세션 갱신 직후 상태 동기화가 끝나기 전일 수 있습니다. /onboarding을 새로고침해 현재 단계로 재진입하세요.',
    },
    {
        title: '어떤 서류를 올려야 하는지 모르겠어요',
        answer: '자격 제출 화면의 “현재 제출 대상” 문구를 기준으로 준비하면 됩니다.',
    },
    {
        title: '전자서명 제출이 안 돼요',
        answer: '서명 패드에 입력 후 제출 버튼이 활성화되는지 확인하고, 그래도 실패하면 다시 서명 후 재시도하세요.',
    },
    {
        title: '인터뷰가 중간에 끊겼어요',
        answer: '/interview 재접속 시 진행 상태를 다시 불러오며, 동일 단계에서 이어서 제출할 수 있습니다.',
    },
];

export default function OnboardingHelpPage() {
    return (
        <main className="liquid-shell px-4 pb-14 pt-10 sm:px-8 sm:pt-14">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="space-y-3">
                    <div className="liquid-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e6e73]">
                        Onboarding Help
                    </div>
                    <h1 className="liquid-title text-[34px] font-semibold tracking-tight sm:text-[42px]">
                        온보딩 도움말
                    </h1>
                    <p className="liquid-copy text-[15px] sm:text-[16px]">
                        가입부터 인증, 인터뷰 제출까지 막히기 쉬운 지점을 빠르게 해결할 수 있도록 정리했습니다.
                    </p>
                    <div className="flex flex-wrap gap-3">
                        <Button asChild className="h-11 px-5">
                            <Link href="/onboarding">현재 단계로 돌아가기</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/manual">전체 매뉴얼 보기</Link>
                        </Button>
                        <Button asChild variant="outline" className="h-11 px-5">
                            <Link href="/manual/trust-model">Trust Model 보기</Link>
                        </Button>
                    </div>
                </header>

                <section className="liquid-pane rounded-2xl p-5 sm:p-6">
                    <h2 className="liquid-title text-[22px] font-semibold">빠른 체크리스트</h2>
                    <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[#3a3a3c]">
                        <li>회원가입 후 로그인까지 완료했는지 확인</li>
                        <li>본인 인증(KYC) 팝업을 정상적으로 완료했는지 확인</li>
                        <li>자격 제출 단계에서 파일 형식(JPG/PNG/PDF)을 맞췄는지 확인</li>
                        <li>약관 동의 2개 항목을 모두 체크했는지 확인</li>
                        <li>전자서명 입력 후 제출 버튼이 활성화됐는지 확인</li>
                        <li>인터뷰 진행도 완료 후 최종 제출 버튼을 눌렀는지 확인</li>
                    </ul>
                </section>

                <section className="grid gap-4">
                    {TROUBLESHOOTING.map((item) => (
                        <article key={item.title} className="liquid-pane-muted rounded-2xl p-5 sm:p-6">
                            <h3 className="liquid-title text-[20px] font-semibold">{item.title}</h3>
                            <p className="mt-2 text-[14px] text-[#3a3a3c]">{item.answer}</p>
                        </article>
                    ))}
                </section>
            </div>
        </main>
    );
}
