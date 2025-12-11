import { useState, useEffect } from 'react';
import { SummaryMetrics } from '@/types/dashboard';

// Adjust this to match your actual FastAPI server URL
const API_BASE_URL = 'http://localhost:8000/api/v1';

const DEFAULT_METRICS: SummaryMetrics = {
    avgEngagement: 0,
    engagementTrend: 0,
    teamsAtRisk: 0,
    burnoutAlerts: 0,
    attritionRiskCount: 0,
    feedbackResponseRate: 0,
    totalEmployees: 0
};

export const useSummaryMetrics = (dateRange: string, department?: string) => {
    const [data, setData] = useState<SummaryMetrics>(DEFAULT_METRICS);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMetrics = async () => {
            setLoading(true);
            setError(null);

            try {
                // Construct URL with query parameters
                const url = new URL(`${API_BASE_URL}/metrics/summary`);
                url.searchParams.append('dateRange', dateRange);

                if (department && department !== 'All Departments' && department !== 'all') {
                    url.searchParams.append('department', department);
                }

                const response = await fetch(url.toString());

                if (!response.ok) {
                    throw new Error(`Failed to fetch metrics: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success && result.data) {
                    setData(result.data);
                } else {
                    setData(DEFAULT_METRICS);
                }

            } catch (err: any) {
                console.error("Error fetching summary metrics:", err);
                setError(err.message);
                // Keep showing old data or default data on error to prevent UI collapse
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [dateRange, department]);

    return { data, loading, error };
};