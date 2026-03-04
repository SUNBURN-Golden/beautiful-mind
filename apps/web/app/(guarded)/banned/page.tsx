'use client';

import { SupportCTA } from '@/components/ui-kit';

export default function BannedPage() {
    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-12 pt-28 text-center">
            <div className="liquid-pane liquid-rise flex flex-1 flex-col items-center rounded-3xl p-8">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100/80">
                    <div className="h-8 w-8 rounded-full border-4 border-red-500 opacity-80" />
                </div>

                <h1 className="liquid-title mb-2 text-[24px] font-semibold">이용이 제한된 계정입니다.</h1>
                <p className="liquid-copy mb-8 text-[15px] leading-relaxed">
                    내부 운영 정책에 따라 플랫폼 접근이 차단되었습니다.<br />
                    제한 사유 조회 및 이의 제기는 고객지원 센터를 통해 접수하실 수 있습니다.
                </p>

                <a href="mailto:support@soulbound.foundation" className="liquid-btn liquid-btn-primary">
                    이의 제기(소명) 신청하기
                </a>
            </div>

            <SupportCTA />
        </main>
    );
}
