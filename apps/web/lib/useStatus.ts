"use client";

import { useCallback, useEffect, useState } from "react";

type Status = {
    step?: string;
    stage?: string;
    error?: string | null;
    meta?: any;
    blockers: string[];
};

export function useStatus() {
    const [status, setStatus] = useState<Status | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const refetch = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/me/status", { cache: "no-store" });
            const json = await res.json();
            setStatus(json);
        } catch (e: any) {
            setStatus({ error: e?.message ?? "unknown error", blockers: [] });
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    const handleActionError = useCallback((e: any) => {
        console.error(e);
    }, []);

    return { status, isLoading, refetch, handleActionError };
}
