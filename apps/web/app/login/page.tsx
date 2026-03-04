'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useActionState } from 'react';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialState = { error: '' };

export default function LoginPage() {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(login, initialState);

    return (
        <div className="liquid-shell flex min-h-screen items-center justify-center p-4 sm:p-6">
            <Card className="liquid-rise w-full max-w-md border-[#e5e5e7]">
                <CardHeader>
                    <CardTitle className="text-center text-3xl font-semibold tracking-tight">SoulBound</CardTitle>
                    <CardDescription className="text-center">신뢰 증명 서비스에 로그인하세요</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required data-testid="login-email" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input id="password" name="password" type="password" required data-testid="login-password" />
                        </div>
                        {state?.error && <p className="text-sm text-[#b42318]">{state.error}</p>}
                        <Button type="submit" disabled={isPending} className="w-full" data-testid="login-submit">
                            {isPending ? '로그인 중...' : '로그인'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-[#e5e5e7] p-4">
                    <Button variant="link" onClick={() => router.push('/signup')}>
                        계정이 없으신가요? 회원가입
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
