import { useState, useEffect, useCallback, useRef } from 'react';

// Types for the API response
export interface ThemeSample {
    id: string;
    theme: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    frequency: number;
    trend: 'up' | 'down' | 'stable';
    impactScore: number;
    lastDetected: string;
}

export interface FeedbackSamplesResponse {
    success: boolean;
    data: ThemeSample[];
}

// Query parameters interface
export interface FeedbackSamplesParams {
    dateRange?: 'week' | 'month' | 'quarter' | 'year';
    sentiment?: 'positive' | 'negative' | 'neutral';
}

// Hook return type
export interface UseFeedbackSamplesReturn {
    data: ThemeSample[] | null;
    loading: boolean;
    error: string | null;
    refetch: (params?: FeedbackSamplesParams) => Promise<void>;
}

const API_BASE_URL = import.meta.env.BACKEND_API || 'http://127.0.0.1:8000/api/v1';

/**
 * Custom hook to fetch feedback samples (themes) from the backend API
 * @param initialParams - Initial query parameters for the API call
 * @param autoFetch - Whether to automatically fetch data on mount (default: true)
 */
export const useThemeSamples = (
    initialParams?: FeedbackSamplesParams,
    autoFetch: boolean = true
): UseFeedbackSamplesReturn => {
    const [data, setData] = useState<ThemeSample[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Use ref to track if initial fetch has happened
    const hasFetchedRef = useRef(false);

    const fetchFeedbackSamples = useCallback(async (params?: FeedbackSamplesParams) => {
        setLoading(true);
        setError(null);

        try {
            // Build query string from parameters
            const queryParams = new URLSearchParams();

            if (params?.dateRange) {
                queryParams.append('dateRange', params.dateRange);
            }

            if (params?.sentiment) {
                queryParams.append('sentiment', params.sentiment);
            }

            const queryString = queryParams.toString();
            const url = `${API_BASE_URL}/themes?${queryString}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result: FeedbackSamplesResponse = await response.json();

            if (result.success) {
                setData(result.data);
            } else {
                throw new Error('API returned success: false');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            console.error('Error fetching feedback samples:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch on mount if enabled - only runs once
    useEffect(() => {
        if (autoFetch && !hasFetchedRef.current) {
            hasFetchedRef.current = true;
            fetchFeedbackSamples(initialParams);
        }
    }, [autoFetch, fetchFeedbackSamples]);

    return {
        data,
        loading,
        error,
        refetch: fetchFeedbackSamples,
    };
};

export default useThemeSamples;
