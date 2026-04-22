import { useSyncExternalStore } from 'react';

export const MOTION_DURATION_FAST = 120;
export const MOTION_DURATION_BASE = 160;
export const MOTION_DURATION_SLOW = 220;
export const MOTION_DISTANCE_SM = 8;
export const MOTION_DISTANCE_MD = 12;
export const MOTION_DISTANCE_LG = 16;
export const MOTION_EASING = 'cubic-bezier(0.22, 0, 0.18, 1)';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onStoreChange: () => void) {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return () => undefined;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    const listener = () => onStoreChange();

    if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', listener);
        return () => mediaQuery.removeEventListener('change', listener);
    }

    mediaQuery.addListener(listener);
    return () => mediaQuery.removeListener(listener);
}

function getSnapshot() {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerSnapshot() {
    return false;
}

export function usePrefersReducedMotion() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
