"use client";

import { useState, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import imageCompression from 'browser-image-compression';

interface MessageAttachment {
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    thumbnailUrl?: string;
    width?: number;
    height?: number;
}

interface UploadResult {
    success: boolean;
    message?: {
        id: string;
        chatId: string;
        userId: string;
        content: string;
        type: 'image';
        createdAt: string;
        attachment: MessageAttachment;
    };
    error?: string;
}

interface UseImageUploadResult {
    uploadImage: (file: File, chatId: string, content?: string) => Promise<UploadResult>;
    uploading: boolean;
    progress: number;
    error: string | null;
    clearError: () => void;
}

const compressionOptions = {
    maxSizeMB: 2, // Maximum file size in MB
    maxWidthOrHeight: 1920, // Maximum width or height
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.8,
};

export function useImageUpload(): UseImageUploadResult {
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const { user } = useUser();

    const uploadImage = useCallback(async (
        file: File,
        chatId: string,
        content: string = ''
    ): Promise<UploadResult> => {
        if (!user) {
            const errorMsg = 'User not authenticated';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }

        // Validate file
        if (!file.type.startsWith('image/')) {
            const errorMsg = 'Please select an image file';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }

        // Check file size (max 10MB before compression)
        if (file.size > 10 * 1024 * 1024) {
            const errorMsg = 'Image must be less than 10MB';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        }

        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            // Compress image if it's larger than 1MB
            let processedFile = file;
            if (file.size > 1024 * 1024) {
                setProgress(20);
                try {
                    processedFile = await imageCompression(file, compressionOptions);
                    console.log('Image compressed:', {
                        originalSize: file.size,
                        compressedSize: processedFile.size,
                        compressionRatio: ((file.size - processedFile.size) / file.size * 100).toFixed(1) + '%'
                    });
                } catch (compressionError) {
                    console.warn('Image compression failed, using original:', compressionError);
                    // Continue with original file if compression fails
                    processedFile = file;
                }
            }

            setProgress(50);

            // Create form data
            const formData = new FormData();
            formData.append('file', processedFile);
            formData.append('chatId', chatId);
            formData.append('content', content);

            setProgress(80);

            // Upload to API
            const response = await fetch('/api/upload/image', {
                method: 'POST',
                body: formData,
            });

            setProgress(100);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Upload failed');
            }

            const result = await response.json();
            return result;

        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Upload failed';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setUploading(false);
            setProgress(0);
        }
    }, [user]);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    return {
        uploadImage,
        uploading,
        progress,
        error,
        clearError,
    };
}

// Utility function to get image dimensions
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

// Utility function to create image preview URL
export function createImagePreview(file: File): string {
    return URL.createObjectURL(file);
}

// Clean up preview URL
export function revokeImagePreview(url: string): void {
    URL.revokeObjectURL(url);
}