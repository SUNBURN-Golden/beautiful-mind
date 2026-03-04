"use client";

import { useCallback } from "react";
import useSWR from "swr";

type JsonObject = Record<string, unknown>;

type Status = {
    step?: string;
    stage?: string;
    error?: string | null;
    meta?: JsonObject;
    details?: JsonObject;
    blockers: string[];
};

const STATUS_FETCH_TIMEOUT_MS = 10_000;

function parseStatusPayload(payload: unknown): Status {
    if (typeof payload !== 'object' || payload === null) {
        return { error: 'Invalid status payload', blockers: [] };
    }

    const obj = payload as JsonObject;
    return {
        step: typeof obj.step === 'string' ? obj.step : undefined,
        stage: typeof obj.stage === 'string' ? obj.stage : undefined,
        error: typeof obj.error === 'string' ? obj.error : null,
        meta: typeof obj.meta === 'object' && obj.meta !== null ? (obj.meta as JsonObject) : undefined,
        details: typeof obj.details === 'object' && obj.details !== null ? (obj.details as JsonObject) : undefined,
        blockers: Array.isArray(obj.blockers)
            ? obj.blockers.filter((item): item is string => typeof item === 'string')
            : [],
    };
}

function parseStatusError(payload: unknown): string {
    if (typeof payload !== 'object' || payload === null) {
        return 'STATUS_FETCH_FAILED';
    }

    const obj = payload as JsonObject;
    if (typeof obj.error === 'string') {
        return obj.error;
    }

    if (typeof obj.error === 'object' && obj.error !== null && typeof (obj.error as JsonObject).code === 'string') {
        return (obj.error as JsonObject).code as string;
    }

    return 'STATUS_FETCH_FAILED';
}

const fetcher = async (url: string): Promise<Status> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), STATUS_FETCH_TIMEOUT_MS);
    try {
        const res = await fetch(url, { cache: "no-store", signal: controller.signal });
        const payload = await res.json();
        if (!res.ok) {
            if (res.status === 401 && typeof window !== 'undefined') {
                window.location.assign('/login');
            }
            throw new Error(parseStatusError(payload));
        }
        return parseStatusPayload(payload);
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') {
            throw new Error('STATUS_TIMEOUT');
        }
        throw e;
    } finally {
        window.clearTimeout(timeoutId);
    }
};

export function useStatus() {
    const { data, error, mutate } = useSWR<Status, Error>('/api/me/status', fetcher, {
        revalidateOnFocus: true,
        shouldRetryOnError: false,
    });

    const handleActionError = useCallback((e: unknown) => {
        console.error(e);
    }, []);

    const resolvedStatus = data || (error ? { error: error.message, blockers: [] } : null);

    return {
        status: resolvedStatus,
        isLoading: !data && !error,
        refetch: mutate,
        handleActionError
    };
}
