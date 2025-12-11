import { useState, useEffect, useCallback } from 'react';

// Types for the API response
export interface FilterOptions {
    departments: string[];
    positions: string[];
    jobGrades: string[];
    employeeLevels: string[];
}

export interface FilterResponse {
    success: boolean;
    data: FilterOptions;
}

// Hook return type
export interface UseFiltersReturn {
    data: FilterOptions | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const API_BASE_URL = import.meta.env.BACKEND_API || 'http://127.0.0.1:8000/api/v1';

/**
 * Custom hook to fetch filter options from the backend API
 * @param autoFetch - Whether to automatically fetch data on mount (default: true)
 */
export const useFilters = (autoFetch: boolean = true): UseFiltersReturn => {
    const [data, setData] = useState<FilterOptions | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchFilters = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const url = `${API_BASE_URL}/filters`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const result: FilterResponse = await response.json();

            if (result.success) {
                setData(result.data);
            } else {
                throw new Error('API returned success: false');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            console.error('Error fetching filter options:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-fetch on mount if enabled
    useEffect(() => {
        if (autoFetch) {
            fetchFilters();
        }
    }, [autoFetch, fetchFilters]);

    return {
        data,
        loading,
        error,
        refetch: fetchFilters,
    };
};

export default useFilters;
