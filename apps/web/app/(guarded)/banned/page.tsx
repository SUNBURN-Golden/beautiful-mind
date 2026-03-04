'use client';

import { SupportCTA } from '@/components/ui-kit';

export default function BannedPage() {
    return (
        <main className="max-w-md mx-auto pt-32 px-6 pb-12 flex flex-col min-h-screen text-center">
            <div className="flex-1 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                    <div className="w-8 h-8 rounded-full border-4 border-red-500 opacity-80" />
                </div>

                <h1 className="text-[24px] font-semibold tracking-tight text-[#111111] mb-2">이용이 제한된 계정입니다.</h1>
                <p className="text-[15px] text-[#555555] mb-8 leading-relaxed">
                    내부 운영 정책에 따라 플랫폼 접근이 차단되었습니다.<br />
                    제한 사유 조회 및 이의 제기는 고객지원 센터를 통해 접수하실 수 있습니다.
                </p>

                <a href="mailto:support@beautifulmind.com" className="w-full h-12 flex items-center justify-center rounded-lg bg-[#0F172A] text-white font-medium text-[15px] transition-opacity hover:opacity-90 shadow-sm">
                    이의 제기(소명) 신청하기
                </a>
            </div>

            <SupportCTA />
        </main>
    );
}
