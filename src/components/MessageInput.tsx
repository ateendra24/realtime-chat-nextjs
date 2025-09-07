import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";

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
    sendingMessage: boolean;
    onSendMessage: () => void;
    onKeyPress: (e: React.KeyboardEvent) => void;
}

export function MessageInput({
    selectedChat,
    input,
    setInput,
    sendingMessage,
    onSendMessage,
    onKeyPress
}: MessageInputProps) {
    if (!selectedChat) return null;

    return (
        <div className="flex items-center p-3 mb-2 border-t space-x-2 rounded-full">
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
                disabled={!input.trim() || !selectedChat || sendingMessage}
                className='rounded-full w-16'
            >
                {sendingMessage ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                    </>
                ) : (
                    <Send className="h-4 w-4" />
                )}
            </Button>
        </div>
    );
}
