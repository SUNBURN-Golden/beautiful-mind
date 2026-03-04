"use client";

import { useState, useEffect, useRef } from 'react';
import { useStatus } from '@/lib/useStatus';
import { Stepper, PrimaryButton, SupportCTA, Toast, Skeleton } from '@/components/ui-kit';

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
    const [progress, setProgress] = useState({ done: 0, total: 5 });
    const [toastMsg, setToastMsg] = useState<{ text: string, type: 'info' | 'error' | 'success' } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Initial Load: Fetch current interview state
    useEffect(() => {
        if (status?.step === 'AI_INTERVIEW') {
            loadInitialInterview();
        }
    }, [status?.step]);

    // Auto-scroll to bottom
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAITyping]);

    const loadInitialInterview = async () => {
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
            setProgress(data.progress || { done: 0, total: 5 });
        } catch (err: any) {
            handleActionError('SERVER_ERROR');
        } finally {
            setIsAITyping(false);
        }
    };

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
                body: JSON.stringify({ last_answer: trimmed })
            });

            if (!res.ok) throw new Error('SERVER_ERROR');
            const data = await res.json();

            // 3. Add AI Response to UI
            setMessages(prev => [...prev, {
                role: 'ai',
                content: data.next_question,
                topic: data.topic
            }]);
            setProgress(data.progress || progress);

        } catch (err: any) {
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
        } catch (err: any) {
            handleActionError('SERVER_ERROR');
            setSubmitting(false);
        }
    };

    if (statusLoading || status?.step !== 'AI_INTERVIEW') {
        return <main className="max-w-md mx-auto pt-24 px-6"><Skeleton /></main>;
    }

    const isComplete = progress.done >= progress.total;

    return (
        <main className="max-w-md mx-auto pt-16 px-6 pb-24 flex flex-col min-h-screen">
            {toastMsg && <Toast message={toastMsg.text} type={toastMsg.type} />}

            <div className="flex-1 overflow-hidden flex flex-col">
                <Stepper currentStep={6} totalSteps={7} />

                <div className="mb-6">
                    <h1 className="text-[22px] font-semibold tracking-tight text-[#111111]">사전 1차 평가 인터뷰.</h1>
                    <div className="flex justify-between items-center mt-1">
                        <p className="text-[14px] text-[#555555]">제시된 질문에 빠짐없이 답변바랍니다.</p>
                        <span className="text-[12px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">진행도: {progress.done}/{progress.total}</span>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="flex-1 space-y-4 mb-4 overflow-y-auto pr-2 scrollbar-hide">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-[15px] leading-relaxed ${msg.role === 'ai'
                                ? 'bg-slate-100 text-[#111111] rounded-tl-none border border-slate-200'
                                : 'bg-[#0F172A] text-white rounded-tr-none'
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
                            <div className="max-w-[40%] p-4 rounded-2xl bg-slate-50 border border-slate-100 rounded-tl-none flex gap-1">
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
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 p-4 pb-8 z-10">
                <div className="max-w-md mx-auto">
                    {isComplete ? (
                        <div className="animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-center p-4 bg-emerald-50 rounded-xl border border-emerald-100 mb-4">
                                <p className="text-[14px] text-emerald-700 font-medium">충분한 답변이 수집되었습니다. 검증을 완료하고 다음 단계로 이동하시오.</p>
                            </div>
                            <PrimaryButton onClick={handleFinalize} submitting={submitting}>
                                인터뷰 완료 및 제출
                            </PrimaryButton>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="flex gap-2">
                            <input
                                className="flex-1 h-12 rounded-lg border border-[#E5E5E5] bg-white px-4 text-[15px] text-[#111111] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                                placeholder="답변을 입력해주세요..."
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                disabled={submitting || isAITyping}
                            />
                            <button
                                type="submit"
                                disabled={!answer.trim() || submitting || isAITyping}
                                className="w-12 h-12 rounded-lg bg-[#0F172A] text-white flex items-center justify-center disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
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
