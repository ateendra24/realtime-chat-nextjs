"use client";
import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Smile } from "lucide-react";
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useTheme } from 'next-themes';

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
}

export function MessageInput({
    selectedChat,
    input,
    setInput,
    onSendMessage,
    onKeyPress
}: MessageInputProps) {
    // Hooks must be called before any conditional returns
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const { theme } = useTheme();
    const pickerContainerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const handleEmojiSelect = (emoji: { native: string }) => {
        setInput(input + emoji.native);
        setShowEmojiPicker(false);
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

    // Conditional return after all hooks
    if (!selectedChat) return null;

    return (
        <div className="relative flex items-center p-3 mb-2 border-t space-x-2 rounded-full">

            <Button
                ref={buttonRef}
                variant="ghost"
                size="sm"
                className='rounded-full cursor-pointer'
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
                <Smile className="h-4 w-4" />
            </Button>

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

            <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={onKeyPress}
                className="flex-1 rounded-full"
                disabled={!selectedChat}
            />
            <Button
                onClick={onSendMessage}
                disabled={!input.trim() || !selectedChat}
                className='rounded-full w-16'
            >
                <Send className="h-4 w-4" />
            </Button>
        </div>
    );
}
