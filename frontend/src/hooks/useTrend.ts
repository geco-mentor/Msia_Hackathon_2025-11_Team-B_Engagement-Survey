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
    granularity?: 'daily' | 'weekly' | 'monthly';
    department?: string;
    position?: string;
    dateRange?: 'daily' | 'weekly' | 'monthly';
}

// Hook return type
export interface UseTrendReturn {
    data: TrendDataPoint[] | null;
    loading: boolean;
    error: string | null;
    refetch: (params?: TrendQueryParams) => Promise<void>;
}

const API_BASE_URL = import.meta.env.BACKEND_API || 'http://127.0.0.1:8000/api/v1';

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

        try {
            // Build query string from parameters
            const queryParams = new URLSearchParams();

            if (params?.start_date) {
                queryParams.append('start_date', params.start_date);
            }

            if (params?.end_date) {
                queryParams.append('end_date', params.end_date);
            }

            if (params?.granularity) {
                queryParams.append('granularity', params.granularity || params.dateRange);
            }

            if (params?.department) {
                queryParams.append('department', params.department);
            }

            if (params?.position) {
                queryParams.append('position', params.position);
            }

            const queryString = queryParams.toString();
            const url = `${API_BASE_URL}/trends/engagement?${queryString}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result: TrendResponse = await response.json();

            console.log(result, "result")

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
    }, []);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            fetchTrends(initialParams);
        }
    }, [autoFetch, initialParams, fetchTrends]);

    return {
        data,
        loading,
        error,
        refetch: fetchTrends,
    };
};

export default useTrend;
