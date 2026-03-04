"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, SupportCTA, Toast, Skeleton, StageTransitionNotice } from '@/components/ui-kit';

interface Message {
    role: 'ai' | 'user';
    content: string;
    topic?: string;
}

export default function InterviewPage() {
    const { status, isLoading: statusLoading, refetch, handleActionError } = useStatus();
    const [messages, setMessages] = useState<Message[]>([]);
    const [answer, setAnswer] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isAITyping, setIsAITyping] = useState(false);
    const [interviewId, setInterviewId] = useState<string | null>(null);
    const [progress, setProgress] = useState({ done: 0, total: 5 });
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const loadInitialInterview = useCallback(async () => {
        setIsAITyping(true);
        try {
            // Trigger first question if no transcript exists
            const res = await fetch('/api/interview/next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ last_answer: null })
            });

            if (!res.ok) throw new Error('FETCH_FAILED');
            const data = await res.json();

            setMessages([{
                role: 'ai',
                content: data.next_question,
                topic: data.topic
            }]);
            setInterviewId(data.interview_id || null);
            setProgress(data.progress || { done: 0, total: 5 });
        } catch {
            handleActionError('SERVER_ERROR');
        } finally {
            setIsAITyping(false);
        }
    }, [handleActionError]);

    // Initial Load: Fetch current interview state
    useEffect(() => {
        if (status?.step === 'AI_INTERVIEW') {
            loadInitialInterview();
        }
    }, [status?.step, loadInitialInterview]);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAITyping]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = answer.trim();
        if (!trimmed || submitting || isAITyping) return;

        // 1. Add User Message to UI
        const userMsg: Message = { role: 'user', content: trimmed };
        setMessages(prev => [...prev, userMsg]);
        setAnswer('');
        setIsAITyping(true);

        try {
            // 2. Get Next Question
            const res = await fetch('/api/interview/next', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interview_id: interviewId, last_answer: trimmed })
            });

            if (!res.ok) throw new Error('SERVER_ERROR');
            const data = await res.json();

            // 3. Add AI Response to UI
            setMessages(prev => [...prev, {
                role: 'ai',
                content: data.next_question,
                topic: data.topic
            }]);
            setInterviewId(data.interview_id || interviewId);
            setProgress(data.progress || progress);

        } catch {
            handleActionError('SERVER_ERROR');
        } finally {
            setIsAITyping(false);
        }
    };

    const handleFinalize = async () => {
        setSubmitting(true);
        setToastMsg(null);

        try {
            const res = await fetch('/api/interview/finalize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Use last message as final context if needed, though backend handles it
                body: JSON.stringify({ final_answer: messages[messages.length - 1]?.content })
            });

            if (!res.ok) throw new Error('SERVER_ERROR');

            setToastMsg({ text: '모든 인터뷰 내역이 감사 로그로 안전하게 기록되었습니다.', type: 'success' });
            await refetch();
        } catch {
            handleActionError('SERVER_ERROR');
        } finally {
            setSubmitting(false);
        }
    };

    if (statusLoading) {
        return (
            <main className="mx-auto max-w-md px-6 pt-24">
                <div className="liquid-pane rounded-3xl p-6">
                    <Skeleton />
                </div>
            </main>
        );
    }

    if (status?.step !== 'AI_INTERVIEW') {
        return (
            <StageTransitionNotice
                currentStep={status?.step}
                title="인터뷰 단계로 이동 중입니다."
                description="답변 기록을 확인하고 현재 진행 가능한 화면으로 안내합니다."
            />
        );
    }

    const isComplete = progress.done >= progress.total;

    return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-28 pt-14 sm:px-6 sm:pt-16">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="liquid-pane liquid-rise flex flex-1 flex-col overflow-hidden rounded-3xl p-5 sm:p-8">
                <Stepper currentStep={6} totalSteps={7} />

                <div className="mb-6">
                    <h1 className="liquid-title text-[22px] font-semibold">사전 1차 평가 인터뷰.</h1>
                    <div className="mt-1 flex items-center justify-between">
                        <p className="liquid-copy text-[14px]">제시된 질문에 빠짐없이 답변바랍니다.</p>
                        <span className="liquid-chip rounded-full px-2.5 py-1 text-[12px] font-medium text-slate-700">진행도: {progress.done}/{progress.total}</span>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] animate-in fade-in slide-in-from-bottom-1 rounded-2xl p-4 text-[15px] leading-relaxed duration-200 ${msg.role === 'ai'
                                ? 'rounded-tl-none border border-slate-200 bg-white text-slate-800 shadow-sm'
                                : 'rounded-tr-none border border-[#1d1d1f] bg-[#1d1d1f] text-white shadow-sm'
                                }`}>
                                {msg.role === 'ai' && msg.topic && (
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{msg.topic}</div>
                                )}
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isAITyping && (
                        <div className="flex justify-start">
                            <div className="flex max-w-[40%] gap-1 rounded-2xl rounded-tl-none border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>
            </div>

            {/* Input Area */}
            <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-[#f5f5f7] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_22px_rgba(0,0,0,0.05)] sm:p-4 sm:pb-8">
                <div className="max-w-md mx-auto">
                    {isComplete ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="liquid-chip mb-4 rounded-xl p-4 text-center">
                                <p className="text-[14px] text-emerald-700 font-medium">충분한 답변이 수집되었습니다. 검증을 완료하고 다음 단계로 이동하시오.</p>
                            </div>
                            <PrimaryButton onClick={handleFinalize} submitting={submitting}>
                                인터뷰 완료 및 제출
                            </PrimaryButton>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="flex gap-3">
                            <input
                                className="liquid-input h-[52px] flex-1 px-4 transition-shadow"
                                placeholder="답변을 입력해주세요..."
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                disabled={submitting || isAITyping}
                            />
                            <button
                                type="submit"
                                disabled={!answer.trim() || submitting || isAITyping}
                                className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-[#1d1d1f] bg-[#1d1d1f] text-white transition-all hover:scale-105 hover:bg-[#2a2a2c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#06c]/25 active:scale-95 disabled:opacity-50"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                            </button>
                        </form>
                    )}
                </div>
            </div>

            <SupportCTA />
        </main>
    );
}
