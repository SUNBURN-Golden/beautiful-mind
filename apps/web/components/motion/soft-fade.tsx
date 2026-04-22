'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    MOTION_DURATION_BASE,
    MOTION_EASING,
    usePrefersReducedMotion,
} from './motion-config';

type SoftFadeProps = {
    children: ReactNode;
    className?: string;
    delayMs?: number;
};

type MotionPhase = 'static' | 'prepare' | 'enter';

const FINAL_STYLE: CSSProperties = {
    opacity: 1,
};

export function SoftFade({
    children,
    className,
    delayMs = 0,
}: SoftFadeProps) {
    const prefersReducedMotion = usePrefersReducedMotion();
    const [phase, setPhase] = useState<MotionPhase>('static');

    useLayoutEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || prefersReducedMotion) {
            return undefined;
        }

        let frame = 0;
        setPhase('prepare');
        frame = window.requestAnimationFrame(() => {
            setPhase('enter');
        });

        return () => window.cancelAnimationFrame(frame);
    }, [prefersReducedMotion]);

    return (
        <div
            className={cn(className)}
            style={getSoftFadeStyle({
                phase,
                prefersReducedMotion,
                delayMs,
            })}
        >
            {children}
        </div>
    );
}

function getSoftFadeStyle({
    phase,
    prefersReducedMotion,
    delayMs,
}: {
    phase: MotionPhase;
    prefersReducedMotion: boolean;
    delayMs: number;
}): CSSProperties {
    if (prefersReducedMotion || phase === 'static') {
        return FINAL_STYLE;
    }

    if (phase === 'prepare') {
        return {
            opacity: 0,
            willChange: 'opacity',
        };
    }

    return {
        ...FINAL_STYLE,
        transitionProperty: 'opacity',
        transitionDuration: `${MOTION_DURATION_BASE}ms`,
        transitionTimingFunction: MOTION_EASING,
        transitionDelay: `${Math.max(0, delayMs)}ms`,
        willChange: 'opacity',
    };
}
