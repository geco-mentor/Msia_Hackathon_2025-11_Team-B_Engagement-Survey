import { useState, useEffect, useCallback } from 'react';

// Types for the API response
export interface TrendDataPoint {
    date: string;
    engagement: number;
    burnout: number;
    attrition: number;
}

export interface TrendResponse {
    success: boolean;
    data: TrendDataPoint[];
}

// Query parameters interface
export interface TrendQueryParams {
    start_date?: string; // YYYY-MM-DD format
    end_date?: string; // YYYY-MM-DD format
    granularity?: 'daily' | 'week' | 'month';
    department?: string;
    position?: string;
    dateRange?: 'daily' | 'week' | 'month';
}

// Hook return type
export interface UseTrendReturn {
    data: TrendDataPoint[] | null;
    loading: boolean;
    error: string | null;
    refetch: (params?: TrendQueryParams) => Promise<void>;
}

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

/**
 * Custom hook to fetch engagement trends from the backend API
 * @param initialParams - Initial query parameters for the API call
 * @param autoFetch - Whether to automatically fetch data on mount (default: true)
 */
export const useTrend = (
    initialParams?: TrendQueryParams,
    autoFetch: boolean = true
): UseTrendReturn => {
    const [data, setData] = useState<TrendDataPoint[] | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchTrends = useCallback(async (params?: TrendQueryParams) => {
        setLoading(true);
        setError(null);

        // MERGE params: Use passed params, fallback to initialParams
        const activeParams = { ...initialParams, ...params };

        try {
            const queryParams = new URLSearchParams();

            if (activeParams.start_date) queryParams.append('start_date', activeParams.start_date);
            if (activeParams.end_date) queryParams.append('end_date', activeParams.end_date);

            // Prioritize explicit granularity, ignore dateRange string here
            if (activeParams.granularity) {
                queryParams.append('granularity', activeParams.granularity);
            }

            if (activeParams.department && activeParams.department !== 'all') {
                queryParams.append('department', activeParams.department);
            }

            if (activeParams.position) {
                queryParams.append('position', activeParams.position);
            }

            const queryString = queryParams.toString();
            const url = `${API_BASE_URL}/trends/engagement?${queryString}`;
            console.log("Fetching URL:", url); // Debugging

            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result: TrendResponse = await response.json();

            if (result.success) {
                setData(result.data);
            } else {
                throw new Error('API returned success: false');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            console.error('Error fetching trend data:', err);
        } finally {
            setLoading(false);
        }
    }, [initialParams]); // Re-create fetch function if initialParams change

    // Effect to trigger fetch when params change
    useEffect(() => {
        if (autoFetch) {
            fetchTrends();
        }
    }, [fetchTrends, autoFetch]);

    return {
        data,
        loading,
        error,
        refetch: fetchTrends,
    };
};

export default useTrend;
