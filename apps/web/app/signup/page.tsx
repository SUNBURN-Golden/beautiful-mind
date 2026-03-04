'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { signup } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState = { error: '', success: false };

export default function SignupPage() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(signup, initialState);

    React.useEffect(() => {
        if (state?.success) {
            router.push('/login');
        }
    }, [state, router]);

    return (
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="liquid-rise w-full max-w-md border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-center text-3xl font-semibold tracking-tight">회원가입</CardTitle>
                    <CardDescription className="text-center">이 단계는 10-step 에서 회원가입 플로우를 나타냅니다.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">이름 (현재 모의 데이터)</Label>
                            <Input id="name" name="name" required placeholder="홍길동" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input id="email" name="email" type="email" required placeholder="m@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input id="password" name="password" type="password" required />
                        </div>
                        {state?.error && <p className="text-sm text-[#b42318]">{state.error}</p>}
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? '가입 중...' : '가입하기'}
                        </Button>
                        <Button type="button" variant="outline" disabled={isPending} className="w-full" onClick={() => router.push('/login')}>
                            취소
                        </Button>
                        <Button type="button" variant="link" disabled={isPending} className="w-full" onClick={() => router.push('/manual')}>
                            가입 전에 이용 매뉴얼 보기
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
