import { useState, useCallback } from 'react';
import axios from 'axios';

// Ensure this matches your Vite/Next.js proxy setup
const N8N_WEBHOOK_URL = '/n8n-api/webhook-test/pulse-survey-ai-predict';

interface UploadStats {
    total_records: number;
    high_risk_alerts: number;
    critical_alerts: number;
    processed_at?: string;
}

interface N8nResponse {
    success: boolean;
    message: string;
    stats?: UploadStats;
    [key: string]: any;
}

interface UseCsvUploadReturn {
    uploadCsv: (file: File) => Promise<void>;
    isUploading: boolean;
    error: string | null;
    response: N8nResponse | null;
    resetState: () => void;
}

export const useCsvUpload = (): UseCsvUploadReturn => {
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [response, setResponse] = useState<N8nResponse | null>(null);

    const uploadCsv = useCallback(async (file: File) => {
        setIsUploading(true);
        setError(null);
        setResponse(null);

        try {
            console.log(`📁 Reading CSV file: ${file.name}`);

            // 1. Validate File Type
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                throw new Error('Please upload a valid CSV file.');
            }

            // 2. Read File Content
            const csvContent = await file.text();

            if (!csvContent || csvContent.trim().length === 0) {
                throw new Error('The CSV file is empty.');
            }

            console.log(`📤 Uploading to n8n via Axios: ${N8N_WEBHOOK_URL}`);

            // 3. Send using Axios (Wrapped in JSON)
            // We wrap the content in a key called 'csv_content' so n8n sees it as a JSON property
            const res = await axios.post<N8nResponse>(
                N8N_WEBHOOK_URL,
                {
                    csv_content: csvContent
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    timeout: 300000, // 5 minutes timeout
                }
            );

            console.log('✅ Upload successful!', res.data);
            setResponse(res.data);

        } catch (err: any) {
            console.error('❌ Upload failed:', err);

            let errorMessage = 'An unexpected error occurred.';

            if (axios.isAxiosError(err)) {
                if (err.response) {
                    // Server returned an error code (4xx, 5xx)
                    // Try to extract the message from n8n response if available
                    const serverMsg = err.response.data?.message || JSON.stringify(err.response.data);
                    errorMessage = `Server Error (${err.response.status}): ${serverMsg}`;
                } else if (err.request) {
                    // Request was sent but no response received (CORS or Network)
                    errorMessage = 'Network Error. Please check if n8n is running and the Proxy is configured.';
                } else {
                    errorMessage = err.message;
                }
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }

            setError(errorMessage);
        } finally {
            setIsUploading(false);
        }
    }, []);

    const resetState = useCallback(() => {
        setError(null);
        setResponse(null);
        setIsUploading(false);
    }, []);

    return { uploadCsv, isUploading, error, response, resetState };
};