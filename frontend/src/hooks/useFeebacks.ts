import { error } from 'console';
import { useState, useEffect, useCallback } from 'react';

// 1. Define the shape of a single feedback item
export interface FeedbackItem {
    id: string;
    text: string;
    sentiment: string; // e.g., "Positive", "Neutral", "Negative"
    theme: string;
    detectedAt: string; // ISO Date string
    department: string;
    position: string;
}




// 2. Define the shape of the API Response
interface FeedbackResponse {
    success: boolean;
    data: FeedbackItem[];
}

// 3. Define the return shape of the Hook
interface UseFeedbacksResult {
    feedbacks: FeedbackItem[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

// Base URL (Adjust if you have an environment variable)
const API_BASE_URL = import.meta.env.BACKEND_API || "http://127.0.0.1:8000/api/v1";

export const useFeedbacks = (dateRange: string = 'year'): UseFeedbacksResult => {
    const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFeedbacks = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            // Construct URL with query parameter
            const url = new URL(API_BASE_URL + '/feedback/samples?dateRange=' + dateRange);

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }

            const result: FeedbackResponse = await response.json();

            if (result.success) {
                setFeedbacks(result.data as FeedbackItem[]);
            } else {
                // Handle cases where API returns 200 OK but success: false
                setError('Failed to retrieve feedback data.');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setFeedbacks([]); // Clear data on error or keep previous? Usually clear or keep stale.
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    // Initial Fetch when dateRange changes
    useEffect(() => {
        fetchFeedbacks();
    }, [fetchFeedbacks]);

    return { feedbacks, loading, error, refetch: fetchFeedbacks };
};

interface MentionsItem {
    totalMentions: number;
    positiveThemes: number;
    negativeThemes: number;
    neutralThemes: number;
    detectedThemes: number;
}
interface MentionsResponse {
    success: boolean;
    data: MentionsItem;  // Change from MentionsItem[] to MentionsItem
}

interface UseMentionsResult {
    mentions: MentionsItem | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useMentions = (dateRange: string = 'year'): UseMentionsResult => {
    const [mentions, setMentions] = useState<MentionsItem | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMentions = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const mentionsUrl = new URL(API_BASE_URL + '/feedback/summary?dateRange=' + dateRange);
            const mentionsResponse = await fetch(mentionsUrl.toString());

            if (!mentionsResponse.ok) {
                throw new Error(`Error ${mentionsResponse.status}: ${mentionsResponse.statusText}`);
            }

            const mentionsResult: MentionsResponse = await mentionsResponse.json();

            if (mentionsResult.success) {
                setMentions(mentionsResult.data);  // Directly set data, no array indexing
            } else {
                setError('Failed to retrieve mentions data.');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred');
            setMentions(null);
        } finally {
            setLoading(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchMentions();
    }, [fetchMentions]);

    return { mentions, loading, error, refetch: fetchMentions };
};

