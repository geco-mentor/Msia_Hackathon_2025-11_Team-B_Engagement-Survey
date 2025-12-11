import { useState, useCallback } from 'react';

interface UploadTask {
    task_id: string;
    message: string;
}

interface UploadStatus {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    message: string;
    result?: {
        status: string;
        filename: string;
        total_rows_processed: number;
        total_rows_saved: number;
        message: string;
        sample_data: any[];
    };
}

interface UseUploadReturn {
    uploadFile: (file: File) => Promise<void>;
    status: UploadStatus | null;
    isUploading: boolean;
    error: string | null;
    progress: number;
    reset: () => void;
}

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export const useUpload = (): UseUploadReturn => {
    const [status, setStatus] = useState<UploadStatus | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const pollStatus = useCallback(async (taskId: string): Promise<void> => {
        const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
        let attempts = 0;

        const poll = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/upload/status/${taskId}`);

                if (!response.ok) {
                    throw new Error(`Failed to fetch status: ${response.statusText}`);
                }

                const statusData: UploadStatus = await response.json();
                setStatus(statusData);

                // Update progress based on status
                if (statusData.status === 'pending') {
                    setProgress(25);
                } else if (statusData.status === 'processing') {
                    setProgress(50);
                } else if (statusData.status === 'completed') {
                    setProgress(100);
                    setIsUploading(false);
                    return;
                } else if (statusData.status === 'failed') {
                    setError(statusData.message || 'Upload failed');
                    setIsUploading(false);
                    return;
                }

                attempts++;
                if (attempts < maxAttempts && statusData.result?.status !== 'completed' && statusData.result?.status !== 'failed') {
                    // Continue polling every 5 seconds
                    setTimeout(poll, 5000);
                } else if (attempts >= maxAttempts) {
                    setError('Upload timeout - please check status later');
                    setIsUploading(false);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to check upload status');
                setIsUploading(false);
            }
        };

        poll();
    }, []);

    const uploadFile = useCallback(async (file: File): Promise<void> => {
        if (!file.name.endsWith('.csv')) {
            setError('Only CSV files are accepted');
            return;
        }

        setIsUploading(true);
        setError(null);
        setStatus(null);
        setProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_BASE_URL}/upload/csv`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `Upload failed: ${response.statusText}`);
            }

            const data: UploadTask = await response.json();
            setProgress(10);

            // Start polling for status
            await pollStatus(data.task_id);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
            setIsUploading(false);
            setProgress(0);
        }
    }, [pollStatus]);

    const reset = useCallback(() => {
        setStatus(null);
        setIsUploading(false);
        setError(null);
        setProgress(0);
    }, []);

    return {
        uploadFile,
        status,
        isUploading,
        error,
        progress,
        reset,
    };
};