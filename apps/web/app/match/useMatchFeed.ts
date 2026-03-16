'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMatchCandidates, type MatchCandidate, type ContractSource } from '@/lib/active-contract';
import { useStatus } from '@/lib/useStatus';

export function useMatchFeed() {
    const { isLoading: statusLoading, currentStage } = useStatus();
    const stage = currentStage;

    const [matches, setMatches] = useState<MatchCandidate[]>([]);
    const [source, setSource] = useState<ContractSource | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadMatches = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetchMatchCandidates();
            setMatches(response.data);
            setSource(response.source);
        } catch (loadError: unknown) {
            const message = loadError instanceof Error ? loadError.message : 'MATCH_LOAD_FAILED';
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadMatches();
    }, [loadMatches]);

    return {
        stage,
        statusLoading,
        matches,
        loading,
        error,
        source,
        loadMatches,
    };
}
