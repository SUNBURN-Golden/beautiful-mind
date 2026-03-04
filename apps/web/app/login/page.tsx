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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-2xl text-center">Beautiful Mind</CardTitle>
                    <CardDescription className="text-center">신뢰 증명 서비스에 로그인하세요</CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={formAction} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">이메일</Label>
                            <Input id="email" name="email" type="email" placeholder="m@example.com" required defaultValue="test@example.com" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">비밀번호</Label>
                            <Input id="password" name="password" type="password" required defaultValue="password123" />
                        </div>
                        {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
                        <Button type="submit" disabled={isPending} className="w-full">
                            {isPending ? '로그인 중...' : '로그인'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t p-4">
                    <Button variant="link" onClick={() => router.push('/signup')}>
                        계정이 없으신가요? 회원가입
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
