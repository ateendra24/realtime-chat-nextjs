/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Button } from "@/components/ui/button";
import { Download, Expand } from "lucide-react";
import type { ImageMessageProps } from '@/types/global';

export function ImageMessage({ attachment, content, className = "" }: ImageMessageProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const handleDownload = async () => {
        try {
            const response = await fetch(`/api/images/${attachment.id}`);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = attachment.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (imageError) {
        return (
            <div className={`bg-muted p-4 rounded-lg max-w-xs ${className}`}>
                <div className="flex items-center space-x-2">
                    <div className="flex-1">
                        <p className="text-sm font-medium">📷 {attachment.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)}
                        </p>
                        <p className="text-xs text-red-500">Failed to load image</p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownload}
                        className="shrink-0"
                    >
                        <Download className="h-4 w-4" />
                    </Button>
                </div>
                {content && (
                    <p className="mt-2 text-sm">{content}</p>
                )}
            </div>
        );
    }

    return (
        <>
            <div className={`relative group ${className}`}>
                <div
                    className="relative max-w-xs md:max-w-sm cursor-pointer rounded-lg overflow-hidden bg-muted"
                    onClick={() => setIsExpanded(true)}
                >
                    {!imageLoaded && (
                        <div className="aspect-square flex items-center justify-center bg-muted">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}

                    <img
                        src={`/api/images/${attachment.id}`}
                        alt={attachment.fileName}
                        className={`max-w-full h-auto rounded-lg transition-opacity ${imageLoaded ? 'opacity-100' : 'opacity-0'
                            }`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                        style={{
                            maxHeight: '300px',
                            objectFit: 'cover'
                        }}
                    />

                    {imageLoaded && (
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-black/50 text-white hover:bg-black/70"
                            >
                                <Expand className="h-4 w-4 mr-1" />
                                View
                            </Button>
                        </div>
                    )}
                </div>

                {/* Image info
                <div className="mt-1 text-xs text-muted-foreground">
                    {attachment.fileName} • {formatFileSize(attachment.fileSize)}
                </div> */}

                {/* Caption */}
                {content && (
                    <p className="mt-2 text-sm">{content}</p>
                )}
            </div>

            {/* Full-screen dialog */}
            <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                    <VisuallyHidden>
                        <DialogTitle>Image Viewer - {attachment.fileName}</DialogTitle>
                    </VisuallyHidden>
                    <div className="relative">
                        <img
                            src={`/api/images/${attachment.id}`}
                            alt={attachment.fileName}
                            className="w-full h-auto max-h-[80vh] object-contain"
                        />

                        {/* Download button */}
                        <Button
                            variant="secondary"
                            size="sm"
                            className="absolute bottom-4 right-4 bg-black/50 text-white hover:bg-black/70"
                            onClick={handleDownload}
                        >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                        </Button>

                        {/* Image info */}
                        {/* <div className="absolute bottom-4 left-4 bg-black/50 text-white p-2 rounded text-sm">
                            {attachment.fileName} • {formatFileSize(attachment.fileSize)}
                        </div> */}
                    </div>

                    {/* Caption in dialog */}
                    {content && (
                        <div className="p-4 border-t">
                            <p className="text-sm">{content}</p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}