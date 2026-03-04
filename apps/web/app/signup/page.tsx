'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { signup } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState = { error: '' };

export default function SignupPage() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(signup, initialState);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">회원가입</CardTitle>
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
                        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? '가입 중...' : '가입하기'}
                        </Button>
                        <Button type="button" variant="outline" disabled={isPending} className="w-full" onClick={() => router.push('/login')}>
                            취소
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
