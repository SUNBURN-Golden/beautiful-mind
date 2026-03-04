"use client";

import { useCallback, useEffect, useState } from "react";

type JsonObject = Record<string, unknown>;

type Status = {
    step?: string;
    stage?: string;
    error?: string | null;
    meta?: JsonObject;
    details?: JsonObject;
    blockers: string[];
};

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

export function useStatus() {
    const [status, setStatus] = useState<Status | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/me/status", { cache: "no-store" });
            const payload: unknown = await res.json();

            if (!res.ok) {
                if (res.status === 401 && typeof window !== 'undefined') {
                    window.location.assign('/login');
                }
                throw new Error(parseStatusError(payload));
            }

            setStatus(parseStatusPayload(payload));
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "unknown error";
            setStatus({ error: message, blockers: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const handleActionError = useCallback((e: unknown) => {
        console.error(e);
    }, []);

    return { status, isLoading, refetch, handleActionError };
}
