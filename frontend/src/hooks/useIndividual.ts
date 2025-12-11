import { useState, useEffect, useCallback } from 'react';

// Adjust this base URL to match your FastAPI server address
const API_BASE_URL = 'http://localhost:8000/api/v1';

export const useIndividual = (initialLimit = 20, department) => {
    // Paginated Data State
    const [data, setData] = useState([]);

    // Full Data State (For Hotspots/Dashboard)
    const [allEmployees, setAllEmployees] = useState([]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Pagination State
    const [nextToken, setNextToken] = useState(null);
    const [tokenHistory, setTokenHistory] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(initialLimit);

    /**
     * 1. Fetch Paginated Data (Existing)
     */
    const fetchEmployees = useCallback(async (token = null) => {
        setLoading(true);
        setError(null);

        try {
            const url = new URL(`${API_BASE_URL}/employees/`);
            url.searchParams.append('limit', limit.toString());
            if (token) {
                url.searchParams.append('next_token', token);
            }
            if (department && department !== 'All Departments' && department !== 'all') {
                url.searchParams.append('department', department);
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            setData(result.data);
            setNextToken(result.pagination.next_token);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [limit]);

    const fetchAllEmployees = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Construct URL object to easily add params
            const url = new URL(`${API_BASE_URL}/employees/all`);

            // Apply department filter if selected
            if (department && department !== 'All Departments' && department !== 'all') {
                url.searchParams.append('departments', department);
            }

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            // result.data contains the full list
            setAllEmployees(result.data);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [department]);

    const generateRecommendations = useCallback(async (employeeId) => {
        // We don't set global 'loading' here to avoid flickering the whole dashboard.
        // We return the promise so the specific Modal can show its own loading state.
        try {
            const response = await fetch(`${API_BASE_URL}/employees/${employeeId}/recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to generate recommendations');
            }

            const result = await response.json();
            return result.recommendations; // Returns array of 3 actions

        } catch (err) {
            console.error(err);
            throw err;
        }
    }, []);


    useEffect(() => {
        fetchEmployees(null);
    }, [fetchEmployees]);

    /**
     * Pagination Handlers
     */
    const goToNextPage = () => {
        if (nextToken) {
            setTokenHistory((prev) => [...prev, nextToken]);
            fetchEmployees(nextToken);
            setCurrentPage((prev) => prev + 1);
        }
    };

    const goToPreviousPage = () => {
        if (tokenHistory.length > 0) {
            const newHistory = [...tokenHistory];
            newHistory.pop();
            const prevToken = newHistory.length > 0 ? newHistory[newHistory.length - 1] : null;
            fetchEmployees(prevToken);
            setTokenHistory(newHistory);
            setCurrentPage((prev) => prev - 1);
        }
    };

    const resetPagination = () => {
        setTokenHistory([]);
        setCurrentPage(1);
        fetchEmployees(null);
    };

    return {
        employees: data,       // The Paginated List
        allEmployees,          // The Full List (New)
        loading,
        error,
        pagination: {
            currentPage,
            hasNextPage: !!nextToken,
            hasPrevPage: currentPage > 1,
            goToNextPage,
            goToPreviousPage,
            resetPagination
        },
        refresh: () => {
            const currentToken = tokenHistory.length > 0 ? tokenHistory[tokenHistory.length - 1] : null;
            fetchEmployees(currentToken);
        },
        fetchAllEmployees,
        generateRecommendations
    };
};