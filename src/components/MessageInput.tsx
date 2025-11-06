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
import type { Message, Chat, MessageInputProps } from '@/types/global';

interface LocalMessageInputProps extends Omit<MessageInputProps, 'sendMessage'> {
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
}: LocalMessageInputProps) {
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
        <div className="flex flex-col space-y-2 absolute bottom-0 left-0 w-full">
            {/* Image Preview */}
            {selectedImage && imagePreview && (
                <div className="flex items-center p-3 bg-muted/40 backdrop-blur-md rounded-lg mx-3">
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
            <div className="relative flex items-center px-3 py-2 space-x-2">
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
                    variant="outline"
                    size="icon"
                    className='rounded-full cursor-pointer bg-input/30! w-10 h-10'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    title="Upload image"
                >
                    <Image className="h-5 w-5" />
                </Button>

                {/* Emoji Picker Button */}
                <Button
                    ref={buttonRef}
                    variant="outline"
                    size="icon"
                    className='rounded-full cursor-pointer bg-input/30! w-10 h-10'
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    disabled={uploading}
                >
                    <Smile className="h-5 w-5" />
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
                    className="flex-1 h-10 rounded-full bg focus-visible:ring-0 transition-all shadow-none border-secondary-foreground/10"
                    disabled={!selectedChat || uploading}
                />

                {/* Send Button */}
                <Button
                    onClick={handleSend}
                    disabled={(!input.trim() && !selectedImage) || !selectedChat || uploading}
                    className='rounded-full w-10 h-10 p-0 hover:scale-105 transition-all disabled:hover:scale-100'
                >
                    {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </Button>
            </div>
        </div>
    );
}
