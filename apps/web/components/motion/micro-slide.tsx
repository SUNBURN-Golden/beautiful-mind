'use client';

import type { CSSProperties, ReactNode } from 'react';
import { useLayoutEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    MOTION_DISTANCE_SM,
    MOTION_DURATION_BASE,
    MOTION_EASING,
    usePrefersReducedMotion,
} from './motion-config';

type MicroSlideProps = {
    children: ReactNode;
    className?: string;
    delayMs?: number;
    axis?: 'x' | 'y';
    distance?: 8 | 12 | 16;
};

type MotionPhase = 'static' | 'prepare' | 'enter';

const FINAL_STYLE: CSSProperties = {
    transform: 'translate3d(0, 0, 0)',
};

export function MicroSlide({
    children,
    className,
    delayMs = 0,
    axis = 'y',
    distance = MOTION_DISTANCE_SM,
}: MicroSlideProps) {
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
            style={getMicroSlideStyle({
                phase,
                prefersReducedMotion,
                delayMs,
                axis,
                distance,
            })}
        >
            {children}
        </div>
    );
}

function getMicroSlideStyle({
    phase,
    prefersReducedMotion,
    delayMs,
    axis,
    distance,
}: {
    phase: MotionPhase;
    prefersReducedMotion: boolean;
    delayMs: number;
    axis: 'x' | 'y';
    distance: 8 | 12 | 16;
}): CSSProperties {
    if (prefersReducedMotion || phase === 'static') {
        return FINAL_STYLE;
    }

    const translation =
        axis === 'x'
            ? `translate3d(${distance}px, 0, 0)`
            : `translate3d(0, ${distance}px, 0)`;

    if (phase === 'prepare') {
        return {
            transform: translation,
            willChange: 'transform',
        };
    }

    return {
        ...FINAL_STYLE,
        transitionProperty: 'transform',
        transitionDuration: `${MOTION_DURATION_BASE}ms`,
        transitionTimingFunction: MOTION_EASING,
        transitionDelay: `${Math.max(0, delayMs)}ms`,
        willChange: 'transform',
    };
}
