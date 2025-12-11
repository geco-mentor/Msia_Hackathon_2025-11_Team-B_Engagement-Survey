import { useState, useEffect, useCallback } from 'react';

// Define the shape of the API response item
export interface TeamMetric {
    id: string;
    position: string;
    department: string;
    location: string;
    employeeCount: number;
    engagementScore: number;
    burnoutRisk: 'healthy' | 'watch' | 'warning' | 'critical';
    attritionRisk: 'healthy' | 'watch' | 'warning' | 'critical';
    overallRisk: 'healthy' | 'watch' | 'warning' | 'critical';
    trend: 'stable' | 'up' | 'down';
    topDrivers: string[];
    lastUpdated: string;
}

interface TeamResponse {
    success: boolean;
    data: TeamMetric[];
}

const API_URL = 'http://127.0.0.1:8000/api/v1/team';

export const useTeam = () => {
    const [teams, setTeams] = useState<TeamMetric[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchTeams = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.statusText}`);
            }
            const result: TeamResponse = await response.json();

            if (result.success) {
                setTeams(result.data);
            } else {
                setError('API returned unsuccessful response');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTeams();
    }, [fetchTeams]);

    return { teams, loading, error, refetch: fetchTeams };
};