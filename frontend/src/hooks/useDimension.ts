import { useState, useEffect, useCallback } from 'react';

// Types based on the API response provided
interface DimensionApiResponse {
    success: boolean;
    data: {
        [key: string]: string | number; // Allow dynamic access
        Employee_ID: string;
        position: string;
        metrics_updated_at: string;
    };
}

export interface DimensionDataPoint {
    subject: string;
    score: number;
    fullKey: string;
}

const API_BASE_URL = import.meta.env.BACKEND_API || 'http://localhost:8000/api/v1';

export const useDimension = (employeeId: string) => {
    const [radarData, setRadarData] = useState<DimensionDataPoint[]>([]);
    const [rankedDimensions, setRankedDimensions] = useState<DimensionDataPoint[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchDimensions = useCallback(async () => {
        setLoading(true);
        try {
            console.log(API_BASE_URL)
            const res = await fetch(`${API_BASE_URL}/metrics/dimensions/${employeeId}`);
            const response = await res.json();

            // Simulating the API delay
            await new Promise(resolve => setTimeout(resolve, 500));


            if (response.success && response.data) {
                const rawData = response.data;

                // 1. Filter and Transform keys starting with "Dim_"
                const dimensions: DimensionDataPoint[] = Object.keys(rawData)
                    .filter(key => key.startsWith('Dim_'))
                    .map(key => {
                        // Remove prefix and replace underscores with spaces
                        const label = key.replace('Dim_', '').replace(/_/g, ' ');
                        return {
                            subject: label,
                            score: Number(rawData[key]), // Ensure it's a number
                            fullKey: key
                        };
                    });

                setRadarData(dimensions);

                // 2. Create a sorted copy for the Breakdown list (Highest score first)
                const sorted = [...dimensions].sort((a, b) => b.score - a.score);
                setRankedDimensions(sorted);
            }

        } catch (error) {
            console.error("Failed to fetch dimensions:", error);
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        fetchDimensions();
    }, [fetchDimensions]);

    return { radarData, rankedDimensions, loading, refetch: fetchDimensions };
};