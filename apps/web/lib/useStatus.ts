"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import {
    getStatusStage,
    parseStatusContract,
    parseStatusErrorCode,
    type ClientStatusContract,
} from '@/lib/contracts/status-contract';

export type Status = ClientStatusContract;

type UseStatusOptions = {
    refreshIntervalMs?: number;
    redirectOnUnauthorized?: boolean;
};

const STATUS_FETCH_TIMEOUT_MS = 10_000;

function createFetcher(redirectOnUnauthorized: boolean) {
    return async (url: string): Promise<Status> => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), STATUS_FETCH_TIMEOUT_MS);
        try {
            const res = await fetch(url, { cache: "no-store", signal: controller.signal });
            const payload = await res.json();
            if (!res.ok) {
                if (res.status === 401 && redirectOnUnauthorized && typeof window !== 'undefined') {
                    window.location.assign('/login');
                }
                throw new Error(parseStatusErrorCode(payload));
            }
            return parseStatusContract(payload);
        } catch (e) {
            if (e instanceof DOMException && e.name === 'AbortError') {
                throw new Error('STATUS_TIMEOUT');
            }
            throw e;
        } finally {
            window.clearTimeout(timeoutId);
        }
    };
}

export function useStatus(options: UseStatusOptions = {}) {
    const { refreshIntervalMs = 0, redirectOnUnauthorized = true } = options;
    const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
    const fetcher = useMemo(() => createFetcher(redirectOnUnauthorized), [redirectOnUnauthorized]);

    const { data, error, mutate, isValidating } = useSWR<Status, Error>('/api/me/status', fetcher, {
        refreshInterval: refreshIntervalMs,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        shouldRetryOnError: false,
        keepPreviousData: true,
    });

    useEffect(() => {
        if (data) {
            setLastUpdatedAt(Date.now());
        }
    }, [data]);

    const handleActionError = useCallback((e: unknown) => {
        console.error(e);
    }, []);

    const resolvedStatus = data || (error ? { error: error.message, blockers: [] } : null);
    const currentStage = getStatusStage(resolvedStatus) || undefined;

    return {
        status: resolvedStatus,
        currentStage,
        isLoading: !data && !error,
        isRefreshing: isValidating && Boolean(data),
        lastUpdatedAt,
        refetch: mutate,
        handleActionError
    };
}
