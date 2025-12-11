import { useState, useEffect, useCallback, useRef } from 'react';

// Types for the API response
export interface KeyObservation {
    title: string;
    insight: string;
}

export interface TopTheme {
    name: string;
    impact: number;
}

export interface InsightData {
    summary: string;
    keyObservations: KeyObservation[];
    criticalTeamsCount: number;
    topTheme: TopTheme;
    engagementTrend: number;
    generatedAt: string;
}

export interface InsightsResponse {
    success: boolean;
    data: InsightData;
}

// Query parameters interface
export interface InsightsParams {
    dateRange?: 'week' | 'month' | 'quarter' | 'year';
}

// Hook return type
export interface UseInsightsReturn {
    data: InsightData | null;
    loading: boolean;
    error: string | null;
    refetch: (params?: InsightsParams) => Promise<void>;
}

const API_BASE_URL = import.meta.env.BACKEND_API || 'http://localhost:8000';

/**
 * Custom hook to fetch AI-generated insights from the backend API
 * @param initialParams - Initial query parameters for the API call
 * @param autoFetch - Whether to automatically fetch data on mount (default: true)
 */
export const useInsights = (
    initialParams?: InsightsParams,
    autoFetch: boolean = true
): UseInsightsReturn => {
    const [data, setData] = useState<InsightData | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Use ref to track if initial fetch has happened
    const hasFetchedRef = useRef(false);

    const fetchInsights = useCallback(async (params?: InsightsParams) => {
        setLoading(true);
        setError(null);

        try {
            // Build query string from parameters
            const queryParams = new URLSearchParams();

            if (params?.dateRange) {
                queryParams.append('dateRange', params.dateRange);
            }

            const queryString = queryParams.toString();
            const url = `${API_BASE_URL}/api/v1/insights${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result: InsightsResponse = await response.json();

            console.log(result, "insights");

            if (result.success) {
                setData(result.data);
            } else {
                throw new Error('API returned success: false');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            console.error('Error fetching insights:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch on mount if enabled - only runs once
    useEffect(() => {
        if (autoFetch && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchInsights(initialParams);
        }
    }, [autoFetch, fetchInsights]);

    return {
        data,
        loading,
        error,
        refetch: fetchInsights,
    };
};

export default useInsights;