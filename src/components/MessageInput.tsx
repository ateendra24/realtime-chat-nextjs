"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile, Image, X, Loader2 } from "lucide-react";
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useTheme } from 'next-themes';
import { useImageUpload, createImagePreview, revokeImagePreview } from '@/hooks/useImageUpload';
import { toast } from 'sonner';
import { type Message } from '@/hooks/useChatLogic';

interface Chat {
    id: string;
    name?: string;
    description?: string;
    type: 'direct' | 'group';
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
    isAdmin?: boolean;
    displayName?: string;
    username?: string;
}

interface MessageInputProps {
    selectedChat: Chat | null;
    input: string;
    setInput: (value: string) => void;
    onSendMessage: () => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
    onImageSent?: (message: Message) => void; // Callback for when image is sent
}

export function MessageInput({
    selectedChat,
    input,
    setInput,
    onSendMessage,
    onKeyPress,
    onImageSent
}: MessageInputProps) {
    // Hooks must be called before any conditional returns
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const { theme } = useTheme();
    const { uploadImage, uploading, progress, error, clearError } = useImageUpload();
    const pickerContainerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleEmojiSelect = (emoji: { native: string }) => {
        setInput(input + emoji.native);
        setShowEmojiPicker(false);
    };

    const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Clear previous image
            if (imagePreview) {
                revokeImagePreview(imagePreview);
            }

            setSelectedImage(file);
            setImagePreview(createImagePreview(file));
            clearError();
        }
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveImage = () => {
        if (imagePreview) {
            revokeImagePreview(imagePreview);
        }
        setSelectedImage(null);
        setImagePreview(null);
        clearError();
    };

    const handleSendImage = async () => {
        if (!selectedImage || !selectedChat) return;

        try {
            const result = await uploadImage(selectedImage, selectedChat.id, input.trim());

            if (result.success && result.message) {
                // Clear input and image
                setInput('');
                handleRemoveImage();

                // Notify parent component
                if (onImageSent) {
                    // Convert createdAt string to Date object to match Message interface
                    const messageWithDate: Message = {
                        ...result.message,
                        createdAt: new Date(result.message.createdAt)
                    } as Message;
                    onImageSent(messageWithDate);
                }

                toast.success('Image sent successfully!');
            } else {
                toast.error(result.error || 'Failed to send image');
            }
        } catch (error) {
            toast.error('Failed to send image');
            console.error('Image send error:', error);
        }
    };

    const handleSend = () => {
        if (selectedImage) {
            handleSendImage();
        } else {
            onSendMessage();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        } else {
            onKeyPress(e);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            if (
                (pickerContainerRef.current && pickerContainerRef.current.contains(target)) ||
                (buttonRef.current && buttonRef.current.contains(target))
            ) {
                return;
            }
            setShowEmojiPicker(false);
        };
        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    // Cleanup image preview on unmount
    useEffect(() => {
        return () => {
            if (imagePreview) {
                revokeImagePreview(imagePreview);
            }
        };
    }, [imagePreview]);

    // Show error toast
    useEffect(() => {
        if (error) {
            toast.error(error);
        }
    }, [error]);

    // Conditional return after all hooks
    if (!selectedChat) return null;

    return (
        <div className="flex flex-col space-y-2">
            {/* Image Preview */}
            {selectedImage && imagePreview && (
                <div className="flex items-center p-3 bg-muted rounded-lg mx-3">
                    <div className="relative">
                        <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-16 h-16 object-cover rounded-md"
                        />
                        <Button
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                            onClick={handleRemoveImage}
                            disabled={uploading}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                    <div className="ml-3 flex-1">
                        <p className="text-sm font-medium">{selectedImage.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {(selectedImage.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {uploading && (
                            <div className="mt-2">
                                <div className="flex items-center space-x-2">
                                    <div className="w-full bg-muted rounded-full h-2">
                                        <div
                                            className="bg-primary h-2 rounded-full transition-all"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className="text-xs">{progress}%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input Row */}
            <div className="relative flex items-center p-3 mb-2 border-t space-x-2 rounded-full">
                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={uploading}
                />

                {/* Image Upload Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className='rounded-full cursor-pointer'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Upload image"
                >
                    <Image className="h-4 w-4" />
                </Button>

                {/* Emoji Picker Button */}
                <Button
                    ref={buttonRef}
                    variant="ghost"
                    size="sm"
                    className='rounded-full cursor-pointer'
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={uploading}
                >
                    <Smile className="h-4 w-4" />
                </Button>

                {/* Emoji Picker */}
                {showEmojiPicker ? (
                    <div ref={pickerContainerRef} className="absolute bottom-full shadow-md rounded-lg left-2 mb-2 z-50">
                        <Picker
                            data={data}
                            onEmojiSelect={handleEmojiSelect}
                            theme={theme}
                            previewPosition="none"
                        />
                    </div>
                ) : null}

                {/* Text Input */}
                <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedImage ? "Add a caption..." : "Type a message..."}
                    onKeyDown={handleKeyDown}
                    className="flex-1 rounded-full"
                    disabled={!selectedChat || uploading}
                />

                {/* Send Button */}
                <Button
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedImage) || !selectedChat || uploading}
                    className='rounded-full w-16'
                >
                    {uploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Send className="h-4 w-4" />
                    )}
                </Button>
            </div>
        </div>
    );
}
