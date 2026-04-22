'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    MOTION_DISTANCE_SM,
    MOTION_DURATION_SLOW,
    MOTION_EASING,
    usePrefersReducedMotion,
} from './motion-config';

type BlurRevealProps = {
    children: ReactNode;
    className?: string;
    delayMs?: number;
    distance?: 0 | 8 | 12;
    blurPx?: 0 | 4 | 6;
};

type MotionPhase = 'static' | 'prepare' | 'enter';

const FINAL_STYLE: CSSProperties = {
    opacity: 1,
    filter: 'blur(0px)',
    transform: 'translate3d(0, 0, 0)',
};

export function BlurReveal({
    children,
    className,
    delayMs = 0,
    distance = MOTION_DISTANCE_SM,
    blurPx = 4,
}: BlurRevealProps) {
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
            style={getBlurRevealStyle({
                phase,
                prefersReducedMotion,
                delayMs,
                distance,
                blurPx,
            })}
        >
            {children}
        </div>
    );
}

function getBlurRevealStyle({
    phase,
    prefersReducedMotion,
    delayMs,
    distance,
    blurPx,
}: {
    phase: MotionPhase;
    prefersReducedMotion: boolean;
    delayMs: number;
    distance: 0 | 8 | 12;
    blurPx: 0 | 4 | 6;
}): CSSProperties {
    if (prefersReducedMotion || phase === 'static') {
        return FINAL_STYLE;
    }

    if (phase === 'prepare') {
        return {
            opacity: 0,
            filter: `blur(${blurPx}px)`,
            transform: `translate3d(0, ${distance}px, 0)`,
            willChange: 'opacity, filter, transform',
        };
    }

    return {
        ...FINAL_STYLE,
        transitionProperty: 'opacity, filter, transform',
        transitionDuration: `${MOTION_DURATION_SLOW}ms`,
        transitionTimingFunction: MOTION_EASING,
        transitionDelay: `${Math.max(0, delayMs)}ms`,
        willChange: 'opacity, filter, transform',
    };
}
